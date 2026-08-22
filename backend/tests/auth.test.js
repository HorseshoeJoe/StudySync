/*
 * Automated checks for PB-01, PB-02, and PB-03.
 *
 * Run against a freshly seeded database:
 *
 *   node setup-db.js
 *   node server.js        (in another terminal)
 *   node tests/auth.test.js
 *
 * Or point the suite at another instance:
 *
 *   API_URL=http://localhost:5000 node tests/auth.test.js
 *
 * Each check either asserts on the HTTP response or
 * reads the database directly to confirm that a refused
 * operation changed nothing. A refusal that still wrote
 * a row would pass an HTTP-only assertion, which is why
 * the destructive cases query the table afterwards.
 *
 * The process exits non-zero if any check fails, so the
 * suite can gate a pull request.
 */

const pool = require('../config/database');

const API_URL = process.env.API_URL || 'http://localhost:5000';

let passed = 0;
let failed = 0;
const failures = [];

function check(id, description, condition, detail) {
    if (condition) {
        passed += 1;
        console.log(`  ✅ ${id}  ${description}`);
    } else {
        failed += 1;
        failures.push(`${id}  ${description}${detail ? ` — ${detail}` : ''}`);
        console.log(
            `  ❌ ${id}  ${description}${detail ? `\n         ${detail}` : ''}`
        );
    }
}

