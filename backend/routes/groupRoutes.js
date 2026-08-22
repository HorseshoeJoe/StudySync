const express = require('express');

const router = express.Router();

const groupController =
    require('../controllers/groupController');

// POST /api/groups - Create a new study group
router.post(
    '/',
    groupController.createGroup
);

// POST /api/groups/:id/join - Join a public group
router.post(
    '/:id/join',
    groupController.joinGroup
);

// GET /api/groups/search - Search and filter groups
router.get(
    '/search',
    groupController.searchGroups
);

// GET /api/groups/filter-options - Get available filter options
router.get(
    '/filter-options',
    groupController.getFilterOptions
);

// GET /api/groups/:id - Get group by ID
router.get(
    '/:id',
    groupController.getGroupById
);

module.exports = router;