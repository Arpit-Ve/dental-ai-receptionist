const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');
const emailService = require('../services/emailService');
const { vapiResponse } = require('../middleware/vapiParser');

const cancelAppointment = async (req, res) => {
  const requestId = uuidv4();
  const data = req.body;

  logger.info(`[${requestId}] Cancellation — ${data.patientName}`);

  await sheetsService.saveCancellation(data);

  if (data.email) {
    emailService.sendCancellationEmails(data).catch(err =>
      logger.warn(`[${requestId}] Cancel email failed: ${err.message}`)
    );
  } else {
    emailService.sendEmail({
      to: process.env.STAFF_EMAIL,
      subject: `[Cancellation] ${data.patientName} — ${data.appointmentDate || 'Unknown Date'}`,
      html: `<p><strong>${data.patientName}</strong> (${data.phone}) cancelled their appointment on <strong>${data.appointmentDate || 'unknown date'}</strong>.</p>
             ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}`,
    }).catch(err => logger.warn(`Staff email failed: ${err.message}`));
  }

  sheetsService.saveCallLog({
    callId: data.callId || requestId,
    callType: 'CANCELLATION',
    duration: data.callDuration || 0,
    patientName: data.patientName,
    phone: data.phone,
    outcome: 'CANCELLED',
    summary: `Appointment on ${data.appointmentDate} cancelled. Reason: ${data.reason || 'Not provided'}`,
  }).catch(err => logger.warn(`Call log failed: ${err.message}`));

  if (req.isVapiCall) {
    return vapiResponse(req, res, {
      message: `Cancellation recorded for ${data.patientName}. Appointment on ${data.appointmentDate || 'scheduled date'} has been cancelled.`,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Cancellation recorded',
    requestId,
  });
};

module.exports = { cancelAppointment };
