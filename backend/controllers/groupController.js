const Group = require('../models/Group');
const pool = require('../config/database');

// Search and filter groups
exports.searchGroups = async (req, res) => {
    try {
        const {
            keyword,
            institution,
            term,
            visibility,
            minCapacity,
            sortBy,
            sortOrder,
            limit = 20,
            offset = 0
        } = req.query;

        const filters = {
            keyword,
            institution,
            term,
            visibility,
            minCapacity,
            sortBy,
            sortOrder,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        // Remove undefined or empty filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined || filters[key] === '') {
                delete filters[key];
            }
        });

        const groups = await Group.searchAndFilter(filters);

        res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });
    } catch (error) {
        console.error('Error searching groups:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search groups',
            error: error.message
        });
    }
};

// Get group by ID
exports.getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await Group.findById(id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        res.status(200).json({
            success: true,
            data: group
        });
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch group',
            error: error.message
        });
    }
};

// Get filter options
exports.getFilterOptions = async (req, res) => {
    try {
        const institutions = await Group.getDistinctInstitutions();
        const terms = await Group.getDistinctTerms();

        res.status(200).json({
            success: true,
            data: {
                institutions,
                terms
            }
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch filter options',
            error: error.message
        });
    }
};

// Create a new group
exports.createGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const groupData = req.body;

        // Validate required fields
        const required = ['name', 'courseCode', 'courseTitle', 'institution', 'term', 'description', 'visibility'];
        for (const field of required) {
            if (!groupData[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field: ${field}`
                });
            }
        }

        // Validate visibility
        if (!['public', 'request_to_join'].includes(groupData.visibility)) {
            return res.status(400).json({
                success: false,
                message: 'Visibility must be "public" or "request_to_join"'
            });
        }

        const group = await Group.create(groupData, userId);

        // Add creator as group owner
        await pool.query(`
            INSERT INTO group_members (group_id, user_id, role, status)
            VALUES ($1, $2, 'owner', 'active')
        `, [group.id, userId]);

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: group
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create group',
            error: error.message
        });
    }
};

// Join a public group
exports.joinPublicGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await Group.joinPublicGroup(parseInt(id), userId);

        res.status(200).json({
            success: true,
            message: 'Successfully joined the group',
            data: result
        });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to join group'
        });
    }
};

// Request to join a restricted group
exports.requestToJoinGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const request = await Group.requestToJoin(parseInt(id), userId);

        res.status(201).json({
            success: true,
            message: 'Join request submitted successfully',
            data: request
        });
    } catch (error) {
        console.error('Error requesting to join group:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to submit join request'
        });
    }
};

// Get pending join requests for a group
exports.getPendingRequests = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user is group owner or moderator
        const permissionCheck = await pool.query(`
            SELECT role FROM group_members 
            WHERE group_id = $1 AND user_id = $2 AND role IN ('owner', 'moderator')
        `, [id, userId]);

        if (permissionCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view join requests'
            });
        }

        const requests = await Group.getPendingRequests(parseInt(id));

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending requests'
        });
    }
};

// Approve a join request
exports.approveRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id;

        const result = await Group.approveRequest(parseInt(requestId), userId);

        res.status(200).json({
            success: true,
            message: 'Join request approved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to approve request'
        });
    }
};

// Decline a join request
exports.declineRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id;

        const result = await Group.declineRequest(parseInt(requestId), userId);

        res.status(200).json({
            success: true,
            message: 'Join request declined',
            data: result
        });
    } catch (error) {
        console.error('Error declining request:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to decline request'
        });
    }
};

// Get user's join requests
exports.getUserRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const requests = await Group.getUserRequests(userId);

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching user requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your join requests'
        });
    }
};