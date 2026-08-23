const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const auth = require('../middleware/auth');

// Public routes
router.get('/search', groupController.searchGroups);
router.get('/filter-options', groupController.getFilterOptions);
router.get('/:id', groupController.getGroupById);

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