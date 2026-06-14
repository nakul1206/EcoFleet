/**
 * Socket.io — EcoFleet AI Live Updates
 * Broadcasts: truck positions, new matches, alerts, KPI ticks
 */

const { MOCK_TRUCKS, CITIES } = require('../mock-data/mockData');

let io;

const TRUCK_EVENTS = [
  (truck) => `🚛 ${truck.driverName} accepted a new shipment to ${truck.destination.city}`,
  (truck) => `📦 New load matched for ${truck.truckId} — ${(Math.random() * 5 + 1).toFixed(1)}T`,
  (truck) => `✅ Delivery completed by ${truck.driverName} — rating update pending`,
  (truck) => `⚡ AI optimised route for ${truck.truckId} — saved 2.3L fuel`,
  (truck) => `🔔 ${truck.driverName} is approaching pickup point`,
];

const ALERT_EVENTS = [
  { type: 'warning',  message: 'High empty-mile risk detected on Delhi–Lucknow corridor' },
  { type: 'success',  message: 'New rural opportunity: 9.5T Litchi harvest in Muzaffarpur' },
  { type: 'info',     message: 'AI matched 3 trucks for Hyderabad → Chennai route' },
  { type: 'warning',  message: 'Flood alert on NH44 — rerouting active shipments' },
  { type: 'success',  message: 'CO₂ milestone: 500kg saved this session!' },
];

function init(socketIo) {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Send initial state
    socket.emit('init', {
      trucks: MOCK_TRUCKS.slice(0, 5).map(t => ({
        id: t.truckId, lat: t.currentLocation.lat, lng: t.currentLocation.lng,
        driver: t.driverName, status: t.status
      }))
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });

    socket.on('request:match', (data) => {
      // Client can trigger a live match — broadcast result
      socket.emit('match:result', {
        matchScore: Math.floor(Math.random() * 20 + 78),
        message: 'AI match complete'
      });
    });
  });

  // Simulate live truck movement every 6s
  setInterval(() => {
    if (io.engine.clientsCount === 0) return;
    const truck = MOCK_TRUCKS[Math.floor(Math.random() * MOCK_TRUCKS.length)];
    io.emit('truck:move', {
      truckId: truck.truckId,
      lat:     +(truck.currentLocation.lat + (Math.random() - 0.5) * 0.03).toFixed(4),
      lng:     +(truck.currentLocation.lng + (Math.random() - 0.5) * 0.03).toFixed(4),
      driver:  truck.driverName
    });
  }, 6000);

  // Broadcast activity events every 4s
  let actIdx = 0;
  setInterval(() => {
    if (io.engine.clientsCount === 0) return;
    const truck = MOCK_TRUCKS[actIdx % MOCK_TRUCKS.length];
    const msg   = TRUCK_EVENTS[actIdx % TRUCK_EVENTS.length](truck);
    io.emit('activity', { message: msg, time: new Date().toISOString() });
    actIdx++;
  }, 4000);

  // Broadcast alerts every 12s
  let alertIdx = 0;
  setInterval(() => {
    if (io.engine.clientsCount === 0) return;
    const alert = ALERT_EVENTS[alertIdx % ALERT_EVENTS.length];
    io.emit('alert', { ...alert, time: new Date().toISOString() });
    alertIdx++;
  }, 12000);

  // KPI tick every 8s
  setInterval(() => {
    if (io.engine.clientsCount === 0) return;
    io.emit('kpi:update', {
      activeTrucks:    Math.floor(Math.random() * 5 + 12),
      co2SavedKg:      +(Math.random() * 2 + 0.5).toFixed(1),
      emptyMilesReduced: Math.floor(Math.random() * 8 + 2)
    });
  }, 8000);
}

const broadcast = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = { init, broadcast };
