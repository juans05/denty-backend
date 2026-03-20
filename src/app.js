const express = require('express');
const cors = require('cors');
const app = express();

// Middlewares
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins in development or if it's a localhost origin
    if (!origin || origin.indexOf('localhost') !== -1 || origin.indexOf('127.0.0.1') !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Still allow all for now while debugging
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dental System API is running' });
});

// Routes
const routes = require('./routes');
app.use('/api', routes);

// 404 catch-all - shows exactly what URL was not found
app.use((req, res) => {
  console.error(`[404 NOT FOUND] Method: ${req.method}, URL: ${req.originalUrl}`);
  res.status(404).json({
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    availableBase: '/api'
  });
});

module.exports = app;
