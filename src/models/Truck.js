const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  truckId: { type: String, required: true, unique: true },
  driverName: { type: String, required: true },
  driverPhone: String,
  truckType: {
    type: String,
    enum: ['Mini Truck (1T)', 'Medium Truck (7T)', 'Heavy Truck (20T)', 'Container (40ft)', 'Refrigerated'],
    required: true
  },
  currentLocation: {
    city: String,
    lat: Number,
    lng: Number
  },
  destination: {
    city: String,
    lat: Number,
    lng: Number
  },
  route: [String], // waypoint city names
  totalCapacity: { type: Number, required: true }, // tons
  usedCapacity: { type: Number, default: 0 },
  availableCapacity: { type: Number },
  fuelEfficiency: { type: Number, default: 4.2 }, // km/L
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  rating: { type: Number, default: 4.0, min: 1, max: 5 },
  totalTrips: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  pricePerTon: { type: Number, default: 1200 },
  experience: { type: Number, default: 1 }, // years
  emptyMileProbability: { type: Number, default: 0.3 }, // from ML
  co2EmittedKg: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

// Auto-compute availableCapacity before save
truckSchema.pre('save', function (next) {
  this.availableCapacity = this.totalCapacity - this.usedCapacity;
  next();
});

module.exports = mongoose.model('Truck', truckSchema);
