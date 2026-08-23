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
            values.push(parseInt(filters.minCapacity));
            paramCount++;
        }

        // Sort by - validate against allowlist
        const allowedSortFields = ['name', 'course_code', 'course_title', 'institution', 'term', 'current_members', 'max_members', 'created_at'];
        const sortField = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
        const sortOrder = filters.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Limit results
        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            values.push(parseInt(filters.limit));
            paramCount++;
        }

        // Offset for pagination
        if (filters.offset) {
            query += ` OFFSET $${paramCount}`;
            values.push(parseInt(filters.offset));
            paramCount++;
        }

        const result = await pool.query(query, values);
        return result.rows;
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
        const query = `SELECT DISTINCT institution FROM groups ORDER BY institution`;
        const result = await pool.query(query);
        return result.rows.map(row => row.institution);
    }

    // Get distinct terms for filter dropdown
    static async getDistinctTerms() {
        const query = `SELECT DISTINCT term FROM groups ORDER BY term`;
        const result = await pool.query(query);
        return result.rows.map(row => row.term);
    }

    // Create a new group
    static async create(groupData, userId) {
        const { name, courseCode, courseTitle, institution, term, description, visibility, maxMembers } = groupData;
        
        const query = `
            INSERT INTO groups (name, course_code, course_title, institution, term, description, visibility, max_members, current_members, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9)
            RETURNING *
        `;
        const result = await pool.query(query, [name, courseCode, courseTitle, institution, term, description, visibility, maxMembers || 50, userId]);
        return result.rows[0];
    }

    // Join a public group
    static async joinPublicGroup(groupId, userId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Check if group exists and is public
            const groupQuery = `
                SELECT id, visibility, current_members, max_members 
                FROM groups 
                WHERE id = $1
            `;
            const groupResult = await client.query(groupQuery, [groupId]);
            
            if (groupResult.rows.length === 0) {
                throw new Error('Group not found');
            }
            
            const group = groupResult.rows[0];
            
            if (group.visibility !== 'public') {
                throw new Error('This group requires a join request');
            }
            
            if (group.current_members >= group.max_members) {
                throw new Error('This group has reached its maximum capacity');
            }

            // Check if already a member
            const memberCheck = `
                SELECT id FROM group_members 
                WHERE group_id = $1 AND user_id = $2
            `;
            const memberResult = await client.query(memberCheck, [groupId, userId]);
            
            if (memberResult.rows.length > 0) {
                throw new Error('You are already a member of this group');
            }

            // Add user to group_members
            await client.query(`
                INSERT INTO group_members (group_id, user_id, role, status)
                VALUES ($1, $2, 'member', 'active')
            `, [groupId, userId]);

            // Increment current_members
            await client.query(`
                UPDATE groups 
                SET current_members = current_members + 1 
                WHERE id = $1
            `, [groupId]);

            await client.query('COMMIT');
            return { success: true, groupId, userId };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Request to join a restricted group
    static async requestToJoin(groupId, userId) {
        // Check if group exists and is restricted
        const groupQuery = `
            SELECT id, visibility, current_members, max_members 
            FROM groups 
            WHERE id = $1
        `;
        const groupResult = await pool.query(groupQuery, [groupId]);
        
        if (groupResult.rows.length === 0) {
            throw new Error('Group not found');
        }
        
        const group = groupResult.rows[0];
        
        if (group.visibility !== 'request_to_join') {
            throw new Error('This group does not require a join request');
        }
        
        // Check if already a member
        const memberCheck = `
            SELECT id FROM group_members 
            WHERE group_id = $1 AND user_id = $2 AND status = 'active'
        `;
        const memberResult = await pool.query(memberCheck, [groupId, userId]);
        
        if (memberResult.rows.length > 0) {
            throw new Error('You are already a member of this group');
        }
        
        // Check if request already exists
        const requestCheck = `
            SELECT id, status FROM join_requests 
            WHERE group_id = $1 AND user_id = $2
        `;
        const requestResult = await pool.query(requestCheck, [groupId, userId]);
        
        if (requestResult.rows.length > 0) {
            if (requestResult.rows[0].status === 'pending') {
                throw new Error('You already have a pending request for this group');
            } else if (requestResult.rows[0].status === 'declined') {
                throw new Error('Your previous request was declined');
            } else if (requestResult.rows[0].status === 'approved') {
                throw new Error('You were already approved for this group');
            }
        }
        
        // Create join request
        const insertQuery = `
            INSERT INTO join_requests (group_id, user_id, status)
            VALUES ($1, $2, 'pending')
            RETURNING id, group_id, user_id, status, requested_at
        `;
        const result = await pool.query(insertQuery, [groupId, userId]);
        
        return result.rows[0];
    }

    // Get pending join requests for a group (for Group Owner)
    static async getPendingRequests(groupId) {
        const query = `
            SELECT 
                jr.id,
                jr.group_id,
                jr.user_id,
                jr.status,
                jr.requested_at,
                u.display_name,
                u.email,
                u.institution,
                u.program
            FROM join_requests jr
            JOIN users u ON jr.user_id = u.id
            WHERE jr.group_id = $1 AND jr.status = 'pending'
            ORDER BY jr.requested_at ASC
        `;
        const result = await pool.query(query, [groupId]);
        return result.rows;
    }

    // Approve a join request
    static async approveRequest(requestId, reviewerId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get the request details
            const requestQuery = `
                SELECT group_id, user_id FROM join_requests 
                WHERE id = $1 AND status = 'pending'
            `;
            const requestResult = await client.query(requestQuery, [requestId]);
            
            if (requestResult.rows.length === 0) {
                throw new Error('No pending request found');
            }
            
            const { group_id, user_id } = requestResult.rows[0];
            
            // Update request status
            await client.query(`
                UPDATE join_requests 
                SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
                WHERE id = $2
            `, [reviewerId, requestId]);
            
            // Add user to group_members
            await client.query(`
                INSERT INTO group_members (group_id, user_id, role, status)
                VALUES ($1, $2, 'member', 'active')
            `, [group_id, user_id]);
            
            // Increment current_members
            await client.query(`
                UPDATE groups 
                SET current_members = current_members + 1 
                WHERE id = $1
            `, [group_id]);
            
            await client.query('COMMIT');
            
            return { success: true, groupId: group_id, userId: user_id };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Decline a join request
    static async declineRequest(requestId, reviewerId) {
        const query = `
            UPDATE join_requests 
            SET status = 'declined', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
            WHERE id = $2 AND status = 'pending'
            RETURNING id, group_id, user_id
        `;
        const result = await pool.query(query, [reviewerId, requestId]);
        
        if (result.rows.length === 0) {
            throw new Error('No pending request found');
        }
        
        return result.rows[0];
    }

    // Get user's join requests
    static async getUserRequests(userId) {
        const query = `
            SELECT 
                jr.id,
                jr.group_id,
                jr.status,
                jr.requested_at,
                jr.reviewed_at,
                g.name as group_name,
                g.course_code,
                g.course_title,
                g.institution,
                g.term
            FROM join_requests jr
            JOIN groups g ON jr.group_id = g.id
            WHERE jr.user_id = $1
            ORDER BY jr.requested_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }
}

module.exports = Group;