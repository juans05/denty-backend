const express = require('express');
const cors = require('cors');
const app = express();

// Middlewares
app.use(cors());
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
