/*
 * User data access.
 *
 * PB-01 US-01, PB-02 US-02, PB-03 US-03.
 *
 * Two rules hold throughout this file:
 *
 * 1. password_hash is excluded from the select list of
 *    every method except findByEmailWithHash, which
 *    exists solely so that sign-in can compare it. No
 *    controller has to remember to delete the field,
 *    because no other query ever returns it (NFR-01).
 *
 * 2. E-mail addresses are normalised to lower case
 *    before they reach the database, and looked up with
 *    LOWER(email), so the same address cannot be
 *    registered twice under a different capitalisation.
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// bcrypt cost factor required by NFR-01.
const SALT_ROUNDS = 10;

// The public shape of a user. Kept in one place so
// every endpoint returns the same fields.
const PUBLIC_COLUMNS = `
    id,
    email,
    display_name,
    institution,
    program,
    avatar_url,
    created_at,
    updated_at
`;

class User {
    static normaliseEmail(email) {
        return String(email).trim().toLowerCase();
    }

    static async hashPassword(plainPassword) {
        return bcrypt.hash(plainPassword, SALT_ROUNDS);
    }

    static async verifyPassword(plainPassword, passwordHash) {
        if (
            typeof plainPassword !== 'string' ||
            typeof passwordHash !== 'string' ||
            passwordHash === ''
        ) {
            return false;
        }

        try {
            return await bcrypt.compare(plainPassword, passwordHash);
        } catch (error) {
            /*
             * A seeded row whose password_hash is not a
             * bcrypt string makes compare throw. Treating
             * that as a failed sign-in rather than a
             * server error means a legacy placeholder
             * hash can never be used to sign in.
             */
            return false;
        }
    }

    // PB-01 T-01.2 — used to report a duplicate e-mail
    // as a field-level error before the insert is tried.
    static async emailExists(email) {
        const result = await pool.query(
            'SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1',
            [User.normaliseEmail(email)]
        );

        return result.rows.length > 0;
    }

    /*
     * PB-01 T-01.2, T-01.3 — create an account.
     *
     * The password is hashed here rather than in the
     * controller, so there is no path into the users
     * table that stores a plain-text value.
     */
    static async create({
        email,
        display_name,
        institution,
        program = null,
        password,
        avatar_url = null
    }) {
        const passwordHash = await User.hashPassword(password);

        const result = await pool.query(
            `
            INSERT INTO users (
                email,
                display_name,
                institution,
                program,
                password_hash,
                avatar_url
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING ${PUBLIC_COLUMNS}
            `,
            [
                User.normaliseEmail(email),
                display_name.trim(),
                institution.trim(),
                program ? String(program).trim() : null,
                passwordHash,
                avatar_url ? String(avatar_url).trim() : null
            ]
        );

        return result.rows[0];
    }

    /*
     * PB-02 T-02.1 — the only query that returns the
     * hash. Called by the sign-in controller and by
     * nothing else.
     */
    static async findByEmailWithHash(email) {
        const result = await pool.query(
            `
            SELECT
                id,
                email,
                display_name,
                institution,
                program,
                avatar_url,
                password_hash,
                created_at,
                updated_at
            FROM users
            WHERE LOWER(email) = $1
            `,
            [User.normaliseEmail(email)]
        );

        return result.rows[0] || null;
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
            [id]
        );

        return result.rows[0] || null;
    }

    /*
     * PB-03 T-03.2 — the view of a user that is safe to
     * show to somebody else. The e-mail address is
     * omitted, which is the requirement in FR-1.6.
     */
    static async findPublicProfileById(id) {
        const result = await pool.query(
            `
            SELECT
                id,
                display_name,
                institution,
                program,
                avatar_url
            FROM users
            WHERE id = $1
            `,
            [id]
        );

        return result.rows[0] || null;
    }

    /*
     * PB-03 T-03.1 — update the authenticated student's
     * own profile.
     *
     * Only the four editable columns can be reached. The
     * column names come from this fixed list rather than
     * from the request, so a caller cannot name a column
     * the route was never meant to touch; the values are
     * always parameterised.
     */
    static async updateProfile(id, updates = {}) {
        const editable = [
            'display_name',
            'institution',
            'program',
            'avatar_url'
        ];

        const assignments = [];
        const values = [];
        let position = 1;

        editable.forEach(column => {
            if (!Object.prototype.hasOwnProperty.call(updates, column)) {
                return;
            }

            const raw = updates[column];

            let value;

            if (raw === null || raw === '') {
                // Clearing an optional field.
                value = column === 'display_name' || column === 'institution'
                    ? undefined
                    : null;
            } else {
                value = String(raw).trim();
            }

            if (value === undefined) {
                return;
            }

            assignments.push(`${column} = $${position}`);
            values.push(value);
            position += 1;
        });

        if (assignments.length === 0) {
            return User.findById(id);
        }

        assignments.push('updated_at = CURRENT_TIMESTAMP');

        values.push(id);

        const result = await pool.query(
            `
            UPDATE users
            SET ${assignments.join(', ')}
            WHERE id = $${position}
            RETURNING ${PUBLIC_COLUMNS}
            `,
            values
        );

        return result.rows[0] || null;
    }
}

User.SALT_ROUNDS = SALT_ROUNDS;

module.exports = User;
