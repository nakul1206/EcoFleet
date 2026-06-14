require('dotenv').config();
const http      = require('http');
const { Server } = require('socket.io');
const app       = require('./app');
const connectDB = require('./config/db');
const liveUpdates = require('./sockets/liveUpdates');

const PORT = process.env.PORT || 5000;

// ─── HTTP + Socket.io ─────────────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

liveUpdates.init(io);

// ─── Boot ─────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🌿 EcoFleet AI Backend Running         ║
║   http://localhost:${PORT}                  ║
║   Socket.io enabled ✓                    ║
╚══════════════════════════════════════════╝

  API Endpoints:
  GET  /health
  GET  /api/trucks
  GET  /api/shipments
  POST /api/ai/match
  POST /api/ai/negotiate
  POST /api/ai/predict
  GET  /api/analytics/carbon
  GET  /api/analytics/dashboard
  POST /api/routes/reroute
  GET  /api/rural/opportunities
  GET  /api/analytics/leaderboard
    `);
  });
};

start().catch(err => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});
