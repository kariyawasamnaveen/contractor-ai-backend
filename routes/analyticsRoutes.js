const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const router = express.Router();

// All analytics routes require authentication
router.get('/dashboard', auth, analyticsController.getDashboardStats);
router.get('/leads-over-time', auth, analyticsController.getLeadsOverTime);
router.get('/revenue', auth, analyticsController.getRevenueStats);

module.exports = router;