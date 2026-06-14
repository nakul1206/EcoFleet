const Shipment = require('../models/Shipment');
const { MOCK_SHIPMENTS } = require('../mock-data/mockData');

// GET /api/shipments
const getAllShipments = async (req, res) => {
  try {
    const { status, priority, type } = req.query;
    const filter = {};
    if (status)   filter.status = status;
    if (priority) filter.priority = priority;
    if (type)     filter.shipmentType = new RegExp(type, 'i');

    let shipments = await Shipment.find(filter).sort({ createdAt: -1 });
    if (shipments.length === 0) shipments = MOCK_SHIPMENTS;

    res.json({ success: true, count: shipments.length, shipments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/shipments/:id
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id });
    if (!shipment) {
      const mock = MOCK_SHIPMENTS.find(s => s.shipmentId === req.params.id);
      if (mock) return res.json({ success: true, shipment: mock });
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }
    res.json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/shipments
const createShipment = async (req, res) => {
  try {
    const shipment = new Shipment(req.body);
    await shipment.save();
    res.status(201).json({ success: true, shipment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// GET /api/shipments/pending
const getPendingShipments = async (req, res) => {
  try {
    let shipments = await Shipment.find({ status: 'pending' }).sort({ createdAt: -1 });
    if (shipments.length === 0) shipments = MOCK_SHIPMENTS.filter(s => s.status === 'pending');
    res.json({ success: true, count: shipments.length, shipments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAllShipments, getShipmentById, createShipment, getPendingShipments };
