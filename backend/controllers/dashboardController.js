const pool = require('../config/database');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's groups
        const groupsQuery = `
            SELECT 
                g.id,
                g.name,
                g.course_code,
                g.course_title,
                g.institution,
                g.term,
                g.current_members,
                g.max_members,
                gm.role
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.user_id = $1 AND gm.status = 'active'
            ORDER BY g.created_at DESC
        `;
        const groupsResult = await pool.query(groupsQuery, [userId]);

        // Get user's pending join requests
        const requestsQuery = `
            SELECT 
                jr.id,
                jr.group_id,
                jr.status,
                jr.requested_at,
                g.name as group_name,
                g.course_code
            FROM join_requests jr
            JOIN groups g ON jr.group_id = g.id
            WHERE jr.user_id = $1 AND jr.status = 'pending'
            ORDER BY jr.requested_at DESC
        `;
        const requestsResult = await pool.query(requestsQuery, [userId]);

        // Get recent activity (simplified - members who joined)
        const activityQuery = `
            SELECT 
                'member_joined' as type,
                u.display_name as user_name,
                g.name as group_name,
                gm.joined_at as timestamp
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.group_id IN (
                SELECT group_id FROM group_members WHERE user_id = $1 AND status = 'active'
            )
            ORDER BY gm.joined_at DESC
            LIMIT 10
        `;
        const activityResult = await pool.query(activityQuery, [userId]);

        // Get groups with pending requests (for owners)
        const pendingRequestsQuery = `
            SELECT 
                g.id as group_id,
                g.name as group_name,
                COUNT(jr.id) as pending_count
            FROM groups g
            JOIN join_requests jr ON g.id = jr.group_id
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1 AND gm.role = 'owner' AND jr.status = 'pending'
            GROUP BY g.id, g.name
        `;
        const pendingResult = await pool.query(pendingRequestsQuery, [userId]);

        res.status(200).json({
            success: true,
            data: {
                groups: groupsResult.rows,
                pendingRequests: requestsResult.rows,
                recentActivity: activityResult.rows,
                groupsWithPending: pendingResult.rows,
                totalGroups: groupsResult.rows.length,
                totalPendingRequests: requestsResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data'
        });
    }
};