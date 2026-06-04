const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');
const emailService = require('../services/emailService');

const rescheduleAppointment = async (req, res) => {
  const requestId = uuidv4();
  const data = req.body;

  logger.info(`[${requestId}] Reschedule — ${data.patientName}`);

  await sheetsService.saveReschedule(data);

  if (data.email) {
    emailService.sendRescheduleEmails(data).catch(err =>
      logger.warn(`[${requestId}] Reschedule email failed: ${err.message}`)
    );
  } else {
    // Staff only
    emailService.sendEmail({
      to: process.env.STAFF_EMAIL,
      subject: `[Reschedule] ${data.patientName} → ${data.newDate || 'Flexible'}`,
      html: `<p>Reschedule request from <strong>${data.patientName}</strong> (${data.phone}).</p>
             <p>Old: ${data.existingDate || 'On file'} → New: ${data.newDate || 'Flexible'} ${data.newTime || ''}</p>`,
    }).catch(err => logger.warn(`Staff email failed: ${err.message}`));
  }

  sheetsService.saveCallLog({
    callId: data.callId || requestId,
    callType: 'RESCHEDULE',
    duration: data.callDuration || 0,
    patientName: data.patientName,
    phone: data.phone,
    outcome: 'RESCHEDULED',
    summary: `Reschedule from ${data.existingDate} to ${data.newDate} ${data.newTime}`,
  }).catch(err => logger.warn(`Call log failed: ${err.message}`));

  return res.status(200).json({
    success: true,
    message: 'Reschedule request saved',
    requestId,
  });
};

module.exports = { rescheduleAppointment };
