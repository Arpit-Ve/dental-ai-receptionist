const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');
const emailService = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');

// Store last request for debugging
let lastWebhookRequest = null;

// Debug endpoint to see last webhook request
router.get('/last-request', (req, res) => {
  res.json(lastWebhookRequest || { message: 'No webhook request received yet' });
});

// Debug endpoint to test sending email
router.get('/test-email', async (req, res) => {
  try {
    logger.info('[TEST-EMAIL] Triggering test email...');
    const result = await emailService.sendAppointmentEmails({
      patientName: 'Test Patient',
      email: 'vermaarpit627@gmail.com',
      patientType: 'new',
      reasonForVisit: 'Routine checkup testing email service',
      preferredDate: '2026-06-15',
      preferredTime: '10:00 AM'
    });
    res.json({ success: true, message: 'Emails sent successfully', result });
  } catch (err) {
    logger.error(`[TEST-EMAIL] Failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// Debug endpoint to check env configuration
router.get('/env-check', (req, res) => {
  const vars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'GMAIL_FROM_ADDRESS',
    'GMAIL_FROM_NAME',
    'STAFF_EMAIL',
    'STAFF_EMERGENCY_EMAIL',
    'GOOGLE_SPREADSHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];
  
  const status = {};
  vars.forEach(v => {
    const val = process.env[v];
    status[v] = {
      configured: !!val,
      length: val ? val.length : 0,
      prefix: val ? val.substring(0, 5) + '...' : null
    };
  });
  
  res.json({ success: true, env: status });
});

// ── Vapi webhook handler ───────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const body = req.body || {};
  const { message } = body;

  // ALWAYS log and store the raw request for debugging
  const bodyStr = JSON.stringify(body).substring(0, 3000);
  logger.info(`[WEBHOOK] Received: ${bodyStr}`);
  lastWebhookRequest = {
    timestamp: new Date().toISOString(),
    messageType: message?.type || 'NO_MESSAGE',
    bodyKeys: Object.keys(body),
    bodyPreview: bodyStr,
  };

  if (!message) {
    logger.warn('[WEBHOOK] No message in body');
    return res.status(200).json({ received: true });
  }

  logger.info(`[WEBHOOK] Type: ${message.type}`);

  switch (message.type) {
    // ── Format 1: tool-calls (new Vapi format) ─────────────────────────────
    case 'tool-calls': {
      const toolCallList = message.toolCallList || [];
      const results = [];

      for (const toolCall of toolCallList) {
        const id = toolCall.id || '';
        const name = toolCall.function?.name || toolCall.name || 'unknown';
        let args = toolCall.function?.arguments || toolCall.arguments || {};

        // Parse arguments if they are passed as a JSON string
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (e) {
            logger.error(`[TOOL-CALLS] Failed to parse arguments string: ${args}`);
            args = {};
          }
        }

        logger.info(`[TOOL-CALLS] Executing: ${name} | ID: ${id} | Args: ${JSON.stringify(args).substring(0, 200)}`);

        let result = '';
        try {
          result = await routeToolCall(name, args);
        } catch (err) {
          logger.error(`[TOOL-CALLS] ${name} error: ${err.message}`);
          result = 'Request noted. Arpit will follow up shortly.';
        }
        results.push({ toolCallId: id, result });
      }

      logger.info(`[TOOL-CALLS] Returning ${results.length} results`);
      return res.status(200).json({ results });
    }

    // ── Format 2: function-call (legacy Vapi format) ───────────────────────
    case 'function-call': {
      const fn = message.functionCall || {};
      const name = fn.name || 'unknown';
      let args = fn.parameters || {};
      const toolCallId = message.toolCallList?.[0]?.id || '';

      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch (e) {
          args = {};
        }
      }

      logger.info(`[FUNCTION-CALL] Executing: ${name} | ID: ${toolCallId}`);

      let result = '';
      try {
        result = await routeToolCall(name, args);
      } catch (err) {
        logger.error(`[FUNCTION-CALL] ${name} error: ${err.message}`);
        result = 'Request noted. Arpit will follow up shortly.';
      }

      // Return in Vapi's expected format
      return res.status(200).json({
        results: [{ toolCallId, result }],
      });
    }

    case 'call-started':
      logger.info(`Call started: ${message.call?.id}`);
      break;

    case 'call-ended': {
      const call = message.call;
      sheetsService.saveCallLog({
        callId: call?.id,
        callType: call?.endedReason || 'UNKNOWN',
        duration: call?.duration || 0,
        patientName: call?.metadata?.patientName || '',
        phone: call?.customer?.number || '',
        outcome: call?.endedReason || 'completed',
        summary: call?.summary || '',
      }).catch(err => logger.warn(`Call log save failed: ${err.message}`));
      break;
    }

    case 'transcript':
      logger.debug(`Transcript: ${message.transcript?.text}`);
      break;

    default:
      logger.info(`[WEBHOOK] Unhandled type: ${message.type} — full body: ${bodyStr}`);
  }

  res.status(200).json({ received: true });
});

// ── Route tool calls to handlers ──────────────────────────────────────────────
async function routeToolCall(name, args) {
  switch (name) {
    case 'bookAppointment':
      return await handleBookAppointment(args);
    case 'rescheduleAppointment':
      return await handleReschedule(args);
    case 'cancelAppointment':
      return await handleCancel(args);
    case 'handleEmergency':
      return await handleEmergency(args);
    default:
      logger.warn(`Unknown function: ${name}`);
      return `Function ${name} is not available.`;
  }
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleBookAppointment(data) {
  const requestId = uuidv4();
  logger.info(`[BOOK] ${data.patientName} | ${requestId}`);

  try {
    await sheetsService.saveAppointment({
      ...data,
      callSummary: `Appointment via AI. Reason: ${data.reasonForVisit || 'General'}`,
    });
  } catch (err) {
    logger.warn(`Sheet save failed: ${err.message}`);
  }

  try {
    emailService.sendAppointmentEmails(data).catch(e =>
      logger.warn(`Email failed: ${e.message}`)
    );
  } catch (err) { /* ignore */ }

  sheetsService.saveCallLog({
    callId: requestId,
    callType: 'APPOINTMENT',
    patientName: data.patientName,
    phone: data.phone,
    outcome: 'BOOKED',
    summary: `${data.patientType || 'new'} patient. Reason: ${data.reasonForVisit}. Date: ${data.preferredDate || 'Flexible'}`,
  }).catch(() => {});

  return `Appointment booked for ${data.patientName}. Date: ${data.preferredDate || 'Flexible'}, Time: ${data.preferredTime || 'Flexible'}. Confirmation pending.`;
}

async function handleReschedule(data) {
  try { await sheetsService.saveReschedule(data); } catch (e) { logger.warn(e.message); }
  return `Reschedule saved for ${data.patientName}. New date: ${data.newDate || 'Flexible'}.`;
}

async function handleCancel(data) {
  try { await sheetsService.saveCancellation(data); } catch (e) { logger.warn(e.message); }
  return `Cancellation recorded for ${data.patientName}.`;
}

async function handleEmergency(data) {
  logger.error(`EMERGENCY: ${data.patientName} | ${data.severity} | ${data.symptoms}`);
  try { await sheetsService.saveEmergency(data); } catch (e) { logger.warn(e.message); }
  try { emailService.sendEmergencyEmails(data).catch(() => {}); } catch (e) { /* ignore */ }
  return `Emergency recorded for ${data.patientName}. Severity: ${data.severity}. Staff notified.`;
}

module.exports = router;
