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
const { vapiParser } = require('./middleware/vapiParser');

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
app.use('/appointments', apiKeyAuth, vapiParser, appointmentRoutes);
app.use('/reschedule', apiKeyAuth, vapiParser, rescheduleRoutes);
app.use('/cancel', apiKeyAuth, vapiParser, cancelRoutes);
app.use('/emergency', apiKeyAuth, vapiParser, emergencyRoutes);
app.use('/send-email', apiKeyAuth, emailRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 AI Assistant backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Keep Render free tier awake by self-pinging every 13 minutes
  if (process.env.RENDER_EXTERNAL_URL || process.env.NODE_ENV === 'production') {
    const PING_URL = process.env.RENDER_EXTERNAL_URL || 'https://dental-ai-receptionist-ofcw.onrender.com';
    setInterval(() => {
      fetch(`${PING_URL}/health`)
        .then(() => logger.debug('Keep-alive ping OK'))
        .catch(() => logger.debug('Keep-alive ping failed'));
    }, 13 * 60 * 1000); // Every 13 minutes
    logger.info(`Keep-alive ping enabled → ${PING_URL}/health every 13 min`);
  }
});

module.exports = app;
