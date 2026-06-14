const { getAggregateCarbonStats, getRouteCarbon } = require('../services/carbonService');
const { rerouteShipment, getAllHazards } = require('../services/routingService');
const { MOCK_TRUCKS, MOCK_SHIPMENTS, CITIES } = require('../mock-data/mockData');
const Truck = require('../models/Truck');

// GET /api/analytics/carbon
const getCarbonAnalytics = async (req, res) => {
  try {
    const stats = await getAggregateCarbonStats();
    const routeBreakdown = await getRouteCarbon();

    // Monthly trend (mock for demo — replace with real aggregation)
    const monthlyTrend = ['Jan','Feb','Mar','Apr','May','Jun'].map((month, i) => ({
      month,
      co2Saved:         Math.round(120 + i * 60 + Math.random() * 30),
      fuelSaved:        Math.round(45 + i * 22 + Math.random() * 10),
      emptyMilesReduced: Math.round(300 + i * 120 + Math.random() * 50)
    }));

    res.json({ success: true, ...stats, routeBreakdown, monthlyTrend });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/analytics/dashboard
const getDashboardStats = async (req, res) => {
  try {
    let trucks    = await Truck.find({});
    if (trucks.length === 0) trucks = MOCK_TRUCKS;

    const shipments = MOCK_SHIPMENTS;
    const total     = trucks.length;
    const available = trucks.filter(t => t.status === 'available').length;
    const totalCap  = trucks.reduce((s, t) => s + t.totalCapacity, 0);
    const usedCap   = trucks.reduce((s, t) => s + t.usedCapacity, 0);
    const util      = +((usedCap / totalCap) * 100).toFixed(1);

    res.json({
      success: true,
      kpis: {
        totalTrucks:         total,
        availableTrucks:     available,
        activeShipments:     shipments.filter(s => s.status === 'in_transit').length,
        pendingShipments:    shipments.filter(s => s.status === 'pending').length,
        deliveredToday:      Math.floor(Math.random() * 8 + 3),
        fleetUtilization:    util,
        totalRevenueTodayINR: Math.floor(Math.random() * 300000 + 150000),
        co2SavedToday:       Math.floor(Math.random() * 120 + 40),
        emptyMilesReducedToday: Math.floor(Math.random() * 800 + 200)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/routes/reroute
const getReroute = async (req, res) => {
  try {
    const { origin, destination, preferredHighway } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ success: false, error: 'origin and destination required' });
    }
    const result = rerouteShipment({ origin, destination, preferredHighway });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/routes/hazards
const getHazards = async (req, res) => {
  try {
    const hazards = getAllHazards();
    res.json({ success: true, count: hazards.length, hazards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/rural/opportunities
const getRuralOpportunities = async (req, res) => {
  try {
    let trucks = await Truck.find({ status: 'available' });
    if (trucks.length === 0) trucks = MOCK_TRUCKS.filter(t => t.status === 'available');

    // Mock rural nodes (tier-2/3 cities near our city network)
    const ruralNodes = [
      { city: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325, demandKg: 8400, product: 'Mangoes', readyDate: '2024-03-20', potentialRevenue: 18200 },
      { city: 'Nalgonda', state: 'Telangana', lat: 17.0575, lng: 79.2679, demandKg: 12000, product: 'Cotton Bales', readyDate: '2024-03-18', potentialRevenue: 24600 },
      { city: 'Bagalkot', state: 'Karnataka', lat: 16.1691, lng: 75.6615, demandKg: 6800, product: 'Sugarcane', readyDate: '2024-03-22', potentialRevenue: 12400 },
      { city: 'Wardha', state: 'Maharashtra', lat: 20.7453, lng: 78.6022, demandKg: 15000, product: 'Orange Harvest', readyDate: '2024-03-19', potentialRevenue: 31500 },
      { city: 'Muzaffarpur', state: 'Bihar', lat: 26.1209, lng: 85.3647, demandKg: 9500, product: 'Litchi Export', readyDate: '2024-03-25', potentialRevenue: 22000 }
    ];

    // Find nearest available truck for each node
    const opportunities = ruralNodes.map(node => {
      const nearestTruck = trucks
        .map(t => ({
          truck: t,
          distKm: Math.round(Math.abs(t.currentLocation.lat - node.lat) * 111 + Math.abs(t.currentLocation.lng - node.lng) * 111)
        }))
        .sort((a, b) => a.distKm - b.distKm)[0];

      return {
        ...node,
        nearestTruck: nearestTruck ? {
          truckId:    nearestTruck.truck.truckId || nearestTruck.truck.id,
          driverName: nearestTruck.truck.driverName,
          distanceKm: nearestTruck.distKm,
          availableCapacityTons: nearestTruck.truck.availableCapacity
        } : null,
        utilizationImprovementPct: Math.round(15 + Math.random() * 35),
        co2SavedKg: Math.round(30 + Math.random() * 80)
      };
    });

    res.json({ success: true, count: opportunities.length, opportunities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/analytics/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    let trucks = await Truck.find({}).sort({ totalEarnings: -1 }).limit(10);
    if (trucks.length === 0) trucks = MOCK_TRUCKS.slice(0, 10);

    const leaderboard = trucks.map((t, i) => ({
      rank:         i + 1,
      truckId:      t.truckId || t.id,
      driverName:   t.driverName,
      totalTrips:   t.totalTrips,
      rating:       t.rating,
      co2Saved:     Math.round(t.totalTrips * 2.8),
      emptyMilesReduced: Math.round(t.totalTrips * 18),
      sustainabilityGrade: t.rating >= 4.5 ? 'A+' : t.rating >= 4.0 ? 'A' : t.rating >= 3.5 ? 'B' : 'C'
    }));

    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getCarbonAnalytics, getDashboardStats, getReroute, getHazards, getRuralOpportunities, getLeaderboard };
