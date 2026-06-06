const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');
const emailService = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');

// ── Vapi webhook handler ───────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(200).json({ received: true });

  logger.info(`Vapi webhook: ${message.type}`);

  switch (message.type) {
    case 'tool-calls': {
      // Handle ALL tool calls from Vapi
      const toolCallList = message.toolCallList || [];
      const results = [];

      for (const toolCall of toolCallList) {
        const { id, name, arguments: args } = toolCall;
        logger.info(`Tool call: ${name} | ID: ${id} | Args: ${JSON.stringify(args).substring(0, 200)}`);

        let result = '';
        try {
          switch (name) {
            case 'bookAppointment':
              result = await handleBookAppointment(args);
              break;
            case 'rescheduleAppointment':
              result = await handleReschedule(args);
              break;
            case 'cancelAppointment':
              result = await handleCancel(args);
              break;
            case 'handleEmergency':
              result = await handleEmergency(args);
              break;
            default:
              result = `Unknown function: ${name}`;
          }
        } catch (err) {
          logger.error(`Tool ${name} error: ${err.message}`);
          result = 'Request noted. Arpit will follow up.';
        }

        results.push({ toolCallId: id, result });
      }

      logger.info(`Returning ${results.length} results`);
      return res.status(200).json({ results });
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
      logger.debug(`Unhandled Vapi event: ${message.type}`);
  }

  res.status(200).json({ received: true });
});

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleBookAppointment(data) {
  const requestId = uuidv4();
  logger.info(`[${requestId}] Booking: ${data.patientName}`);

  // Save to sheets (don't fail if this errors)
  try {
    await sheetsService.saveAppointment({
      ...data,
      callSummary: `Appointment via AI. Reason: ${data.reasonForVisit || 'General'}`,
    });
  } catch (err) {
    logger.warn(`Sheet save failed: ${err.message}`);
  }

  // Send emails (non-blocking)
  try {
    emailService.sendAppointmentEmails(data).catch(e => 
      logger.warn(`Email failed: ${e.message}`)
    );
  } catch (err) { /* ignore */ }

  // Log call
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
  logger.error(`🚨 EMERGENCY: ${data.patientName} | ${data.severity} | ${data.symptoms}`);
  try { await sheetsService.saveEmergency(data); } catch (e) { logger.warn(e.message); }
  try { emailService.sendEmergencyEmails(data).catch(() => {}); } catch (e) { /* ignore */ }
  return `Emergency recorded for ${data.patientName}. Severity: ${data.severity}. Staff notified.`;
}

module.exports = router;
