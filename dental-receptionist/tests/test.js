/**
 * Dental AI Receptionist — Quick Test
 * Run: node tests/test.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your_api_key_here';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

const test = async (name, fn) => {
  try {
    const result = await fn();
    console.log(`✅ ${name}:`, JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`❌ ${name}:`, err.message);
  }
};

const post = async (path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
};

const get = async (path) => {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json();
};

(async () => {
  console.log('\n🦷 California Dental AI Receptionist — Test Suite\n');
  console.log(`Target: ${BASE_URL}\n`);

  await test('Health Check', () => get('/health'));

  await test('Book Appointment', () => post('/appointments', {
    patientName: 'Jane Smith',
    phone: '+14081234567',
    email: 'janesmith.test@example.com',
    dob: '1990-05-15',
    patientType: 'new',
    insurance: 'Delta Dental PPO',
    reasonForVisit: 'Dental implant consultation',
    preferredDate: '2025-02-15',
    preferredTime: '10:00',
    callSummary: 'Test booking via automated test script',
  }));

  await test('Reschedule Appointment', () => post('/reschedule', {
    patientName: 'Jane Smith',
    phone: '+14081234567',
    existingDate: '2025-02-15',
    newDate: '2025-02-20',
    newTime: '14:00',
  }));

  await test('Cancel Appointment', () => post('/cancel', {
    patientName: 'Jane Smith',
    phone: '+14081234567',
    appointmentDate: '2025-02-20',
    reason: 'Test cancellation',
  }));

  await test('Emergency Call', () => post('/emergency', {
    patientName: 'Emergency Test Patient',
    phone: '+14089999999',
    symptoms: 'Severe toothache, jaw swelling, cannot open mouth fully, pain level 9/10',
    severity: 'severe',
    notes: 'Test emergency via automated script',
  }));

  await test('Validation Error (missing fields)', () => post('/appointments', {
    patientName: 'No Email Patient',
    // missing email, phone, patientType, reasonForVisit
  }));

  await test('Auth Failure (wrong key)', async () => {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'wrong_key' },
      body: JSON.stringify({ patientName: 'test' }),
    });
    return res.json();
  });

  console.log('\n✅ Test suite complete. Check Google Sheets and email inbox.\n');
})();
