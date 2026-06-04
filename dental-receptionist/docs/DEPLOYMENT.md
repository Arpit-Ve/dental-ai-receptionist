# California Dental Specialty Group — AI Receptionist
## Complete Deployment Guide

---

## 1. ARCHITECTURE OVERVIEW

```
Incoming Call (Twilio Number)
        ↓
   VAPI Voice Agent (Sarah)
        ↓
   Function Calls (tools)
        ↓
 Express.js Backend API (Render/Railway)
    ├── POST /appointments     → Google Sheets + Gmail
    ├── POST /reschedule       → Google Sheets + Gmail
    ├── POST /cancel           → Google Sheets + Gmail
    ├── POST /emergency        → Google Sheets + Gmail (URGENT)
    ├── POST /send-email       → Gmail
    └── GET  /health           → 200 OK
        ↓
 Google Sheets (Storage)   Gmail (Notifications)
```

---

## 2. GOOGLE SHEETS SCHEMA

### Sheet: Appointments
| Column | Type | Notes |
|--------|------|-------|
| Timestamp | DateTime | Auto |
| Call Type | String | APPOINTMENT |
| Patient Name | String | |
| Phone | String | |
| Email | String | |
| DOB | Date | YYYY-MM-DD |
| Patient Type | Enum | new / existing |
| Insurance | String | |
| Reason For Visit | String | |
| Preferred Date | Date | |
| Preferred Time | String | |
| Status | Enum | PENDING / CONFIRMED / CANCELLED |
| Priority | Enum | NORMAL / URGENT |
| Notes | String | |
| Call Summary | String | |

### Sheet: Reschedules
| Column | Type |
|--------|------|
| Timestamp | DateTime |
| Patient Name | String |
| Phone | String |
| Existing Date | Date |
| New Date | Date |
| New Time | String |
| Status | String |
| Notes | String |

### Sheet: Cancellations
| Column | Type |
|--------|------|
| Timestamp | DateTime |
| Patient Name | String |
| Phone | String |
| Appointment Date | Date |
| Reason | String |
| Status | String |
| Notes | String |

### Sheet: Emergencies
| Column | Type |
|--------|------|
| Timestamp | DateTime |
| Patient Name | String |
| Phone | String |
| Email | String |
| Symptoms | String |
| Severity | Enum | moderate/severe/critical |
| Status | String | URGENT |
| Staff Notified | String |
| Notes | String |

### Sheet: CallLog
| Column | Type |
|--------|------|
| Timestamp | DateTime |
| Call ID | String | Vapi call ID |
| Call Type | String |
| Duration (s) | Number |
| Patient Name | String |
| Phone | String |
| Outcome | String |
| Summary | String |

---

## 3. BACKEND SETUP (LOCAL)

```bash
git clone <your-repo>
cd dental-receptionist
npm install
cp .env.example .env
# Edit .env with all values
mkdir logs
node src/index.js
```

---

## 4. GOOGLE SHEETS API SETUP

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project: "Dental AI Receptionist"
3. Enable **Google Sheets API** and **Google Drive API**

### Step 2: Create Service Account
1. IAM & Admin → Service Accounts → Create
2. Name: `dental-ai-sheets`
3. Role: Editor (or custom with sheets.all)
4. Keys → Add Key → JSON → Download

### Step 3: Extract credentials from JSON
```
GOOGLE_SERVICE_ACCOUNT_EMAIL = client_email
GOOGLE_PRIVATE_KEY = private_key (keep \n characters)
```

### Step 4: Create Google Sheet
1. Create new Google Sheet: "Dental AI Receptionist — Records"
2. Share the sheet with your service account email (Editor access)
3. Copy the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

### Step 5: Initialize sheets
The backend auto-creates sheets with headers on first run.
Or call: `GET /health` after startup — check logs for init confirmation.

---

## 5. GMAIL OAUTH2 SETUP

### Step 1: Enable Gmail API
1. Google Cloud Console → APIs → Gmail API → Enable

### Step 2: OAuth2 Credentials
1. Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URIs: `https://developers.google.com/oauthplayground`

