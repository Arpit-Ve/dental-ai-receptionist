const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const logger = require('../utils/logger');

// ── OAuth2 transporter ────────────────────────────────────────────────────────

const getTransporter = async () => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const { token: accessToken } = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_FROM_ADDRESS,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  });
};

// ── Email templates ───────────────────────────────────────────────────────────

const patientConfirmationHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Georgia', serif; background: #f8f9fa; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a5276; color: #fff; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 400; letter-spacing: 1px; }
    .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.85; }
    .badge { background: #27ae60; color: white; display: inline-block; padding: 6px 20px; border-radius: 20px; font-size: 13px; margin: 24px 0 0; }
    .body { padding: 40px; }
    .body h2 { color: #1a5276; font-size: 20px; margin-bottom: 6px; }
    .body p { line-height: 1.7; color: #555; }
    .details-box { background: #f0f4f8; border-left: 4px solid #1a5276; border-radius: 6px; padding: 24px 28px; margin: 28px 0; }
    .details-box table { width: 100%; border-collapse: collapse; }
    .details-box td { padding: 7px 0; font-size: 14px; vertical-align: top; }
    .details-box td:first-child { color: #666; width: 150px; font-weight: 600; }
    .details-box td:last-child { color: #222; }
    .cta { text-align: center; margin: 32px 0; }
    .cta a { background: #1a5276; color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; display: inline-block; }
    .footer { background: #f0f4f8; padding: 24px 40px; text-align: center; font-size: 12px; color: #888; }
    .footer a { color: #1a5276; text-decoration: none; }
    .emergency-note { background: #fdf3cd; border: 1px solid #f0c040; border-radius: 6px; padding: 16px 20px; font-size: 13px; margin-top: 20px; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>California Dental Specialty Group</h1>
    <p>500 E Remington Dr Suite 19, Sunnyvale, CA 94087</p>
    <div class="badge">✓ Appointment Request Received</div>
  </div>

  <div class="body">
    <h2>Hello, ${data.patientName}!</h2>
    <p>Thank you for contacting us. Your appointment request has been received and our team will confirm your appointment within 1 business day.</p>

    <div class="details-box">
      <table>
        <tr><td>Patient Name</td><td>${data.patientName}</td></tr>
        <tr><td>Patient Type</td><td>${data.patientType === 'new' ? '🆕 New Patient' : '✅ Existing Patient'}</td></tr>
        <tr><td>Reason for Visit</td><td>${data.reasonForVisit}</td></tr>
        ${data.preferredDate ? `<tr><td>Preferred Date</td><td>${data.preferredDate}</td></tr>` : ''}
        ${data.preferredTime ? `<tr><td>Preferred Time</td><td>${data.preferredTime}</td></tr>` : ''}
        ${data.insurance ? `<tr><td>Insurance</td><td>${data.insurance}</td></tr>` : ''}
        <tr><td>Status</td><td>🟡 Pending Confirmation</td></tr>
      </table>
    </div>

    <div class="emergency-note">
      <strong>⚠️ Dental Emergency?</strong> If you are experiencing severe pain, swelling, or trauma, please call us immediately at <a href="tel:+14087499888"><strong>+1 408-749-9888</strong></a> or visit your nearest emergency room.
    </div>

    <div class="cta">
      <a href="${process.env.CLINIC_WEBSITE}">Visit Our Website</a>
    </div>

    <p>If you have any questions, reply to this email or call us at <strong>+1 408-749-9888</strong>.</p>
    <p>We look forward to seeing you soon!</p>
    <p><em>— Sarah & the California Dental Specialty Group Team</em></p>
  </div>

  <div class="footer">
    <p><a href="${process.env.CLINIC_WEBSITE}">sunnyvaledentalspecialty.com</a> · +1 408-749-9888</p>
    <p>500 E Remington Dr Suite 19, Sunnyvale, CA 94087</p>
    <p style="font-size:10px;margin-top:8px;">This message contains protected health information. If received in error, please delete and notify us immediately.</p>
  </div>
</div>
</body>
</html>
`;

const staffNotificationHTML = (data, callType) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: ${callType === 'EMERGENCY' ? '#c0392b' : '#2c3e50'}; color: white; padding: 20px 30px; }
    .header h1 { margin: 0; font-size: 18px; }
    .body { padding: 30px; }
    .priority { display: inline-block; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold;
      background: ${callType === 'EMERGENCY' ? '#e74c3c' : '#3498db'}; color: white; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    td:first-child { font-weight: bold; color: #555; width: 160px; }
    .action-needed { background: #fff3cd; border-left: 4px solid #f0ad4e; padding: 12px 16px; border-radius: 4px; margin-top: 20px; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${callType === 'EMERGENCY' ? '🚨 EMERGENCY CALL RECEIVED' : `📋 New ${callType} Request — Action Required`}</h1>
    <p style="margin:4px 0 0;font-size:13px;opacity:.8;">${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</p>
  </div>
  <div class="body">
    <div class="priority">${callType === 'EMERGENCY' ? '🔴 URGENT' : '🔵 NORMAL'} — ${callType}</div>
    <table>
      <tr><td>Patient Name</td><td>${data.patientName}</td></tr>
      <tr><td>Phone</td><td>${data.phone}</td></tr>
      ${data.email ? `<tr><td>Email</td><td>${data.email}</td></tr>` : ''}
      ${data.dob ? `<tr><td>Date of Birth</td><td>${data.dob}</td></tr>` : ''}
      ${data.patientType ? `<tr><td>Patient Type</td><td>${data.patientType}</td></tr>` : ''}
      ${data.insurance ? `<tr><td>Insurance</td><td>${data.insurance}</td></tr>` : ''}
      ${data.reasonForVisit ? `<tr><td>Reason</td><td>${data.reasonForVisit}</td></tr>` : ''}
      ${data.symptoms ? `<tr><td>Symptoms</td><td>${data.symptoms}</td></tr>` : ''}
      ${data.severity ? `<tr><td>Severity</td><td>${data.severity.toUpperCase()}</td></tr>` : ''}
      ${data.preferredDate ? `<tr><td>Preferred Date</td><td>${data.preferredDate}</td></tr>` : ''}
      ${data.preferredTime ? `<tr><td>Preferred Time</td><td>${data.preferredTime}</td></tr>` : ''}
      ${data.existingDate ? `<tr><td>Existing Appt Date</td><td>${data.existingDate}</td></tr>` : ''}
      ${data.newDate ? `<tr><td>New Preferred Date</td><td>${data.newDate}</td></tr>` : ''}
      ${data.appointmentDate ? `<tr><td>Appointment Date</td><td>${data.appointmentDate}</td></tr>` : ''}
      ${data.notes ? `<tr><td>Notes</td><td>${data.notes}</td></tr>` : ''}
    </table>
    <div class="action-needed">
      <strong>Action Required:</strong> ${callType === 'EMERGENCY'
        ? 'Contact patient IMMEDIATELY and arrange emergency care.'
        : 'Review this request and confirm via your scheduling system.'}
    </div>
  </div>
</div>
</body>
</html>
`;

const rescheduleConfirmHTML = (data) => `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;">
  <h2 style="color:#1a5276;">Reschedule Request Received</h2>
  <p>Hello ${data.patientName},</p>
  <p>We've received your request to reschedule your appointment. Our team will confirm the new time shortly.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px 0;color:#666;font-weight:bold;width:150px;">Previous Date</td><td>${data.existingDate || 'On File'}</td></tr>
    <tr><td style="padding:8px 0;color:#666;font-weight:bold;">Requested Date</td><td>${data.newDate || 'Flexible'}</td></tr>
    <tr><td style="padding:8px 0;color:#666;font-weight:bold;">Requested Time</td><td>${data.newTime || 'Flexible'}</td></tr>
  </table>
  <p>Questions? Call us: <strong>+1 408-749-9888</strong></p>
  <p><em>— California Dental Specialty Group</em></p>
</div>`;

const cancellationConfirmHTML = (data) => `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;">
  <h2 style="color:#1a5276;">Appointment Cancellation Confirmed</h2>
  <p>Hello ${data.patientName},</p>
  <p>Your appointment on <strong>${data.appointmentDate || 'the scheduled date'}</strong> has been cancelled as requested.</p>
  <p>We'd love to help you schedule a new appointment when you're ready. Call us at <strong>+1 408-749-9888</strong>.</p>
  <p><em>— California Dental Specialty Group</em></p>
</div>`;

// ── Send email function ───────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME}" <${process.env.GMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent → ${to} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Email send failed → ${to}: ${err.message}`);
    throw new Error(`Email failed: ${err.message}`);
  }
};

// ── High-level email workflows ────────────────────────────────────────────────

const sendAppointmentEmails = async (data) => {
  const results = await Promise.allSettled([
    // Patient confirmation
    sendEmail({
      to: data.email,
      subject: 'Appointment Request Received — California Dental Specialty Group',
      html: patientConfirmationHTML(data),
    }),
    // Staff notification
    sendEmail({
      to: process.env.STAFF_EMAIL,
      subject: `[New Appointment] ${data.patientName} — ${data.preferredDate || 'Flexible'}`,
      html: staffNotificationHTML(data, 'APPOINTMENT'),
    }),
  ]);
  return results;
};

const sendRescheduleEmails = async (data) => {
  const results = await Promise.allSettled([
    sendEmail({
      to: data.email,
      subject: 'Reschedule Request Received — California Dental Specialty Group',
      html: rescheduleConfirmHTML(data),
    }),
    sendEmail({
      to: process.env.STAFF_EMAIL,
      subject: `[Reschedule] ${data.patientName} → ${data.newDate || 'Flexible'}`,
      html: staffNotificationHTML(data, 'RESCHEDULE'),
    }),
  ]);
  return results;
};

const sendCancellationEmails = async (data) => {
  const results = await Promise.allSettled([
    sendEmail({
      to: data.email,
      subject: 'Appointment Cancellation — California Dental Specialty Group',
      html: cancellationConfirmHTML(data),
    }),
    sendEmail({
      to: process.env.STAFF_EMAIL,
      subject: `[Cancellation] ${data.patientName} — ${data.appointmentDate || 'Unknown Date'}`,
      html: staffNotificationHTML(data, 'CANCELLATION'),
    }),
  ]);
  return results;
};

const sendEmergencyEmails = async (data) => {
  const results = await Promise.allSettled([
    sendEmail({
      to: process.env.STAFF_EMERGENCY_EMAIL,
      subject: `🚨 EMERGENCY — ${data.patientName} | ${data.severity?.toUpperCase()} | CALL NOW`,
      html: staffNotificationHTML(data, 'EMERGENCY'),
    }),
    sendEmail({
      to: process.env.STAFF_EMAIL,
      subject: `🚨 EMERGENCY — ${data.patientName} | ${data.severity?.toUpperCase()}`,
      html: staffNotificationHTML(data, 'EMERGENCY'),
    }),
  ]);
  return results;
};

module.exports = {
  sendEmail,
  sendAppointmentEmails,
  sendRescheduleEmails,
  sendCancellationEmails,
  sendEmergencyEmails,
};
