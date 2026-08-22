const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');

// Create a new study group
exports.createGroup = async (req, res) => {
    try {
        const {
            name,
            course_code,
            course_title,
            institution,
            term,
            description = '',
            visibility = 'public',
            max_members = 50
        } = req.body;

        // Validate required fields
        if (
            typeof name !== 'string' ||
            typeof course_code !== 'string' ||
            typeof course_title !== 'string' ||
            typeof institution !== 'string' ||
            typeof term !== 'string' ||
            !name.trim() ||
            !course_code.trim() ||
            !course_title.trim() ||
            !institution.trim() ||
            !term.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Name, course code, course title, institution, and term are required'
            });
        }

        // Validate visibility
        const allowedVisibility = [
            'public',
            'request_to_join'
        ];

        if (!allowedVisibility.includes(visibility)) {
            return res.status(400).json({
                success: false,
                message:
                    'Visibility must be public or request_to_join'
            });
        }

        // Validate max_members
        const parsedMaxMembers = Number(max_members);

        if (
            !Number.isInteger(parsedMaxMembers) ||
            parsedMaxMembers < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Max members must be a positive integer'
            });
        }

        /*
         * The creator is the authenticated caller.
         *
         * PB-02 T-02.2 landed the requireAuth middleware,
         * which sets req.user from the verified token, so
         * the Sprint 2 placeholder identity is gone. The
         * route cannot be reached without a session.
         */
        const userId = req.user.id;

        const newGroup = await Group.createWithOwner(
            {
                name: name.trim(),
                course_code: course_code.trim(),
                course_title: course_title.trim(),
                institution: institution.trim(),
                term: term.trim(),
                description:
                    typeof description === 'string'
                        ? description.trim()
                        : '',
                visibility,
                max_members: parsedMaxMembers
            },
            userId
        );

        return res.status(201).json({
            success: true,
            message: 'Study group created successfully',
            data: newGroup
        });

    } catch (error) {
        console.error(
            'Error creating study group:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to create study group',
            error: error.message
        });
    }
};

// Join a public study group
exports.joinGroup = async (req, res) => {
    try {
        const { id } = req.params;

        const groupId = Number(id);

        if (!Number.isInteger(groupId) || groupId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid group ID'
            });
        }

        // The joining student is the authenticated caller
        // (PB-02 T-02.2).
        const userId = req.user.id;

        const result =
            await GroupMember.joinPublicGroup(
                groupId,
                userId
            );

        if (result.status === 'not_found') {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        if (result.status === 'already_member') {
            return res.status(409).json({
                success: false,
                message:
                    'You are already a member of this group'
            });
        }

        if (result.status === 'restricted') {
            return res.status(403).json({
                success: false,
                message:
                    'This group requires a join request'
            });
        }

        if (result.status === 'full') {
            return res.status(409).json({
                success: false,
                message:
                    'This study group is full'
            });
        }

        return res.status(200).json({
            success: true,
            message:
                'Successfully joined the study group',
            data: {
                membership:
                    result.membership,
                group:
                    result.group
            }
        });

    } catch (error) {
        console.error(
            'Error joining study group:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Failed to join study group',
            error: error.message
        });
    }
};

// Search for study groups
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
            if (
                filters[key] === undefined ||
                filters[key] === ''
            ) {
                delete filters[key];
            }
        });

        const groups =
            await Group.searchAndFilter(filters);

        res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });

    } catch (error) {
        console.error(
            'Error searching groups:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to search groups',
            error: error.message
        });
    }
};

// Get one group by ID
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
        console.error(
            'Error fetching group:',
            error
        );

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
        const institutions =
            await Group.getDistinctInstitutions();

        const terms =
            await Group.getDistinctTerms();

        res.status(200).json({
            success: true,
            data: {
                institutions,
                terms
            }
        });

    } catch (error) {
        console.error(
            'Error fetching filter options:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch filter options',
            error: error.message
        });
    }
};