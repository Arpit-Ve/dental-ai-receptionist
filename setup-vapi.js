/**
 * Automated Vapi Setup — Creates all tools + assistant in one shot
 * Usage: node setup-vapi.js YOUR_VAPI_API_KEY
 */

const VAPI_API_KEY = process.argv[2];
if (!VAPI_API_KEY) {
  console.error('❌ Usage: node setup-vapi.js YOUR_VAPI_API_KEY');
  console.error('   Get your key from: Vapi Dashboard → Profile → API Keys');
  process.exit(1);
}

const BACKEND_URL = 'https://dental-ai-receptionist-ofcw.onrender.com';
const API_KEY = 'dev_test_api_key_for_local_development_only';

const headers = {
  'Authorization': `Bearer ${VAPI_API_KEY}`,
  'Content-Type': 'application/json',
};

const vapiPost = async (endpoint, body) => {
  const res = await fetch(`https://api.vapi.ai/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ API Error (${endpoint}):`, JSON.stringify(data, null, 2));
    throw new Error(`Failed to create ${endpoint}`);
  }
  return data;
};

// ── Tool Definitions ──────────────────────────────────────────────────────────

const tools = [
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      description: 'Books a new appointment. Call this ONLY after collecting and confirming ALL required information with the caller.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Full name of the person' },
          phone: { type: 'string', description: 'Phone number' },
          email: { type: 'string', description: 'Email address' },
          dob: { type: 'string', description: 'Date of birth YYYY-MM-DD' },
          patientType: { type: 'string', enum: ['new', 'existing'], description: 'New or returning' },
          insurance: { type: 'string', description: "Additional info or 'N/A'" },
          reasonForVisit: { type: 'string', description: 'Reason for the meeting / purpose' },
          preferredDate: { type: 'string', description: 'Preferred date YYYY-MM-DD' },
          preferredTime: { type: 'string', description: "Preferred time HH:MM or description like 'morning'" },
          callSummary: { type: 'string', description: 'Brief summary of the call' },
        },
        required: ['patientName', 'phone', 'email', 'patientType', 'reasonForVisit'],
      },
    },
    server: {
      url: `${BACKEND_URL}/appointments`,
      headers: { 'x-api-key': API_KEY },
      timeoutSeconds: 15,
    },
  },
  {
    type: 'function',
    function: {
      name: 'rescheduleAppointment',
      description: 'Reschedules an existing appointment. Collect name, phone, existing date, new date and time first.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Full name' },
          phone: { type: 'string', description: 'Phone number' },
          email: { type: 'string', description: 'Email' },
          existingDate: { type: 'string', description: 'Current appointment date YYYY-MM-DD' },
          newDate: { type: 'string', description: 'New preferred date YYYY-MM-DD' },
          newTime: { type: 'string', description: 'New preferred time HH:MM' },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['patientName', 'phone'],
      },
    },
    server: {
      url: `${BACKEND_URL}/reschedule`,
      headers: { 'x-api-key': API_KEY },
      timeoutSeconds: 15,
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelAppointment',
      description: 'Cancels an existing appointment.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Full name' },
          phone: { type: 'string', description: 'Phone number' },
          email: { type: 'string', description: 'Email' },
          appointmentDate: { type: 'string', description: 'Date of appointment to cancel YYYY-MM-DD' },
          reason: { type: 'string', description: 'Cancellation reason if provided' },
        },
        required: ['patientName', 'phone'],
      },
    },
    server: {
      url: `${BACKEND_URL}/cancel`,
      headers: { 'x-api-key': API_KEY },
      timeoutSeconds: 15,
    },
  },
  {
    type: 'function',
    function: {
      name: 'handleEmergency',
      description: 'CRITICAL: Call this IMMEDIATELY when caller reports an urgent request. Do NOT wait to gather more info.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Full name' },
          phone: { type: 'string', description: 'Phone number' },
          email: { type: 'string', description: 'Email' },
          symptoms: { type: 'string', description: 'Description of the urgent matter' },
          severity: {
            type: 'string',
            enum: ['moderate', 'severe', 'critical'],
            description: 'moderate=not too urgent, severe=needs attention soon, critical=immediate attention needed',
          },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['patientName', 'phone', 'symptoms', 'severity'],
      },
    },
    server: {
      url: `${BACKEND_URL}/emergency`,
      headers: { 'x-api-key': API_KEY },
      timeoutSeconds: 10,
    },
  },
];

// ── System Prompt ─────────────────────────────────────────────────────────────

const systemPrompt = `You are Arpit Verma's AI assistant. Be extremely concise — max 1-2 sentences per response. No filler, no over-explaining.

Contact: +91 7982892220 | vermaarpit627@gmail.com

RULES:
- Keep every response SHORT (1-2 sentences max)
- Ask only ONE question at a time
- Never say "I am an AI." Say: "I'm Arpit's assistant."
- Never fabricate availability
- Use caller's name after you get it
- No unnecessary pleasantries or repetition

OPENING: "Hi, you've reached Arpit's assistant. How can I help?"

BOOKING — collect one at a time: name → phone → email → reason → preferred date → preferred time. Confirm briefly, then call bookAppointment().

RESCHEDULE — collect: name → phone → current date → new date/time. Call rescheduleAppointment().

CANCEL — collect: name → phone → appointment date. Call cancelAppointment().

URGENT — if caller says urgent/emergency/ASAP: "Got it, let me flag this. What's going on?" Collect: name, phone, description, severity. Call handleEmergency() immediately.

FAQs: Arpit's contact is +91 7982892220 or vermaarpit627@gmail.com.

ERRORS: Can't understand? Offer transfer. Backend fails? "Technical issue — Arpit will follow up. What's your number?"

CLOSING: "Anything else? ... Thanks for calling. Bye!"`;

// ── Main Setup ────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🤖 AI Assistant — Automated Vapi Setup\n');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('');

  // Create assistant with tools defined inline (Vapi current API format)
  process.stdout.write('Creating assistant with tools... ');
  const assistant = await vapiPost('assistant', {
    name: 'AI Assistant - Arpit Verma',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [{ role: 'system', content: systemPrompt }],
      tools: tools,
    },
    voice: {
      provider: 'vapi',
      voiceId: 'Elliot',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en-US',
    },
    firstMessage: "Hi, you've reached Arpit Verma's assistant. How can I help you today?",
    endCallMessage: 'Thank you for calling. Have a wonderful day!',
    endCallPhrases: ['goodbye', 'thank you bye', "that's all thank you", "I'm all set", "no that's all"],
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
  });
  console.log(`✅ (${assistant.id})`);

  console.log('\n════════════════════════════════════════════════════');
  console.log('🎉 SETUP COMPLETE!');
  console.log('════════════════════════════════════════════════════');
  console.log(`\nAssistant ID: ${assistant.id}`);
  console.log(`Assistant Name: AI Assistant - Arpit Verma`);
  console.log(`Tools: ${tools.length} (embedded in assistant)`);
  console.log('\n📞 NEXT STEP:');
  console.log('   1. Go to Vapi Dashboard → Phone Numbers');
  console.log('   2. Buy a number → Assign to your assistant');
  console.log('   3. Call it and test!\n');
})();
