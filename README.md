# 🦷 Dental AI Receptionist

**AI-Powered Voice Receptionist for California Dental Specialty Group**

An intelligent voice receptionist powered by [Vapi](https://vapi.ai) that handles inbound patient calls — booking appointments, rescheduling, cancellations, and emergency routing — all automatically.

## ✨ Features

- 📞 **AI Voice Agent** — Natural conversation powered by GPT-4o + ElevenLabs
- 📅 **Appointment Booking** — Collects patient info and saves to Google Sheets
- 🔄 **Reschedule / Cancel** — Handles existing appointment changes
- 🚨 **Emergency Routing** — Immediate staff notification for dental emergencies
- 📧 **Email Notifications** — Patient confirmations + staff alerts via Gmail
- 📊 **Google Sheets CRM** — All data organized in structured spreadsheets
- 🔒 **HIPAA-Conscious** — PII redacted from logs, API key auth, rate limiting

## 🏗️ Architecture

```
Patient calls phone number
        ↓
  Vapi Voice Agent ("Sarah")
  ElevenLabs voice + GPT-4o
        ↓
  Function calls to backend API
        ↓
  Express.js Backend (this repo)
    ├── POST /appointments  → Sheets + Email
    ├── POST /reschedule    → Sheets + Email
    ├── POST /cancel        → Sheets + Email
    ├── POST /emergency     → Sheets + Email (URGENT)
    └── GET  /health        → 200 OK
        ↓
  Google Sheets + Gmail
```

## 🚀 Quick Start

```bash
cd dental-receptionist
npm install
cp .env.example .env
# Fill in your credentials in .env
node src/init-sheets.js   # Create spreadsheet tabs
npm run dev               # Start dev server
```

## 📋 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/appointments` | API Key | Book appointment |
| POST | `/reschedule` | API Key | Reschedule appointment |
| POST | `/cancel` | API Key | Cancel appointment |
| POST | `/emergency` | API Key | Report emergency |
| POST | `/send-email` | API Key | Send custom email |
| POST | `/vapi/webhook` | Vapi Signature | Vapi event handler |

## 🔧 Tech Stack

- **Runtime**: Node.js + Express.js
- **Voice AI**: Vapi + OpenAI GPT-4o + ElevenLabs
- **Database**: Google Sheets API
- **Email**: Gmail OAuth2 + Nodemailer
- **Security**: Helmet, CORS, Rate Limiting, API Key Auth
- **Logging**: Winston

## 📁 Project Structure

```
dental-receptionist/
├── src/
│   ├── index.js                 # App entry
│   ├── init-sheets.js           # Sheet initializer
│   ├── routes/                  # API routes
│   ├── controllers/             # Business logic
│   ├── services/                # Google Sheets + Email
│   ├── middleware/              # Auth, validation, errors
│   └── utils/                   # Logger
├── docs/                        # Deployment docs
├── tests/                       # Test suite
├── .env.example                 # Environment template
└── vapi-assistant-config.json   # Vapi AI config
```

## 📖 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup guide including:
- Google Cloud project setup
- Google Sheets API configuration
- Gmail OAuth2 setup
- Vapi assistant configuration
- Production deployment (Render/Railway)

## 📄 License

MIT