async function api(method, path, { body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    return { status: response.status, data };
}

// A unique address per run so the suite can be run
// repeatedly without reseeding.
const stamp = Date.now();
const NEW_EMAIL = `henry.test.${stamp}@university.edu`;
const STRONG_PASSWORD = 'Sprint3#Pass1';

const SEEDED_EMAIL = 'student1@university.edu';
const SEEDED_PASSWORD = 'StudySync#2026';

async function run() {
    console.log(`\nStudySync auth suite — ${API_URL}\n`);

    // ---------------------------------------------
    // Reachability
    // ---------------------------------------------
    const health = await api('GET', '/api/test');

    if (health.status !== 200) {
        console.error(
            `\nThe API is not answering at ${API_URL}.\n` +
            'Start it with "node server.js" and run this suite again.\n'
        );
        process.exit(1);
    }

    // ---------------------------------------------
    // PB-01  Account Registration
    // ---------------------------------------------
    console.log('PB-01  Account Registration');

    const malformed = await api('POST', '/api/auth/register', {
        body: {
            email: 'not-an-email',
            display_name: 'Test Student',
            institution: 'University of Toronto',
            password: STRONG_PASSWORD
        }
    });

    check(
        'T-01',
        'A malformed e-mail is refused with a message on the email field',
        malformed.status === 400 &&
            malformed.data &&
            malformed.data.errors &&
            typeof malformed.data.errors.email === 'string',
        `got ${malformed.status} ${JSON.stringify(malformed.data)}`
    );

    const weak = await api('POST', '/api/auth/register', {
        body: {
            email: `weak.${stamp}@university.edu`,
            display_name: 'Test Student',
            institution: 'University of Toronto',
            password: 'password'
        }
    });

    const weakRows = await pool.query(
        'SELECT 1 FROM users WHERE LOWER(email) = $1',
        [`weak.${stamp}@university.edu`]
    );

    check(
        'T-02',
        'A weak password is refused and no account row is created',
        weak.status === 400 &&
            weak.data.errors &&
            typeof weak.data.errors.password === 'string' &&
            weakRows.rows.length === 0,
        `got ${weak.status}, ${weakRows.rows.length} row(s) written`
    );

    const created = await api('POST', '/api/auth/register', {
        body: {
            email: NEW_EMAIL,
            display_name: 'Henry Test',
            institution: 'University of Toronto',
            program: 'Computer Science',
            password: STRONG_PASSWORD
        }
    });

    check(
        'T-03',
        'A valid registration creates the account and returns the profile',
        created.status === 201 &&
            created.data.success === true &&
            created.data.data &&
            created.data.data.id > 0 &&
            created.data.data.email === NEW_EMAIL,
        `got ${created.status} ${JSON.stringify(created.data)}`
    );

    check(
        'T-04',
        'The registration response contains no password_hash',
        created.data &&
            created.data.data &&
            !('password_hash' in created.data.data) &&
            !JSON.stringify(created.data).includes(STRONG_PASSWORD),
        JSON.stringify(created.data)
    );

    const stored = await pool.query(
        'SELECT password_hash FROM users WHERE LOWER(email) = $1',
        [NEW_EMAIL]
    );

    check(
        'T-05',
        'The stored password is a bcrypt hash, not the plain text',
        stored.rows.length === 1 &&
            /^\$2[aby]\$10\$/.test(stored.rows[0].password_hash) &&
            stored.rows[0].password_hash !== STRONG_PASSWORD,
        stored.rows.length ? stored.rows[0].password_hash.slice(0, 10) : 'no row'
    );

    const duplicate = await api('POST', '/api/auth/register', {
        body: {
            email: NEW_EMAIL,
            display_name: 'Someone Else',
            institution: 'University of Toronto',
            password: STRONG_PASSWORD
        }
    });

    check(
        'T-06',
        'A duplicate e-mail is refused with a field-level message',
        duplicate.status === 400 &&
            duplicate.data.errors &&
            typeof duplicate.data.errors.email === 'string',
        `got ${duplicate.status} ${JSON.stringify(duplicate.data)}`
    );

    const capitalised = await api('POST', '/api/auth/register', {
        body: {
            email: NEW_EMAIL.toUpperCase(),
            display_name: 'Someone Else',
            institution: 'University of Toronto',
            password: STRONG_PASSWORD
        }
    });

    const emailCount = await pool.query(
        'SELECT COUNT(*)::int AS n FROM users WHERE LOWER(email) = $1',
        [NEW_EMAIL]
    );

    check(
        'T-07',
        'The same address in different capitalisation is refused; one row exists',
        capitalised.status === 400 && emailCount.rows[0].n === 1,
        `got ${capitalised.status}, ${emailCount.rows[0].n} row(s)`
    );

    const missing = await api('POST', '/api/auth/register', {
        body: { email: `blank.${stamp}@university.edu` }
    });

    check(
        'T-08',
        'Missing display name, institution, and password each produce their own message',
        missing.status === 400 &&
            missing.data.errors &&
            missing.data.errors.display_name &&
            missing.data.errors.institution &&
            missing.data.errors.password,
        JSON.stringify(missing.data)
    );

    // ---------------------------------------------
    // PB-02  Login / Logout
    // ---------------------------------------------
    console.log('\nPB-02  Login / Logout');

    const wrongPassword = await api('POST', '/api/auth/login', {
        body: { email: NEW_EMAIL, password: 'Wrong#Password1' }
    });

    const unknownEmail = await api('POST', '/api/auth/login', {
        body: {
            email: `nobody.${stamp}@university.edu`,
            password: STRONG_PASSWORD
        }
    });

    check(
        'T-09',
        'Invalid credentials return 401',
        wrongPassword.status === 401 && unknownEmail.status === 401,
        `got ${wrongPassword.status} and ${unknownEmail.status}`
    );

    check(
        'T-10',
        'A wrong password and an unknown address return the identical message',
        wrongPassword.data.message === unknownEmail.data.message &&
            !/exist|found|registered/i.test(wrongPassword.data.message),
        `"${wrongPassword.data.message}" vs "${unknownEmail.data.message}"`
    );

    const signedIn = await api('POST', '/api/auth/login', {
        body: { email: NEW_EMAIL, password: STRONG_PASSWORD }
    });

    const token = signedIn.data && signedIn.data.data && signedIn.data.data.token;

    check(
        'T-11',
        'Valid credentials return a session token and the profile',
        signedIn.status === 200 &&
            typeof token === 'string' &&
            token.split('.').length === 3 &&
            signedIn.data.data.user.email === NEW_EMAIL,
        `got ${signedIn.status} ${JSON.stringify(signedIn.data)}`
    );

    check(
        'T-12',
        'The sign-in response contains no password_hash',
        !JSON.stringify(signedIn.data).includes('password_hash'),
        JSON.stringify(signedIn.data).slice(0, 200)
    );

    const seededSignIn = await api('POST', '/api/auth/login', {
        body: { email: SEEDED_EMAIL, password: SEEDED_PASSWORD }
    });

    check(
        'T-13',
        'A seeded sample account signs in, so its hash is real bcrypt (T-01.3)',
        seededSignIn.status === 200 &&
            typeof seededSignIn.data.data.token === 'string',
        `got ${seededSignIn.status} ${JSON.stringify(seededSignIn.data)}`
    );

    const caseInsensitiveSignIn = await api('POST', '/api/auth/login', {
        body: { email: NEW_EMAIL.toUpperCase(), password: STRONG_PASSWORD }
    });

    check(
        'T-14',
        'Sign-in is case-insensitive on the e-mail address',
        caseInsensitiveSignIn.status === 200,
        `got ${caseInsensitiveSignIn.status}`
    );

    const noToken = await api('GET', '/api/users/me');

    check(
        'T-15',
        'A protected endpoint called without a token returns 401',
        noToken.status === 401 && noToken.data.success === false,
        `got ${noToken.status} ${JSON.stringify(noToken.data)}`
    );

    const badToken = await api('GET', '/api/users/me', {
        token: 'not.a.real.token'
    });

    check(
        'T-16',
        'A malformed token returns 401 rather than a server error',
        badToken.status === 401,
        `got ${badToken.status}`
    );

    const tamperedToken = `${token.slice(0, -3)}xyz`;

    const tampered = await api('GET', '/api/users/me', {
        token: tamperedToken
    });

    check(
        'T-17',
        'A token with an altered signature is refused',
        tampered.status === 401,
        `got ${tampered.status}`
    );

    const withToken = await api('GET', '/api/users/me', { token });

    check(
        'T-18',
        'A valid token is accepted by a protected endpoint',
        withToken.status === 200 && withToken.data.data.email === NEW_EMAIL,
        `got ${withToken.status} ${JSON.stringify(withToken.data)}`
    );

    const restore = await api('GET', '/api/auth/me', { token });

    check(
        'T-19',
        'GET /api/auth/me restores the session on reload',
        restore.status === 200 && restore.data.data.id === withToken.data.data.id,
        `got ${restore.status}`
    );

    // A second session for the same student, opened
    // before sign-out, to prove revocation is per-token.
    const secondSession = await api('POST', '/api/auth/login', {
        body: { email: NEW_EMAIL, password: STRONG_PASSWORD }
    });

    const secondToken = secondSession.data.data.token;

    const signedOut = await api('POST', '/api/auth/logout', { token });

    check(
        'T-20',
        'Sign-out succeeds',
        signedOut.status === 200 && signedOut.data.success === true,
        `got ${signedOut.status}`
    );

    const afterLogout = await api('GET', '/api/users/me', { token });

    check(
        'T-21',
        'The revoked token is no longer accepted',
        afterLogout.status === 401,
        `got ${afterLogout.status} ${JSON.stringify(afterLogout.data)}`
    );

    const otherSession = await api('GET', '/api/users/me', {
        token: secondToken
    });

    check(
        'T-22',
        'Signing out one session leaves the student\'s other session working',
        otherSession.status === 200,
        `got ${otherSession.status}`
    );

    const doubleLogout = await api('POST', '/api/auth/logout', { token });

    check(
        'T-23',
        'Signing out with an already-revoked token is refused, not repeated',
        doubleLogout.status === 401,
        `got ${doubleLogout.status}`
    );

    // ---------------------------------------------
    // PB-03  Manage Profile
    // ---------------------------------------------
    console.log('\nPB-03  Manage Profile');

    const active = secondToken;

    const profile = await api('GET', '/api/users/me', { token: active });

    check(
        'T-24',
        'A student can read their own display name, institution, program, and avatar',
        profile.status === 200 &&
            profile.data.data.display_name === 'Henry Test' &&
            profile.data.data.institution === 'University of Toronto' &&
            profile.data.data.program === 'Computer Science' &&
            'avatar_url' in profile.data.data,
        JSON.stringify(profile.data)
    );

    const updated = await api('PUT', '/api/users/me', {
        token: active,
        body: {
            display_name: 'Henry Cary Jr. Dineros',
            program: 'Software Engineering'
        }
    });

    check(
        'T-25',
        'A profile update returns the saved values',
        updated.status === 200 &&
            updated.data.data.display_name === 'Henry Cary Jr. Dineros' &&
            updated.data.data.program === 'Software Engineering',
        JSON.stringify(updated.data)
    );

    const reread = await api('GET', '/api/users/me', { token: active });

    check(
        'T-26',
        'The updated values persist and are returned on a later read',
        reread.data.data.display_name === 'Henry Cary Jr. Dineros' &&
            reread.data.data.program === 'Software Engineering',
        JSON.stringify(reread.data)
    );

    check(
        'T-27',
        'A partial update leaves the fields it did not mention unchanged',
        reread.data.data.institution === 'University of Toronto',
        reread.data.data.institution
    );

    const emailChange = await api('PUT', '/api/users/me', {
        token: active,
        body: { email: `hijack.${stamp}@university.edu` }
    });

    const emailRow = await pool.query(
        'SELECT email FROM users WHERE id = $1',
        [reread.data.data.id]
    );

    check(
        'T-28',
        'The e-mail address cannot be changed through the profile route',
        emailChange.status === 400 &&
            emailRow.rows[0].email === NEW_EMAIL,
        `got ${emailChange.status}, stored ${emailRow.rows[0].email}`
    );

    const hashChange = await api('PUT', '/api/users/me', {
        token: active,
        body: { password_hash: 'anything' }
    });

    const hashRow = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [reread.data.data.id]
    );

    check(
        'T-29',
        'password_hash cannot be set through the profile route',
        hashChange.status === 400 &&
            hashRow.rows[0].password_hash !== 'anything',
        `got ${hashChange.status}`
    );

    const emptyName = await api('PUT', '/api/users/me', {
        token: active,
        body: { display_name: '' }
    });

    check(
        'T-30',
        'A blank display name is refused with a field-level message',
        emptyName.status === 400 &&
            emptyName.data.errors &&
            emptyName.data.errors.display_name,
        JSON.stringify(emptyName.data)
    );

    const badAvatar = await api('PUT', '/api/users/me', {
        token: active,
        body: { avatar_url: 'javascript:alert(1)' }
    });

    check(
        'T-31',
        'A non-http avatar URL is refused',
        badAvatar.status === 400 &&
            badAvatar.data.errors &&
            badAvatar.data.errors.avatar_url,
        JSON.stringify(badAvatar.data)
    );

    const goodAvatar = await api('PUT', '/api/users/me', {
        token: active,
        body: { avatar_url: 'https://example.com/avatar.png' }
    });

    check(
        'T-32',
        'A valid https avatar URL is accepted',
        goodAvatar.status === 200 &&
            goodAvatar.data.data.avatar_url ===
                'https://example.com/avatar.png',
        JSON.stringify(goodAvatar.data)
    );

    const otherUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [SEEDED_EMAIL]
    );

    const otherProfile = await api(
        'GET',
        `/api/users/${otherUser.rows[0].id}`,
        { token: active }
    );

    check(
        'T-33',
        'Another student\'s profile exposes no e-mail address (FR-1.6)',
        otherProfile.status === 200 &&
            !('email' in otherProfile.data.data) &&
            !('password_hash' in otherProfile.data.data),
        JSON.stringify(otherProfile.data)
    );

    const profileNoToken = await api('PUT', '/api/users/me', {
        body: { display_name: 'Anonymous Edit' }
    });

    check(
        'T-34',
        'A profile update without a session is refused',
        profileNoToken.status === 401,
        `got ${profileNoToken.status}`
    );

    // ---------------------------------------------
    // Integration with the group endpoints
    // ---------------------------------------------
    console.log('\nIntegration — group endpoints now use the real identity');

    const createNoAuth = await api('POST', '/api/groups', {
        body: {
            name: 'Unauthenticated Group',
            course_code: 'XX000',
            course_title: 'Should Not Exist',
            institution: 'University of Toronto',
            term: 'Fall 2026'
        }
    });

    const strayGroup = await pool.query(
        'SELECT 1 FROM groups WHERE course_code = $1',
        ['XX000']
    );

    check(
        'T-35',
        'Creating a group without a session is refused and writes nothing',
        createNoAuth.status === 401 && strayGroup.rows.length === 0,
        `got ${createNoAuth.status}, ${strayGroup.rows.length} row(s)`
    );

    const createdGroup = await api('POST', '/api/groups', {
        token: active,
        body: {
            name: `Henry's Test Group ${stamp}`,
            course_code: 'CPAN359',
            course_title: 'Agile Methodology',
            institution: 'Humber College',
            term: 'Fall 2026',
            description: 'Created by the auth test suite.',
            visibility: 'public',
            max_members: 10
        }
    });

    check(
        'T-36',
        'An authenticated student can create a group',
        createdGroup.status === 201 && createdGroup.data.data.id > 0,
        `got ${createdGroup.status} ${JSON.stringify(createdGroup.data)}`
    );

    check(
        'T-37',
        'The group is owned by the authenticated caller, not the old placeholder user 1',
        createdGroup.status === 201 &&
            createdGroup.data.data.created_by === reread.data.data.id,
        `created_by ${createdGroup.data && createdGroup.data.data && createdGroup.data.data.created_by}, caller ${reread.data.data.id}`
    );

    const ownerRow = await pool.query(
        `SELECT role FROM group_members
         WHERE group_id = $1 AND user_id = $2`,
        [createdGroup.data.data.id, reread.data.data.id]
    );

    check(
        'T-38',
        'The creator is recorded as Group Owner in group_members',
        ownerRow.rows.length === 1 && ownerRow.rows[0].role === 'owner',
        JSON.stringify(ownerRow.rows)
    );

    const joinNoAuth = await api('POST', '/api/groups/1/join');

    check(
        'T-39',
        'Joining a group without a session is refused',
        joinNoAuth.status === 401,
        `got ${joinNoAuth.status}`
    );

    const beforeJoin = await pool.query(
        'SELECT current_members FROM groups WHERE id = 1'
    );

    const joined = await api('POST', '/api/groups/1/join', { token: active });

    const afterJoin = await pool.query(
        'SELECT current_members FROM groups WHERE id = 1'
    );

    check(
        'T-40',
        'An authenticated student joins a public group and the count increases by one',
        joined.status === 200 &&
            afterJoin.rows[0].current_members ===
                beforeJoin.rows[0].current_members + 1,
        `got ${joined.status}, ${beforeJoin.rows[0].current_members} → ${afterJoin.rows[0].current_members}`
    );

    const joinedAgain = await api('POST', '/api/groups/1/join', {
        token: active
    });

    const afterSecondJoin = await pool.query(
        'SELECT current_members FROM groups WHERE id = 1'
    );

    check(
        'T-41',
        'A duplicate join is refused and the member count does not move',
        joinedAgain.status === 409 &&
            afterSecondJoin.rows[0].current_members ===
                afterJoin.rows[0].current_members,
        `got ${joinedAgain.status}, count ${afterSecondJoin.rows[0].current_members}`
    );

    const publicSearch = await api('GET', '/api/groups/search?keyword=CS301');

    check(
        'T-42',
        'Search still works without a session (PB-04 is unaffected)',
        publicSearch.status === 200 && publicSearch.data.success === true,
        `got ${publicSearch.status}`
    );

    // ---------------------------------------------
    // Summary
    // ---------------------------------------------
    const total = passed + failed;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${passed}/${total} checks passed`);

    if (failed > 0) {
        console.log(`\n  Failures:`);
        failures.forEach(line => console.log(`    • ${line}`));
    }

    console.log(`${'─'.repeat(60)}\n`);

    await pool.end();

    process.exit(failed === 0 ? 0 : 1);
}

run().catch(async error => {
    console.error('\nThe suite could not finish:', error.message);

    try {
        await pool.end();
    } catch (closeError) {
        // The pool may already be closed.
    }

    process.exit(1);
});
