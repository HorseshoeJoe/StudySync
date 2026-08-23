const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

// GET /api/dashboard - Get user dashboard (authenticated)
router.get('/', auth, dashboardController.getDashboard);

module.exports = router;