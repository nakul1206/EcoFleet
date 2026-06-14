const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  totalTrips: Number,
  totalEmptyMilesReduced: Number,
  totalFuelSaved: Number,
  totalCo2Saved: Number,
  totalRevenueGenerated: Number,
  avgUtilization: Number,
  sustainabilityScore: Number
}, { versionKey: false });

module.exports = mongoose.model('Analytics', analyticsSchema);
