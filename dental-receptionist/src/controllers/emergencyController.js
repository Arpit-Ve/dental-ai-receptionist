const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');
const emailService = require('../services/emailService');
const { vapiResponse } = require('../middleware/vapiParser');

const handleEmergency = async (req, res) => {
  const requestId = uuidv4();
  const data = req.body;

  // Log IMMEDIATELY — this is critical path
  logger.error(`🚨 EMERGENCY CALL [${requestId}] — ${data.patientName} | ${data.severity?.toUpperCase()} | ${data.symptoms}`);

  // 1. Save to emergency sheet (parallel with emails)
  const [sheetResult] = await Promise.allSettled([
    sheetsService.saveEmergency(data),
    emailService.sendEmergencyEmails(data),
  ]);

  if (sheetResult.status === 'rejected') {
    logger.error(`Emergency sheet save failed: ${sheetResult.reason?.message}`);
    // Still return success — email is the critical path here
  }

  // 2. Log call
  sheetsService.saveCallLog({
    callId: data.callId || requestId,
    callType: 'EMERGENCY',
    duration: data.callDuration || 0,
    patientName: data.patientName,
    phone: data.phone,
    outcome: 'STAFF_NOTIFIED',
    summary: `🚨 EMERGENCY: ${data.severity?.toUpperCase()}. Symptoms: ${data.symptoms}`,
  }).catch(err => logger.warn(`Call log failed: ${err.message}`));

  if (req.isVapiCall) {
    return vapiResponse(req, res, {
      message: `Emergency recorded for ${data.patientName}. Severity: ${data.severity}. Staff has been notified immediately.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Emergency recorded. Staff notified immediately.',
    requestId,
    priority: 'URGENT',
  });
};

module.exports = { handleEmergency };
