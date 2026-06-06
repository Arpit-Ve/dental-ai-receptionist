const { google } = require('googleapis');
const logger = require('../utils/logger');

// ── OAuth2 Gmail Client ───────────────────────────────────────────────────────

const getGmailClient = async () => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({ version: 'v1', auth: oAuth2Client });
};

// ── Email templates ───────────────────────────────────────────────────────────

const patientConfirmationHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Arial', sans-serif; background: #f8f9fa; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #2c3e50; color: #fff; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 400; letter-spacing: 1px; }
    .badge { background: #27ae60; color: white; display: inline-block; padding: 6px 20px; border-radius: 20px; font-size: 13px; margin: 24px 0 0; }
    .body { padding: 40px; }
    .body h2 { color: #2c3e50; font-size: 20px; margin-bottom: 6px; }
    .body p { line-height: 1.7; color: #555; }
    .details-box { background: #f0f4f8; border-left: 4px solid #2c3e50; border-radius: 6px; padding: 24px 28px; margin: 28px 0; }
    .details-box table { width: 100%; border-collapse: collapse; }
    .details-box td { padding: 7px 0; font-size: 14px; vertical-align: top; }
    .details-box td:first-child { color: #666; width: 150px; font-weight: 600; }
    .details-box td:last-child { color: #222; }
    .footer { background: #f0f4f8; padding: 24px 40px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Arpit Verma</h1>
    <div class="badge">✓ Appointment Request Received</div>
  </div>

  <div class="body">
    <h2>Hello, ${data.patientName}!</h2>
    <p>Thank you for reaching out. Your appointment request has been received and will be confirmed shortly.</p>

    <div class="details-box">
      <table>
        <tr><td>Name</td><td>${data.patientName}</td></tr>
        <tr><td>Type</td><td>${data.patientType === 'new' ? '🆕 New' : '✅ Returning'}</td></tr>
        <tr><td>Reason</td><td>${data.reasonForVisit}</td></tr>
        ${data.preferredDate ? `<tr><td>Preferred Date</td><td>${data.preferredDate}</td></tr>` : ''}
        ${data.preferredTime ? `<tr><td>Preferred Time</td><td>${data.preferredTime}</td></tr>` : ''}
        <tr><td>Status</td><td>🟡 Pending Confirmation</td></tr>
      </table>
    </div>

    <p>If you have any questions, reply to this email or call <strong>+91 7982892220</strong>.</p>
    <p><em>— Arpit Verma's Assistant</em></p>
  </div>

  <div class="footer">
    <p>+91 7982892220 · vermaarpit627@gmail.com</p>
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
  <h2 style="color:#2c3e50;">Reschedule Request Received</h2>
  <p>Hello ${data.patientName},</p>
  <p>Your reschedule request has been received. It will be confirmed shortly.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px 0;color:#666;font-weight:bold;width:150px;">Previous Date</td><td>${data.existingDate || 'On File'}</td></tr>
    <tr><td style="padding:8px 0;color:#666;font-weight:bold;">Requested Date</td><td>${data.newDate || 'Flexible'}</td></tr>
    <tr><td style="padding:8px 0;color:#666;font-weight:bold;">Requested Time</td><td>${data.newTime || 'Flexible'}</td></tr>
  </table>
  <p>Questions? Call: <strong>+91 7982892220</strong></p>
  <p><em>— Arpit Verma's Assistant</em></p>
</div>`;

const cancellationConfirmHTML = (data) => `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;">
  <h2 style="color:#2c3e50;">Appointment Cancellation Confirmed</h2>
  <p>Hello ${data.patientName},</p>
  <p>Your appointment on <strong>${data.appointmentDate || 'the scheduled date'}</strong> has been cancelled as requested.</p>
  <p>Want to reschedule? Call <strong>+91 7982892220</strong>.</p>
  <p><em>— Arpit Verma's Assistant</em></p>
</div>`;

// ── Send email function ───────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to) {
      throw new Error('No recipient email address provided.');
    }

    const gmail = await getGmailClient();
    
    // Construct the MIME message
    const fromName = process.env.GMAIL_FROM_NAME || 'AI Assistant';
    const fromAddress = process.env.GMAIL_FROM_ADDRESS;
    
    if (!fromAddress) {
      throw new Error('GMAIL_FROM_ADDRESS environment variable is not set.');
    }

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: "${fromName}" <${fromAddress}>`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html).toString('base64')
    ];
    
    const mimeString = messageParts.join('\r\n');
    
    // Convert to base64url format as required by the Gmail API
    const encodedMessage = Buffer.from(mimeString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    const messageId = response.data.id;
    logger.info(`Email sent via Gmail API → ${to} | MessageID: ${messageId}`);
    return { success: true, messageId };
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
      subject: 'Appointment Request Received — Arpit Verma',
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
      subject: 'Reschedule Request Received — Arpit Verma',
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
      subject: 'Appointment Cancellation — Arpit Verma',
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
