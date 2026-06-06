const logger = require('../utils/logger');

/**
 * Middleware to parse Vapi's tool-calls request format.
 * 
 * Vapi sends (from docs):
 * {
 *   "message": {
 *     "type": "tool-calls",
 *     "toolCallList": [{ "id": "...", "name": "...", "arguments": { ... } }]
 *   }
 * }
 *
 * Backend expects: req.body = { patientName, phone, ... }
 */
const vapiParser = (req, res, next) => {
  // Always mark as Vapi call since these endpoints are only called by Vapi
  req.isVapiCall = true;
  req.vapiToolCallId = '';
  
  const body = req.body || {};
  
  // Log for debugging
  logger.info(`[VapiParser] Path: ${req.path} | Body keys: ${JSON.stringify(Object.keys(body))}`);
  
  // PRIMARY FORMAT: message.toolCallList (from Vapi docs)
  if (body.message?.toolCallList?.[0]) {
    const toolCall = body.message.toolCallList[0];
    req.vapiToolCallId = toolCall.id || '';
    
    // Arguments can be in toolCall.function.arguments or toolCall.arguments
    let params = toolCall.function?.arguments || toolCall.arguments;
    
    // Parse arguments if they are passed as a JSON string
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params);
      } catch (e) {
        logger.error(`[VapiParser] Failed to parse arguments string: ${params}`);
        params = null;
      }
    }
    
    // Or in toolWithToolCallList[0].toolCall.function.parameters
    if (!params && body.message?.toolWithToolCallList?.[0]?.toolCall?.function?.parameters) {
      params = body.message.toolWithToolCallList[0].toolCall.function.parameters;
    }
    
    if (params && typeof params === 'object') {
      const toolName = toolCall.function?.name || toolCall.name || 'unknown';
      logger.info(`[VapiParser] ✅ Extracted from toolCallList — Tool: ${toolName} | ID: ${req.vapiToolCallId} | Params: ${JSON.stringify(params).substring(0, 200)}`);
      req.vapiOriginalBody = body;
      req.body = params;
    } else {
      const toolName = toolCall.function?.name || toolCall.name || 'unknown';
      logger.warn(`[VapiParser] ⚠️ toolCallList found but no arguments — Tool: ${toolName}`);
    }
  }
  // FALLBACK: message.functionCall.parameters (older format)
  else if (body.message?.functionCall?.parameters) {
    const params = body.message.functionCall.parameters;
    req.vapiToolCallId = body.message.toolCallList?.[0]?.id || 
                         body.message.toolCallId || '';
    
    logger.info(`[VapiParser] ✅ Extracted from functionCall — Tool: ${body.message.functionCall.name} | ID: ${req.vapiToolCallId}`);
    req.vapiOriginalBody = body;
    req.body = params;
  }
  // DIRECT: parameters sent directly in body (no message wrapper)
  else {
    logger.info(`[VapiParser] Direct params — Body preview: ${JSON.stringify(body).substring(0, 300)}`);
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
  logger.info(`[VapiResponse] toolCallId: ${req.vapiToolCallId} | result: ${response.results[0].result.substring(0, 100)}`);
  return res.status(200).json(response);
};

module.exports = { vapiParser, vapiResponse };
