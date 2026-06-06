const logger = require('../utils/logger');

/**
 * Middleware to parse Vapi's tool call format.
 * Vapi sends: { message: { functionCall: { parameters: { ... } } } }
 * Backend expects: req.body = { patientName, phone, ... }
 * This middleware extracts the parameters and flattens them into req.body.
 */
const vapiParser = (req, res, next) => {
  // Check if this is a Vapi tool call format
  if (req.body?.message?.functionCall?.parameters) {
    const params = req.body.message.functionCall.parameters;
    const toolCallId = req.body.message?.toolCallList?.[0]?.id || 
                       req.body.message?.toolCallId || '';
    
    logger.info(`Vapi tool call: ${req.body.message.functionCall.name} | ID: ${toolCallId}`);
    
    // Store original body and toolCallId for response formatting
    req.vapiOriginalBody = req.body;
    req.vapiToolCallId = toolCallId;
    req.isVapiCall = true;
    
    // Flatten parameters into req.body
    req.body = params;
  }
  
  next();
};

/**
 * Wraps response in Vapi's expected format.
 * Vapi expects: { results: [{ toolCallId: "...", result: "..." }] }
 */
const vapiResponse = (req, res, data) => {
  if (req.isVapiCall) {
    return res.status(200).json({
      results: [{
        toolCallId: req.vapiToolCallId || '',
        result: data.message || 'Request processed successfully',
      }],
    });
  }
  // Normal API response
  return res.status(data.statusCode || 200).json(data);
};

module.exports = { vapiParser, vapiResponse };
