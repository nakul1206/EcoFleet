const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentId: { type: String, required: true, unique: true },
  shipperName: String,
  shipperCompany: String,
  pickupLocation: {
    city: { type: String, required: true },
    lat: Number,
    lng: Number
  },
  destination: {
    city: { type: String, required: true },
    lat: Number,
    lng: Number
  },
  weight: { type: Number, required: true }, // tons
  shipmentType: {
    type: String,
    enum: ['Electronics', 'Textiles', 'Machinery', 'FMCG', 'Perishables', 'Chemicals', 'Automotive', 'Construction'],
    default: 'FMCG'
  },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  deadline: { type: Date },
  estimatedPrice: Number,
  finalPrice: Number,
  distanceKm: Number,
  status: {
    type: String,
    enum: ['pending', 'matched', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  assignedTruckId: { type: String, default: null },
  matchScore: { type: Number, default: 0 },
  co2Saved: { type: Number, default: 0 },
  emptyMilesReduced: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Shipment', shipmentSchema);
