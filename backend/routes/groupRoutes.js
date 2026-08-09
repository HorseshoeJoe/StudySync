const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// GET /api/groups/search - Search and filter groups
router.get('/search', groupController.searchGroups);

// GET /api/groups/filter-options - Get available filter options
router.get('/filter-options', groupController.getFilterOptions);

// GET /api/groups/:id - Get group by ID
router.get('/:id', groupController.getGroupById);

module.exports = router;