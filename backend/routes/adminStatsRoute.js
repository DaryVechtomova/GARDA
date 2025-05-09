// routes/adminStatsRoute.js
const express = require('express');
const router = express.Router();
const { getDashboardStats, getPopularProducts } = require('../controllers/adminStatsController.js');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.js');

router.get('/dashboard', authMiddleware, adminMiddleware, getDashboardStats);
router.get('/popular-products', authMiddleware, adminMiddleware, getPopularProducts);

module.exports = router;