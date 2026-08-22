const pool = require('../config/database');

class GroupMember {
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

        const result = await pool.query(
            query,
            [groupId, userId, role]
        );

        return result.rows[0];
    }

    static async isMember(groupId, userId) {
        const query = `
            SELECT *
            FROM group_members
            WHERE group_id = $1
              AND user_id = $2
        `;

        const result = await pool.query(
            query,
            [groupId, userId]
        );

        return result.rows.length > 0;
    }

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

        const result = await pool.query(
            query,
            [groupId]
        );

        return result.rows;
    }

    // Join a public study group
    static async joinPublicGroup(groupId, userId) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Lock the group while checking capacity
            const groupResult = await client.query(
                `
                SELECT
                    id,
                    name,
                    visibility,
                    max_members,
                    current_members
                FROM groups
                WHERE id = $1
                FOR UPDATE
                `,
                [groupId]
            );

            if (groupResult.rows.length === 0) {
                await client.query('ROLLBACK');

                return {
                    status: 'not_found'
                };
            }

            const group = groupResult.rows[0];

            // Check whether user is already a member
            const membershipResult = await client.query(
                `
                SELECT id
                FROM group_members
                WHERE group_id = $1
                  AND user_id = $2
                `,
                [groupId, userId]
            );

            if (membershipResult.rows.length > 0) {
                await client.query('ROLLBACK');

                return {
                    status: 'already_member'
                };
            }

            // PB-07A only allows immediate joining
            // for public groups
            if (group.visibility !== 'public') {
                await client.query('ROLLBACK');

                return {
                    status: 'restricted'
                };
            }

            // Check capacity
            if (
                group.current_members >=
                group.max_members
            ) {
                await client.query('ROLLBACK');

                return {
                    status: 'full'
                };
            }

            // Add membership
            const memberResult = await client.query(
                `
                INSERT INTO group_members (
                    group_id,
                    user_id,
                    role
                )
                VALUES ($1, $2, 'member')
                RETURNING *
                `,
                [groupId, userId]
            );

            // Increase group member count
            const updatedGroupResult =
                await client.query(
                    `
                    UPDATE groups
                    SET current_members =
                        current_members + 1,
                        updated_at =
                        CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING
                        id,
                        name,
                        visibility,
                        max_members,
                        current_members
                    `,
                    [groupId]
                );

            await client.query('COMMIT');

            return {
                status: 'joined',
                membership:
                    memberResult.rows[0],
                group:
                    updatedGroupResult.rows[0]
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;

        } finally {
            client.release();
        }
    }
}

module.exports = GroupMember;