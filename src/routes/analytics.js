const express = require('express');
const router = express.Router();
const {
  getCarbonAnalytics,
  getDashboardStats,
  getReroute,
  getHazards,
  getRuralOpportunities,
  getLeaderboard
} = require('../controllers/analyticsController');

// Carbon & ESG
router.get('/carbon',          getCarbonAnalytics);
router.get('/dashboard',       getDashboardStats);
router.get('/leaderboard',     getLeaderboard);

// Routing
router.post('/routes/reroute', getReroute);
router.get('/routes/hazards',  getHazards);

// Rural
router.get('/rural/opportunities', getRuralOpportunities);

module.exports = router;