### Step 3: Get Refresh Token
1. Go to https://developers.google.com/oauthplayground
2. Click gear icon → Check "Use your own OAuth credentials"
3. Enter your Client ID and Secret
4. Scope: `https://www.googleapis.com/auth/gmail.send`
5. Authorize → Exchange for tokens
6. Copy refresh_token

### Step 4: Set Gmail sending address
The from address must be the Google account you authorized (step 3).

---

## 6. DEPLOY TO RENDER

```bash
# Push code to GitHub first

# Render.com:
# 1. New Web Service → Connect GitHub repo
# 2. Build Command: npm install
# 3. Start Command: npm start
# 4. Add all environment variables from .env.example
# 5. Deploy

# Your URL: https://your-service.onrender.com
```

---

## 7. DEPLOY TO RAILWAY

```bash
npm install -g @railway/cli
railway login
railway init
railway up

# Set env vars:
railway variables set PORT=3000
railway variables set NODE_ENV=production
railway variables set API_KEY=your_key
# ... (all vars from .env.example)

# Get URL: railway domain
```

---

## 8. VAPI SETUP

### Step 1: Create Assistant
1. Go to https://dashboard.vapi.ai
2. Assistants → Create Assistant
3. Import config from `docs/vapi-assistant-config.json`
4. Replace `{{BACKEND_URL}}` with your Render/Railway URL
5. Replace `{{API_KEY}}` with your API_KEY value

### Step 2: Update tool server URLs
In each tool's `server.url`, replace `{{BACKEND_URL}}` with actual URL:
```
https://your-service.onrender.com/appointments
https://your-service.onrender.com/reschedule
https://your-service.onrender.com/cancel
https://your-service.onrender.com/emergency
```

### Step 3: Assign Phone Number
1. Phone Numbers → Buy Number (or import Twilio)
2. Assign to Sarah assistant
3. Set inbound call handler → Sarah

### Step 4: Set Webhook
1. Assistant → Webhook URL: `https://your-backend.com/vapi/webhook`
2. Events: call-started, call-ended, function-call, transcript

---

## 9. ENVIRONMENT VARIABLES (Complete List)

```env
PORT=3000
NODE_ENV=production
API_KEY=<random 32+ char string>
VAPI_WEBHOOK_SECRET=<from vapi dashboard>

GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=xxx

GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx
GMAIL_FROM_ADDRESS=receptionist@yourpractice.com
GMAIL_FROM_NAME=Sarah - California Dental Specialty Group

STAFF_EMAIL=office@californiadentalspecialtygroup.com
STAFF_EMERGENCY_EMAIL=emergency@californiadentalspecialtygroup.com

CLINIC_NAME=California Dental Specialty Group
CLINIC_PHONE=+1 408-749-9888
CLINIC_ADDRESS=500 E Remington Dr Suite 19, Sunnyvale, California 94087
CLINIC_WEBSITE=https://sunnyvaledentalspecialty.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 10. API ENDPOINT REFERENCE

### POST /appointments
**Auth:** x-api-key header
**Body:**
```json
{
  "patientName": "Jane Smith",
  "phone": "+14081234567",
  "email": "jane@example.com",
  "dob": "1990-05-15",
  "patientType": "new",
  "insurance": "Delta Dental PPO",
  "reasonForVisit": "Dental implant consultation",
  "preferredDate": "2025-01-15",
  "preferredTime": "10:00"
}
```
**Response 201:**
```json
{ "success": true, "requestId": "uuid", "data": { "status": "PENDING_CONFIRMATION" } }
```

### POST /reschedule
```json
{
  "patientName": "Jane Smith",
  "phone": "+14081234567",
  "existingDate": "2025-01-10",
  "newDate": "2025-01-17",
  "newTime": "14:00"
}
```

### POST /cancel
```json
{
  "patientName": "Jane Smith",
  "phone": "+14081234567",
  "appointmentDate": "2025-01-10",
  "reason": "Work conflict"
}
```

### POST /emergency
```json
{
  "patientName": "John Doe",
  "phone": "+14089876543",
  "symptoms": "Severe toothache, swollen jaw, can't chew",
  "severity": "severe"
}
```

### GET /health
```json
{ "success": true, "status": "healthy" }
```

---

## 11. TESTING GUIDE

### Test backend locally:
```bash
# Health check
curl http://localhost:3000/health

