/**
 * Mock Data — EcoFleet AI
 * Realistic Indian logistics data for hackathon demo
 */

const CITIES = [
  { name: 'Chennai',     lat: 13.0827, lng: 80.2707 },
  { name: 'Mumbai',      lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi',       lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore',   lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad',   lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata',     lat: 22.5726, lng: 88.3639 },
  { name: 'Pune',        lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad',   lat: 23.0225, lng: 72.5714 },
  { name: 'Coimbatore',  lat: 11.0168, lng: 76.9558 },
  { name: 'Jaipur',      lat: 26.9124, lng: 75.7873 }
];

const TRUCK_TYPES = [
  { type: 'Mini Truck (1T)',    capacity: 2,  efficiency: 8.0 },
  { type: 'Medium Truck (7T)', capacity: 7,  efficiency: 5.5 },
  { type: 'Heavy Truck (20T)', capacity: 20, efficiency: 4.2 },
  { type: 'Container (40ft)',  capacity: 25, efficiency: 3.8 },
  { type: 'Refrigerated',      capacity: 10, efficiency: 3.5 }
];

const DRIVER_NAMES = [
  'Ravi Kumar', 'Suresh Balan', 'Murugan S', 'Vikram Nair', 'Anil Dubey',
  'Ramesh Patil', 'Deepak Singh', 'Mohan Verma', 'Satish Yadav', 'Kiran Babu',
  'Ajay Mehta', 'Santosh Roy', 'Pradeep Gupta', 'Manoj Tiwari', 'Sanjay Pillai',
  'Arjun Das', 'Rohit Joshi', 'Hemant Sharma', 'Prakash Kumar', 'Dinesh Iyer'
];

const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const MOCK_TRUCKS = DRIVER_NAMES.map((name, i) => {
  const city = CITIES[i % CITIES.length];
  const dest = CITIES[(i + 3) % CITIES.length];
  const truckDef = TRUCK_TYPES[i % TRUCK_TYPES.length];
  const usedCap = +rand(0, truckDef.capacity * 0.65).toFixed(1);

  return {
    truckId: `TRK${String(i + 101).padStart(3, '0')}`,
    driverName: name,
    driverPhone: `+91 9${randInt(600000000, 999999999)}`,
    truckType: truckDef.type,
    currentLocation: {
      city: city.name,
      lat: +(city.lat + (Math.random() - 0.5) * 0.5).toFixed(4),
      lng: +(city.lng + (Math.random() - 0.5) * 0.5).toFixed(4)
    },
    destination: {
      city: dest.name,
      lat: dest.lat,
      lng: dest.lng
    },
    route: [city.name, CITIES[(i + 1) % CITIES.length].name, dest.name],
    totalCapacity: truckDef.capacity,
    usedCapacity: usedCap,
    availableCapacity: +(truckDef.capacity - usedCap).toFixed(1),
    fuelEfficiency: truckDef.efficiency,
    status: Math.random() > 0.25 ? 'available' : 'busy',
    rating: +rand(3.7, 5.0).toFixed(1),
    totalTrips: randInt(50, 500),
    totalEarnings: randInt(200000, 900000),
    pricePerTon: randInt(800, 2500),
    experience: randInt(2, 15),
    emptyMileProbability: +rand(0.1, 0.6).toFixed(2),
    co2EmittedKg: +rand(1000, 8000).toFixed(0)
  };
});

const SHIPMENT_TYPES = ['Electronics', 'Textiles', 'Machinery', 'FMCG', 'Perishables', 'Chemicals', 'Automotive', 'Construction'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const MOCK_SHIPMENTS = Array.from({ length: 30 }, (_, i) => {
  const pickup = pick(CITIES);
  const dest = pick(CITIES.filter(c => c.name !== pickup.name));
  const weight = +rand(0.5, 22).toFixed(1);
  const distanceKm = +rand(100, 800).toFixed(0);
  const price = Math.round(weight * distanceKm * rand(1.8, 3.2));

  return {
    shipmentId: `SHP${String(i + 1001).padStart(4, '0')}`,
    shipperName: pick(['Arjun Sharma', 'Priya Iyer', 'Rahul Mehta', 'Sunita Rao', 'Dev Kapoor']),
    shipperCompany: pick(['Sharma Exports', 'Mumbai Textiles', 'Delhi Traders', 'BLR Logistics', 'HYD Industries']),
    pickupLocation: { city: pickup.name, lat: pickup.lat, lng: pickup.lng },
    destination: { city: dest.name, lat: dest.lat, lng: dest.lng },
    weight,
    shipmentType: pick(SHIPMENT_TYPES),
    priority: pick(PRIORITIES),
    deadline: new Date(Date.now() + randInt(1, 7) * 86400000),
    estimatedPrice: price,
    distanceKm,
    status: pick(['pending', 'pending', 'pending', 'matched', 'in_transit', 'delivered']),
    matchScore: randInt(60, 98),
    co2Saved: +rand(10, 80).toFixed(1),
    emptyMilesReduced: randInt(20, 150)
  };
});

module.exports = { MOCK_TRUCKS, MOCK_SHIPMENTS, CITIES };
