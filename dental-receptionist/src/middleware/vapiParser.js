const logger = require('../utils/logger');

/**
 * Middleware to parse Vapi's tool call format.
 * Vapi may send data in multiple formats depending on tool config.
 * This middleware handles all cases.
 */
const vapiParser = (req, res, next) => {
  // Log the raw request for debugging
  logger.info(`[VapiParser] Path: ${req.path} | Headers: ${JSON.stringify({
    'x-vapi-signature': req.headers['x-vapi-signature'] || 'none',
    'content-type': req.headers['content-type'] || 'none',
  })}`);
  logger.info(`[VapiParser] Body keys: ${JSON.stringify(Object.keys(req.body || {}))}`);
  
  // Always mark as Vapi call since these endpoints are only called by Vapi
  req.isVapiCall = true;
  req.vapiToolCallId = '';
  
  // Format 1: Vapi wraps in message.functionCall.parameters
  if (req.body?.message?.functionCall?.parameters) {
    const params = req.body.message.functionCall.parameters;
    req.vapiToolCallId = req.body.message?.toolCallList?.[0]?.id || 
                         req.body.message?.toolCallId || '';
    
    logger.info(`[VapiParser] Format 1 (message wrapped) — Tool: ${req.body.message.functionCall.name} | ToolCallId: ${req.vapiToolCallId}`);
    
    req.vapiOriginalBody = req.body;
    req.body = params;
  }
  // Format 2: Vapi sends toolCallList at top level
  else if (req.body?.toolCallList) {
    const toolCall = req.body.toolCallList[0];
    req.vapiToolCallId = toolCall?.id || '';
    const args = toolCall?.function?.arguments;
    
    if (typeof args === 'string') {
      try { req.body = JSON.parse(args); } catch(e) { /* keep original */ }
    } else if (args && typeof args === 'object') {
      req.body = args;
    }
    
    logger.info(`[VapiParser] Format 2 (toolCallList) — ToolCallId: ${req.vapiToolCallId}`);
  }
  // Format 3: Direct parameters (no wrapping)
  else {
    logger.info(`[VapiParser] Format 3 (direct params) — Body: ${JSON.stringify(req.body).substring(0, 200)}`);
  }
  
  next();
};

/**
 * Wraps response in Vapi's expected format.
 * MUST return HTTP 200 with results array.
 */
const vapiResponse = (req, res, data) => {
  const response = {
    results: [{
      toolCallId: req.vapiToolCallId || '',
      result: typeof data.message === 'string' ? data.message : JSON.stringify(data.message || 'Done'),
    }],
  };
  logger.info(`[VapiResponse] Sending: ${JSON.stringify(response)}`);
  return res.status(200).json(response);
};

module.exports = { vapiParser, vapiResponse };
