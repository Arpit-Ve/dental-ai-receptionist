const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.ip} → ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  },
  skip: (req) => req.path === '/health', // never rate-limit health check
});

module.exports = rateLimiter;
