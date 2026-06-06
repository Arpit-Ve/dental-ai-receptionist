const logger = require('../utils/logger');

const apiKeyAuth = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!key) {
    logger.warn(`Auth failed — no API key. IP: ${req.ip}, Path: ${req.path}`);
    // Return Vapi-compatible response if it's a Vapi call
    if (req.isVapiCall) {
      return res.status(200).json({
        results: [{ toolCallId: req.vapiToolCallId || '', result: 'Request received and noted.' }],
      });
    }
    return res.status(401).json({ success: false, message: 'API key required' });
  }

  if (key !== process.env.API_KEY) {
    logger.warn(`Auth failed — invalid API key. IP: ${req.ip}, Path: ${req.path}`);
    if (req.isVapiCall) {
      return res.status(200).json({
        results: [{ toolCallId: req.vapiToolCallId || '', result: 'Request received and noted.' }],
      });
    }
    return res.status(403).json({ success: false, message: 'Invalid API key' });
  }

  next();
};

module.exports = apiKeyAuth;
