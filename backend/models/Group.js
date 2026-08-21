const pool = require('../config/database');

class Group {
    // Search for groups with filters
    static async searchAndFilter(filters) {
        let query = `
            SELECT 
                id, name, course_code, course_title, institution, 
                term, description, visibility, max_members, current_members,
                created_by, created_at
            FROM groups 
            WHERE 1=1
        `;

        const values = [];
        let paramCount = 1;

        // Search by keyword (name, course code, course title)
        if (filters.keyword) {
            query += ` AND (
                name ILIKE $${paramCount} OR 
                course_code ILIKE $${paramCount} OR 
                course_title ILIKE $${paramCount}
            )`;

            values.push(`%${filters.keyword}%`);
            paramCount++;
        }

        // Filter by institution
        if (filters.institution) {
            query += ` AND institution ILIKE $${paramCount}`;
            values.push(`%${filters.institution}%`);
            paramCount++;
        }

        // Filter by term
        if (filters.term) {
            query += ` AND term = $${paramCount}`;
            values.push(filters.term);
            paramCount++;
        }

        // Filter by visibility
        if (filters.visibility) {
            query += ` AND visibility = $${paramCount}`;
            values.push(filters.visibility);
            paramCount++;
        }

        // Filter by max members (groups with at least this capacity)
        if (filters.minCapacity) {
            query += ` AND max_members >= $${paramCount}`;
            values.push(filters.minCapacity);
            paramCount++;
        }

        // Sort by
        const sortField = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder || 'DESC';

        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Limit results
        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
            paramCount++;
        }

        // Offset for pagination
        if (filters.offset) {
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
            paramCount++;
        }

        const result = await pool.query(query, values);

        return result.rows;
    }

    // Create a new study group
    // and automatically add the creator as owner
    static async createWithOwner(groupData, userId) {
        const client = await pool.connect();

        try {
            // Start database transaction
            await client.query('BEGIN');

            const {
                name,
                course_code,
                course_title,
                institution,
                term,
                description = '',
                visibility = 'public',
                max_members = 50
            } = groupData;

            // Create the group
            const groupResult = await client.query(
                `
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
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    1,
                    $9
                )
                RETURNING
                    id,
                    name,
                    course_code,
                    course_title,
                    institution,
                    term,
                    description,
                    visibility,
                    max_members,
                    current_members,
                    created_by,
                    created_at
                `,
                [
                    name,
                    course_code,
                    course_title,
                    institution,
                    term,
                    description,
                    visibility,
                    max_members,
                    userId
                ]
            );

            const newGroup = groupResult.rows[0];

            // Add creator to group_members as owner
            await client.query(
                `
                INSERT INTO group_members (
                    group_id,
                    user_id,
                    role
                )
                VALUES ($1, $2, 'owner')
                `,
                [
                    newGroup.id,
                    userId
                ]
            );

            // Save both operations
            await client.query('COMMIT');

            return newGroup;

        } catch (error) {
            // Undo everything if either insert fails
            await client.query('ROLLBACK');

            throw error;

        } finally {
            // Return database connection to pool
            client.release();
        }
    }

    // Get group by ID
    static async findById(id) {
        const query = `
            SELECT 
                id, name, course_code, course_title, institution, 
                term, description, visibility, max_members, current_members,
                created_by, created_at
            FROM groups 
            WHERE id = $1
        `;

        const result = await pool.query(query, [id]);

        return result.rows[0];
    }

    // Get distinct institutions for filter dropdown
    static async getDistinctInstitutions() {
        const query = `
            SELECT DISTINCT institution 
            FROM groups 
            ORDER BY institution
        `;

        const result = await pool.query(query);

        return result.rows.map(row => row.institution);
    }

    // Get distinct terms for filter dropdown
    static async getDistinctTerms() {
        const query = `
            SELECT DISTINCT term 
            FROM groups 
            ORDER BY term
        `;

        const result = await pool.query(query);

        return result.rows.map(row => row.term);
    }
}

module.exports = Group;