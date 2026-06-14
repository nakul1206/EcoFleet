const Truck = require('../models/Truck');
const Shipment = require('../models/Shipment');
const { runMatchingEngine } = require('../ai/matchingEngine');
const { runNegotiation } = require('../ai/negotiationAgent');
const { MOCK_TRUCKS, MOCK_SHIPMENTS } = require('../mock-data/mockData');
const mlService = require('../services/mlService');

/**
 * POST /api/ai/match
 * Body: { shipmentId?, weight, pickupLocation, destination, distanceKm, shipmentType }
 */
const matchShipment = async (req, res) => {
  try {
    const { shipmentId, weight, pickupLocation, destination, distanceKm, shipmentType } = req.body;

    // Resolve shipment: from DB, or build from request body
    let shipment;
    if (shipmentId) {
      shipment = await Shipment.findOne({ shipmentId });
      if (!shipment) shipment = MOCK_SHIPMENTS.find(s => s.shipmentId === shipmentId);
    }
    if (!shipment) {
      shipment = {
        shipmentId: `SHP-LIVE-${Date.now()}`,
        weight: weight || 5,
        pickupLocation: pickupLocation || { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
        destination: destination || { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
        distanceKm: distanceKm || 350,
        shipmentType: shipmentType || 'FMCG',
        priority: 'Medium'
      };
    }

    // Load trucks
    let trucks = await Truck.find({ status: 'available' });
    if (trucks.length === 0) trucks = MOCK_TRUCKS.filter(t => t.status === 'available');

    const result = await runMatchingEngine(shipment, trucks, 5);

    res.json({ success: true, shipment, ...result });
  } catch (err) {
    console.error('[AI Match]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/ai/negotiate
 * Body: { shipmentId?, weight, pickupLocation, destination, distanceKm }
 */
const negotiateShipment = async (req, res) => {
  try {
    const { shipmentId, weight, pickupLocation, destination, distanceKm } = req.body;

    let shipment;
    if (shipmentId) {
      shipment = await Shipment.findOne({ shipmentId });
      if (!shipment) shipment = MOCK_SHIPMENTS.find(s => s.shipmentId === shipmentId);
    }
    if (!shipment) {
      shipment = {
        weight: weight || 5,
        pickupLocation: pickupLocation || { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
        destination: destination || { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
        distanceKm: distanceKm || 350
      };
    }

    let allTrucks = await Truck.find({});
    if (allTrucks.length === 0) allTrucks = MOCK_TRUCKS;

    const candidates = allTrucks.filter(
      t => t.status === 'available' && t.availableCapacity >= shipment.weight
    ).slice(0, 8);

    const result = runNegotiation(shipment, candidates, allTrucks);

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Negotiate]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/ai/predict
 * Body: { origin, destination, distanceKm, utilization }
 */
const getPredictions = async (req, res) => {
  try {
    const { origin = 'Chennai', destination = 'Bangalore', distanceKm = 350, utilization = 0.6, week = 1 } = req.body;

    const [emptyMile, demand, routeEff] = await Promise.all([
      mlService.predictEmptyMile({ utilization, distanceKm, origin, destination }),
      mlService.predictDemand({ origin, destination, week }),
      mlService.predictRouteEfficiency({ distanceKm, routeDeviation: 0.1 })
    ]);

    res.json({
      success: true,
      corridor: `${origin} → ${destination}`,
      predictions: { emptyMile, demand, routeEfficiency: routeEff }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { matchShipment, negotiateShipment, getPredictions };
