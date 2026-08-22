/*
 * Authentication routes.
 *
 * PB-01 US-01, PB-02 US-02.
 *
 * Register and login are public by necessity; logout and
 * me sit behind requireAuth.
 */

const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');

const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register - Create an account
router.post(
    '/register',
    authController.register
);

// POST /api/auth/login - Authenticate and issue a token
router.post(
    '/login',
    authController.login
);

// POST /api/auth/logout - Revoke the presented token
router.post(
    '/logout',
    requireAuth,
    authController.logout
);

// GET /api/auth/me - Restore the session on page reload
router.get(
    '/me',
    requireAuth,
    authController.me
);

module.exports = router;
