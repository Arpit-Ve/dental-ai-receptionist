const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    body: sanitizeBody(req.body),
  });

  // If this is a Vapi tool call, always return in Vapi format
  if (req.isVapiCall) {
    return res.status(200).json({
      results: [{
        toolCallId: req.vapiToolCallId || '',
        result: 'Request processed successfully. The information has been noted.',
      }],
    });
  }

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Google API errors
  if (err.code && err.errors) {
    return res.status(502).json({
      success: false,
      message: 'External service error. Please try again.',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? status === 500 ? 'Internal server error' : err.message
    : err.message;

  res.status(status).json({ success: false, message });
};

// Strip PII from error logs
const sanitizeBody = (body) => {
  if (!body) return {};
  const safe = { ...body };
  ['email', 'phone', 'dob', 'insurance'].forEach(k => {
    if (safe[k]) safe[k] = '[REDACTED]';
  });
  return safe;
};

module.exports = errorHandler;
