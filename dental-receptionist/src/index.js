require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const apiKeyAuth = require('./middleware/apiKeyAuth');

const appointmentRoutes = require('./routes/appointments');
const rescheduleRoutes = require('./routes/reschedule');
const cancelRoutes = require('./routes/cancel');
const emergencyRoutes = require('./routes/emergency');
const emailRoutes = require('./routes/email');
const healthRoutes = require('./routes/health');
const vapiRoutes = require('./routes/vapi');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://api.vapi.ai', 'https://sunnyvaledentalspecialty.com']
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);                        // public
app.use('/vapi', vapiRoutes);                            // Vapi webhook (own auth)
app.use('/appointments', apiKeyAuth, appointmentRoutes);
app.use('/reschedule', apiKeyAuth, rescheduleRoutes);
app.use('/cancel', apiKeyAuth, cancelRoutes);
app.use('/emergency', apiKeyAuth, emergencyRoutes);
app.use('/send-email', apiKeyAuth, emailRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🦷 Dental AI Receptionist backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
