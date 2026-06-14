const Truck = require('../models/Truck');
const { MOCK_TRUCKS } = require('../mock-data/mockData');

// GET /api/trucks
const getAllTrucks = async (req, res) => {
  try {
    const { status, city, type, minCapacity } = req.query;
    const filter = {};
    if (status)      filter.status = status;
    if (city)        filter['currentLocation.city'] = new RegExp(city, 'i');
    if (type)        filter.truckType = new RegExp(type, 'i');
    if (minCapacity) filter.availableCapacity = { $gte: parseFloat(minCapacity) };

    let trucks = await Truck.find(filter).sort({ rating: -1 });

    // If DB empty, return enriched mock data
    if (trucks.length === 0) {
      trucks = MOCK_TRUCKS.map(t => ({
        ...t,
        availableCapacity: +(t.totalCapacity - t.usedCapacity).toFixed(1)
      }));
    }

    res.json({ success: true, count: trucks.length, trucks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/trucks/:id
const getTruckById = async (req, res) => {
  try {
    const truck = await Truck.findOne({ truckId: req.params.id });
    if (!truck) {
      // Check mock data
      const mock = MOCK_TRUCKS.find(t => t.truckId === req.params.id);
      if (mock) return res.json({ success: true, truck: mock });
      return res.status(404).json({ success: false, error: 'Truck not found' });
    }
    res.json({ success: true, truck });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/trucks
const createTruck = async (req, res) => {
  try {
    const truck = new Truck(req.body);
    await truck.save();
    res.status(201).json({ success: true, truck });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// GET /api/trucks/stats
const getTruckStats = async (req, res) => {
  try {
    let trucks = await Truck.find({});
    if (trucks.length === 0) trucks = MOCK_TRUCKS;

    const total = trucks.length;
    const available = trucks.filter(t => t.status === 'available').length;
    const busy      = trucks.filter(t => t.status === 'busy').length;
    const totalCap  = trucks.reduce((s, t) => s + t.totalCapacity, 0);
    const usedCap   = trucks.reduce((s, t) => s + t.usedCapacity, 0);
    const avgRating = +(trucks.reduce((s, t) => s + t.rating, 0) / total).toFixed(2);

    res.json({
      success: true,
      stats: {
        total, available, busy,
        utilizationPct: +((usedCap / totalCap) * 100).toFixed(1),
        avgRating,
        totalCapacityTons: totalCap,
        usedCapacityTons:  +usedCap.toFixed(1),
        freeCapacityTons:  +(totalCap - usedCap).toFixed(1)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAllTrucks, getTruckById, createTruck, getTruckStats };
