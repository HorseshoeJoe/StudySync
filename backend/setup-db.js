const pool = require('./config/database');

async function setupDatabase() {
    try {
        console.log('Setting up StudySync database...');

        // Drop existing tables in correct order (due to foreign keys)
        await pool.query('DROP TABLE IF EXISTS join_requests CASCADE');
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
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
                role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'declined')),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(group_id, user_id)
            )
        `);
        console.log('Group members table created');

        // Create join_requests table
        await pool.query(`
            CREATE TABLE join_requests (
                id SERIAL PRIMARY KEY,
                group_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                reviewed_by INTEGER REFERENCES users(id),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(group_id, user_id)
            )
        `);
        console.log('Join requests table created');

        // Create indexes for performance
        await pool.query(`CREATE INDEX idx_join_requests_group_status ON join_requests(group_id, status)`);
        await pool.query(`CREATE INDEX idx_join_requests_user ON join_requests(user_id)`);
        await pool.query(`CREATE INDEX idx_group_members_user ON group_members(user_id)`);
        await pool.query(`CREATE INDEX idx_group_members_group ON group_members(group_id)`);
        console.log('Indexes created');

        // Insert sample users with hashed passwords (using bcrypt hash for 'password123')
        await pool.query(`
            INSERT INTO users (email, display_name, institution, program, password_hash) VALUES
            ('alice@university.edu', 'Alice Johnson', 'University of Toronto', 'Computer Science', '$2b$10$Yb9tXgZVXb9tXgZVXb9tXeO9tXgZVXb9tXgZVXb9tXgZVXb9tXgZVXb9tXg'),
            ('bob@university.edu', 'Bob Smith', 'University of Toronto', 'Mathematics', '$2b$10$Yb9tXgZVXb9tXgZVXb9tXeO9tXgZVXb9tXgZVXb9tXgZVXb9tXgZVXb9tXg'),
            ('carol@university.edu', 'Carol White', 'University of Toronto', 'Physics', '$2b$10$Yb9tXgZVXb9tXgZVXb9tXeO9tXgZVXb9tXgZVXb9tXgZVXb9tXgZVXb9tXg')
        `);

        console.log('Sample users inserted');

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