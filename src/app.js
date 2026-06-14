require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const logger  = require('./middleware/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route modules
const truckRoutes    = require('./routes/trucks');
const shipmentRoutes = require('./routes/shipments');
const aiRoutes       = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(logger);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EcoFleet AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/trucks',     truckRoutes);
app.use('/api/shipments',  shipmentRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/analytics',  analyticsRoutes);

// Analytics sub-routes (mounted at /api for convenience)
app.use('/api',            analyticsRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
