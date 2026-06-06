const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');
const emailService = require('../services/emailService');
const { vapiResponse } = require('../middleware/vapiParser');

const bookAppointment = async (req, res) => {
  const requestId = uuidv4();
  const data = req.body;

  logger.info(`[${requestId}] Appointment booking — ${data.patientName}`);

  // 1. Save to Google Sheets
  await sheetsService.saveAppointment({
    ...data,
    callSummary: data.callSummary || `Appointment request via AI receptionist. Reason: ${data.reasonForVisit}`,
  });

  // 2. Send emails (non-blocking — don't fail appointment if email fails)
  emailService.sendAppointmentEmails(data).then((results) => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.warn(`[${requestId}] Email ${i} failed: ${r.reason?.message}`);
      }
    });
  });

  // 3. Log call
  sheetsService.saveCallLog({
    callId: data.callId || requestId,
    callType: 'APPOINTMENT',
    duration: data.callDuration || 0,
    patientName: data.patientName,
    phone: data.phone,
    outcome: 'BOOKED',
    summary: `New ${data.patientType} patient. Reason: ${data.reasonForVisit}. Preferred: ${data.preferredDate || 'Flexible'} ${data.preferredTime || ''}`,
  }).catch(err => logger.warn(`Call log failed: ${err.message}`));

  // Return Vapi-compatible response if it's a Vapi call
  if (req.isVapiCall) {
    return vapiResponse(req, res, {
      message: `Appointment booked successfully for ${data.patientName}. Date: ${data.preferredDate || 'Flexible'}, Time: ${data.preferredTime || 'Flexible'}. Confirmation pending.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Appointment request saved successfully',
    requestId,
    data: {
      patientName: data.patientName,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      status: 'PENDING_CONFIRMATION',
    },
  });
};

module.exports = { bookAppointment };
