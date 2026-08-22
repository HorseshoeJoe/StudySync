const express = require('express');

const router = express.Router();

const groupController =
    require('../controllers/groupController');

const {
    requireAuth,
    attachUserIfPresent
} = require('../middleware/auth');

/*
 * PB-02 T-02.2 — the two endpoints that write on behalf
 * of a student are now guarded. They previously ran
 * against a hard-coded user identity because no session
 * model existed; requireAuth supplies req.user, so the
 * placeholder is gone.
 *
 * Search, filter options, and single-group reads stay
 * open. attachUserIfPresent identifies a signed-in
 * caller without refusing an anonymous one, so the
 * public search view keeps working while a signed-in
 * student can be shown their own memberships.
 */

// POST /api/groups - Create a new study group
router.post(
    '/',
    requireAuth,
    groupController.createGroup
);

// POST /api/groups/:id/join - Join a public group
router.post(
    '/:id/join',
    requireAuth,
    groupController.joinGroup
);

// GET /api/groups/search - Search and filter groups
router.get(
    '/search',
    attachUserIfPresent,
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
    attachUserIfPresent,
    groupController.getGroupById
);

module.exports = router;