# Book appointment
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "patientName": "Test Patient",
    "phone": "+14081234567",
    "email": "test@example.com",
    "patientType": "new",
    "reasonForVisit": "Dental cleaning"
  }'

# Emergency
curl -X POST http://localhost:3000/emergency \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "patientName": "Emergency Test",
    "phone": "+14089999999",
    "symptoms": "Severe pain, broken tooth, bleeding",
    "severity": "severe"
  }'
```

### Test Vapi:
1. Vapi Dashboard → Phone Numbers → Call from your phone
2. Say: "I'd like to book an appointment"
3. Verify Google Sheet has new row
4. Verify confirmation email received

### Test emergency flow:
1. Call Sarah
2. Say: "I have severe tooth pain and my jaw is swollen"
3. Verify: Emergency sheet row added, staff email sent, Sarah responds with urgency

---

## 12. PRODUCTION CHECKLIST

- [ ] All .env variables set in production
- [ ] API_KEY is a strong random string (min 32 chars)
- [ ] VAPI_WEBHOOK_SECRET configured in both Vapi and .env
- [ ] Google Sheets service account has Editor access to spreadsheet
- [ ] Gmail OAuth refresh token valid and working
- [ ] Sheets auto-initialized (check logs after first deploy)
- [ ] Backend health check returns 200
- [ ] Appointment booking end-to-end test passed
- [ ] Emergency flow end-to-end test passed
- [ ] Staff emails received correctly
- [ ] Patient confirmation emails received correctly
- [ ] Vapi assistant phone number assigned
- [ ] Vapi webhook URL set to production backend
- [ ] Rate limiting tested (can't hit >100 req/15min per IP)
- [ ] logs/ directory exists and writable
- [ ] Error handling tested (disconnect mid-call, bad data)
- [ ] HIPAA: confirm no PHI logged in plaintext
- [ ] Render/Railway always-on plan (no sleep on free tier)

---

## 13. FOLDER STRUCTURE

```
dental-receptionist/
├── src/
│   ├── index.js                    # App entry
│   ├── routes/
│   │   ├── appointments.js
│   │   ├── reschedule.js
│   │   ├── cancel.js
│   │   ├── emergency.js
│   │   ├── email.js
│   │   ├── health.js
│   │   └── vapi.js                 # Webhook handler
│   ├── controllers/
│   │   ├── appointmentController.js
│   │   ├── rescheduleController.js
│   │   ├── cancelController.js
│   │   ├── emergencyController.js
│   │   └── emailController.js
│   ├── services/
│   │   ├── sheetsService.js        # Google Sheets
│   │   └── emailService.js         # Gmail
│   ├── middleware/
│   │   ├── apiKeyAuth.js
│   │   ├── rateLimiter.js
│   │   ├── errorHandler.js
│   │   └── validators.js
│   └── utils/
│       └── logger.js
├── docs/
│   ├── vapi-assistant-config.json  # Import into Vapi
│   └── DEPLOYMENT.md               # This file
├── logs/                           # Auto-created
├── .env.example
├── package.json
└── .gitignore
```

---

## 14. SECURITY NOTES (HIPAA-conscious)

- PII fields (email, phone, dob) redacted from error logs (see errorHandler.js)
- API key required on all data routes
- Rate limiting prevents abuse
- Helmet.js sets security headers
- Input validation + sanitization on all endpoints
- HTTPS enforced by Render/Railway
- Google Sheets access via service account (not user OAuth)
- Never log full patient data in application logs
- Webhook signature verification for Vapi events
- Consider encrypting Google Sheet columns in high-compliance environments

---

## 15. VAPI VOICE SETTINGS

Voice: ElevenLabs "Rachel" — professional, warm female voice
Transcriber: Deepgram Nova-2 — high accuracy, low latency
Model: GPT-4o — best reasoning for complex patient conversations

Recommended Vapi plan: Growth ($50/mo) for production dental clinic volume.
Estimated cost per call: ~$0.08-0.15 for 3-5 minute average call.
