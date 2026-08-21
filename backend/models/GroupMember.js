const pool = require('../config/database');

class GroupMember {

    // Add a user to a group
    static async addMember(groupId, userId, role = 'member') {
        const query = `
            INSERT INTO group_members (
                group_id,
                user_id,
                role
            )
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [
            groupId,
            userId,
            role
        ]);

        return result.rows[0];
    }

    // Check whether a user is already a member
    static async isMember(groupId, userId) {
        const query = `
            SELECT *
            FROM group_members
            WHERE group_id = $1
            AND user_id = $2
        `;

        const result = await pool.query(query, [
            groupId,
            userId
        ]);

        return result.rows.length > 0;
    }

    // Get all members of a group
    static async getMembersByGroup(groupId) {
        const query = `
            SELECT
                gm.id,
                gm.group_id,
                gm.user_id,
                gm.role,
                gm.joined_at,
                u.display_name,
                u.institution,
                u.program
            FROM group_members gm
            JOIN users u
                ON gm.user_id = u.id
            WHERE gm.group_id = $1
            ORDER BY gm.joined_at ASC
        `;

        const result = await pool.query(query, [groupId]);

        return result.rows;
    }
}

module.exports = GroupMember;