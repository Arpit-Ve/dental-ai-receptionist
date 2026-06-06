const { google } = require('googleapis');
const logger = require('../utils/logger');

// ── Auth ──────────────────────────────────────────────────────────────────────

const getAuth = () => {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  // Handle different newline formats:
  // - .env files: key has literal \n characters (escaped)
  // - Render/Heroku: key may have real newlines or escaped ones
  if (privateKey.includes('\\n') && !privateKey.includes('\n-----')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
};

// ── Sheet config ──────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const SHEETS = {
  APPOINTMENTS: 'Appointments',
  RESCHEDULES:  'Reschedules',
  CANCELLATIONS:'Cancellations',
  EMERGENCIES:  'Emergencies',
  CALL_LOG:     'CallLog',
};

// Column order must match schema in docs/SCHEMA.md
const COLUMNS = {
  APPOINTMENTS: [
    'Timestamp', 'Call Type', 'Patient Name', 'Phone', 'Email',
    'DOB', 'Patient Type', 'Insurance', 'Reason For Visit',
    'Preferred Date', 'Preferred Time', 'Status', 'Priority', 'Notes', 'Call Summary',
  ],
  RESCHEDULES: [
    'Timestamp', 'Patient Name', 'Phone', 'Existing Date',
    'New Date', 'New Time', 'Status', 'Notes',
  ],
  CANCELLATIONS: [
    'Timestamp', 'Patient Name', 'Phone', 'Appointment Date',
    'Reason', 'Status', 'Notes',
  ],
  EMERGENCIES: [
    'Timestamp', 'Patient Name', 'Phone', 'Email',
    'Symptoms', 'Severity', 'Status', 'Staff Notified', 'Notes',
  ],
  CALL_LOG: [
    'Timestamp', 'Call ID', 'Call Type', 'Duration (s)',
    'Patient Name', 'Phone', 'Outcome', 'Summary',
  ],
};

// ── Core append function ──────────────────────────────────────────────────────

const appendRow = async (sheetName, rowData) => {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    logger.info(`Google Sheets append OK → ${sheetName}`);
    return response.data;
  } catch (err) {
    logger.error(`Google Sheets error → ${sheetName}: ${err.message}`);
    throw new Error(`Failed to save to ${sheetName}: ${err.message}`);
  }
};

// ── Sheet-specific methods ────────────────────────────────────────────────────

const saveAppointment = async (data) => {
  const now = new Date().toISOString();
  const row = [
    now,
    'APPOINTMENT',
    data.patientName,
    data.phone,
    data.email,
    data.dob || '',
    data.patientType,
    data.insurance || 'Unknown',
    data.reasonForVisit,
    data.preferredDate || '',
    data.preferredTime || '',
    'PENDING',
    'NORMAL',
    data.notes || '',
    data.callSummary || '',
  ];
  return appendRow(SHEETS.APPOINTMENTS, row);
};

const saveReschedule = async (data) => {
  const row = [
    new Date().toISOString(),
    data.patientName,
    data.phone,
    data.existingDate || '',
    data.newDate || '',
    data.newTime || '',
    'RESCHEDULED',
    data.notes || '',
  ];
  return appendRow(SHEETS.RESCHEDULES, row);
};

const saveCancellation = async (data) => {
  const row = [
    new Date().toISOString(),
    data.patientName,
    data.phone,
    data.appointmentDate || '',
    data.reason || '',
    'CANCELLED',
    data.notes || '',
  ];
  return appendRow(SHEETS.CANCELLATIONS, row);
};

const saveEmergency = async (data) => {
  const row = [
    new Date().toISOString(),
    data.patientName,
    data.phone,
    data.email || '',
    data.symptoms,
    data.severity.toUpperCase(),
    'URGENT',
    'PENDING',
    data.notes || '',
  ];
  return appendRow(SHEETS.EMERGENCIES, row);
};

const saveCallLog = async (data) => {
  const row = [
    new Date().toISOString(),
    data.callId || '',
    data.callType,
    data.duration || 0,
    data.patientName || '',
    data.phone || '',
    data.outcome || '',
    data.summary || '',
  ];
  return appendRow(SHEETS.CALL_LOG, row);
};

// ── Initialize sheets with headers ───────────────────────────────────────────

const initializeSheets = async () => {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const existingSheets = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingNames = existingSheets.data.sheets.map(s => s.properties.title);

    for (const [key, name] of Object.entries(SHEETS)) {
      if (!existingNames.includes(name)) {
        // Create sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{ addSheet: { properties: { title: name } } }],
          },
        });

        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${name}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [COLUMNS[key]] },
        });

        logger.info(`Sheet created: ${name}`);
      }
    }

    logger.info('Google Sheets initialization complete');
  } catch (err) {
    logger.error(`Sheet init error: ${err.message}`);
  }
};

module.exports = {
  saveAppointment,
  saveReschedule,
  saveCancellation,
  saveEmergency,
  saveCallLog,
  initializeSheets,
};
