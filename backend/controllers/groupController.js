const Group = require('../models/Group');

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