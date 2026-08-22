const pool = require('./config/database');
const bcrypt = require('bcryptjs');

/*
 * PB-01 T-01.3 — the sample accounts are seeded with
 * real bcrypt hashes at the same cost factor the
 * registration endpoint uses (NFR-01). The previous
 * placeholder strings ('hash123' and so on) could never
 * be signed in with, which would have made every
 * seeded account unusable for the demonstration.
 *
 * The shared demonstration password satisfies the same
 * policy the registration form enforces.
 */
const SAMPLE_PASSWORD = 'StudySync#2026';
const SALT_ROUNDS = 10;

async function setupDatabase() {
    try {
        console.log('Setting up database...');

        // Drop existing tables
        // group_members must be dropped first because it references groups and users
        await pool.query('DROP TABLE IF EXISTS group_members CASCADE');
        await pool.query('DROP TABLE IF EXISTS groups CASCADE');
        await pool.query('DROP TABLE IF EXISTS users CASCADE');

        console.log('Dropped existing tables');

        // Create users table
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                institution VARCHAR(255) NOT NULL,
                program VARCHAR(100),
                password_hash VARCHAR(255) NOT NULL,
                avatar_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        /*
         * PB-01 T-01.1 — a case-insensitive unique index
         * on e-mail.
         *
         * The UNIQUE constraint on the column alone
         * treats Student@University.edu and
         * student@university.edu as different values, so
         * one address could be registered twice under
         * different capitalisation. The model lowercases
         * before writing; this index makes the rule hold
         * at the database level regardless.
         */
        await pool.query(`
            CREATE UNIQUE INDEX idx_users_email_lower
                ON users (LOWER(email))
        `);

        console.log('Users table created');

        // Create groups table
        await pool.query(`
            CREATE TABLE groups (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                course_code VARCHAR(50) NOT NULL,
                course_title VARCHAR(255) NOT NULL,
                institution VARCHAR(255) NOT NULL,
                term VARCHAR(50) NOT NULL,
                description TEXT,
                visibility VARCHAR(20)
                    DEFAULT 'public'
                    CHECK (visibility IN ('public', 'request_to_join')),
                max_members INTEGER DEFAULT 50,
                current_members INTEGER DEFAULT 1,
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (created_by)
                    REFERENCES users(id)
            )
        `);

        console.log('Groups table created');

        // Create group_members table
        await pool.query(`
            CREATE TABLE group_members (
                id SERIAL PRIMARY KEY,
                group_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role VARCHAR(20)
                    DEFAULT 'member'
                    CHECK (role IN ('owner', 'moderator', 'member')),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (group_id)
                    REFERENCES groups(id)
                    ON DELETE CASCADE,

                FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                UNIQUE (group_id, user_id)
            )
        `);

        console.log('Group members table created');

        // Insert sample users with bcrypt hashes
        const samplePasswordHash = await bcrypt.hash(
            SAMPLE_PASSWORD,
            SALT_ROUNDS
        );

        const sampleUsers = [
            ['student1@university.edu', 'Alice Johnson', 'University of Toronto', 'Computer Science'],
            ['student2@university.edu', 'Bob Smith', 'University of Toronto', 'Mathematics'],
            ['student3@university.edu', 'Carol White', 'University of Toronto', 'Physics'],
            ['student4@university.edu', 'David Brown', 'University of Toronto', 'Engineering'],
            ['student5@university.edu', 'Emma Davis', 'University of Toronto', 'Computer Science']
        ];

        for (const [email, displayName, institution, program] of sampleUsers) {
            await pool.query(
                `
                INSERT INTO users (
                    email,
                    display_name,
                    institution,
                    program,
                    password_hash
                )
                VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    email,
                    displayName,
                    institution,
                    program,
                    samplePasswordHash
                ]
            );
        }

        console.log('Sample users inserted');
        console.log(
            `   Every sample account signs in with: ${SAMPLE_PASSWORD}`
        );

        // Insert sample groups
        await pool.query(`
            INSERT INTO groups (
                name,
                course_code,
                course_title,
                institution,
                term,
                description,
                visibility,
                max_members,
                current_members,
                created_by
            )
            VALUES
            (
                'CS301 Study Squad',
                'CS301',
                'Database Systems',
                'University of Toronto',
                'Fall 2026',
                'Group for CS301 students to share notes and help each other.',
                'public',
                30,
                5,
                1
            ),
            (
                'MATH202 Problem Solvers',
                'MATH202',
                'Calculus II',
                'University of Toronto',
                'Fall 2026',
                'Solving calculus problems together.',
                'public',
                25,
                8,
                2
            ),
            (
                'PHY101 Physics Group',
                'PHY101',
                'Introduction to Physics',
                'University of Toronto',
                'Fall 2026',
                'Study group for physics students.',
                'request_to_join',
                40,
                3,
                3
            ),
            (
                'ENG110 Writing Workshop',
                'ENG110',
                'Academic Writing',
                'University of Toronto',
                'Fall 2026',
                'Peer review and writing support.',
                'public',
                20,
                12,
                4
            ),
            (
                'CS202 Data Structures',
                'CS202',
                'Data Structures and Algorithms',
                'University of Toronto',
                'Fall 2026',
                'Preparing for coding interviews.',
                'public',
                35,
                15,
                5
            )
        `);

        console.log('Sample groups inserted');

        // Record each sample group's creator as the owner
        await pool.query(`
            INSERT INTO group_members (
                group_id,
                user_id,
                role
            )
            VALUES
            (1, 1, 'owner'),
            (2, 2, 'owner'),
            (3, 3, 'owner'),
            (4, 4, 'owner'),
            (5, 5, 'owner')
        `);

        console.log('Sample group owners inserted');

        console.log('Database setup completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Error setting up database:', error.message);
        process.exit(1);
    }
}

setupDatabase();