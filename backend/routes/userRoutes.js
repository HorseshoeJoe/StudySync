/*
 * Profile routes.
 *
 * PB-03 US-03.
 *
 * /me is declared before /:id so that the literal path
 * is matched first and "me" is never read as an
 * identifier.
 */

const express = require('express');

const router = express.Router();

const userController = require('../controllers/userController');

const { requireAuth } = require('../middleware/auth');

// GET /api/users/me - Read the caller's own profile
router.get(
    '/me',
    requireAuth,
    userController.getMyProfile
);

// PUT /api/users/me - Update the caller's own profile
router.put(
    '/me',
    requireAuth,
    userController.updateMyProfile
);

// GET /api/users/:id - Another student's public profile
router.get(
    '/:id',
    requireAuth,
    userController.getPublicProfile
);

module.exports = router;
