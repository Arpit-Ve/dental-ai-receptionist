const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const sendCustomEmail = async (req, res) => {
  const { to, subject, body } = req.body;

  logger.info(`Custom email → ${to}`);

  await emailService.sendEmail({ to, subject, html: body });

  return res.status(200).json({ success: true, message: 'Email sent' });
};

module.exports = { sendCustomEmail };
