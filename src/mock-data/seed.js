require('dotenv').config();
const connectDB = require('../config/db');
const Truck = require('../models/Truck');
const Shipment = require('../models/Shipment');
const { MOCK_TRUCKS, MOCK_SHIPMENTS } = require('./mockData');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  await Truck.deleteMany({});
  await Shipment.deleteMany({});

  await Truck.insertMany(MOCK_TRUCKS);
  console.log(`✅ Inserted ${MOCK_TRUCKS.length} trucks`);

  await Shipment.insertMany(MOCK_SHIPMENTS);
  console.log(`✅ Inserted ${MOCK_SHIPMENTS.length} shipments`);

  console.log('🎉 Seed complete!');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
