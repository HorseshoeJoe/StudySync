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

// Authenticated routes
router.post('/', auth, groupController.createGroup);
router.post('/:id/join', auth, groupController.joinPublicGroup);
router.post('/:id/request', auth, groupController.requestToJoinGroup);

// Group management routes (authenticated, owner only)
router.get('/:id/requests', auth, groupController.getPendingRequests);

// Request management routes (authenticated)
router.put('/requests/:requestId/approve', auth, groupController.approveRequest);
router.put('/requests/:requestId/decline', auth, groupController.declineRequest);
router.get('/requests/me', auth, groupController.getUserRequests);

module.exports = router;