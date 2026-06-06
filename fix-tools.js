// Fix: Re-add tools to the live Vapi assistant
const ASSISTANT_ID = 'c5fc2553-bef2-4587-912f-6da7125fe177';
const VAPI_API_KEY = 'd7b56fef-b4f1-4e39-a498-f48de305b856';
const BACKEND_URL = 'https://dental-ai-receptionist-ofcw.onrender.com';
const API_KEY = 'dev_test_api_key_for_local_development_only';

const tools = [
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      description: 'Books a new appointment. Call this ONLY after collecting and confirming ALL required information.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Full name' },
          phone: { type: 'string', description: 'Phone number' },
          email: { type: 'string', description: 'Email address' },
          dob: { type: 'string', description: 'Date of birth YYYY-MM-DD' },
          patientType: { type: 'string', enum: ['new', 'existing'], description: 'New or returning' },
          insurance: { type: 'string', description: "Additional info or N/A" },
          reasonForVisit: { type: 'string', description: 'Reason for the meeting' },
          preferredDate: { type: 'string', description: 'Preferred date YYYY-MM-DD' },
          preferredTime: { type: 'string', description: "Preferred time HH:MM or morning/afternoon" },
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
      description: 'Reschedules an existing appointment.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          existingDate: { type: 'string', description: 'Current appointment date YYYY-MM-DD' },
          newDate: { type: 'string', description: 'New preferred date YYYY-MM-DD' },
          newTime: { type: 'string', description: 'New preferred time HH:MM' },
          notes: { type: 'string' },
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
          patientName: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          appointmentDate: { type: 'string', description: 'Date of appointment to cancel YYYY-MM-DD' },
          reason: { type: 'string', description: 'Cancellation reason' },
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
      description: 'CRITICAL: Call this IMMEDIATELY when caller reports an urgent request.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          symptoms: { type: 'string', description: 'Description of the urgent matter' },
          severity: {
            type: 'string',
            enum: ['moderate', 'severe', 'critical'],
            description: 'moderate/severe/critical',
          },
          notes: { type: 'string' },
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

BOOKING — collect one at a time: name, phone, email, reason, preferred date, preferred time. Confirm briefly, then call bookAppointment().

RESCHEDULE — collect: name, phone, current date, new date/time. Call rescheduleAppointment().

CANCEL — collect: name, phone, appointment date. Call cancelAppointment().

URGENT — if caller says urgent/emergency/ASAP: "Got it, let me flag this. What's going on?" Collect: name, phone, description, severity. Call handleEmergency() immediately.

FAQs: Arpit's contact is +91 7982892220 or vermaarpit627@gmail.com.

ERRORS: Can't understand? Offer transfer. Backend fails? "Technical issue — Arpit will follow up. What's your number?"

CLOSING: "Anything else? ... Thanks for calling. Bye!"`;

(async () => {
  console.log('Updating assistant with tools...');
  const res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.5,
        messages: [{ role: 'system', content: systemPrompt }],
        tools: tools,
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en-IN',
        smartFormat: true,
      },
      firstMessage: "Hi, you've reached Arpit's assistant. How can I help?",
      silenceTimeoutSeconds: 45,
      stopSpeakingPlan: { voiceSeconds: 0.5, backoffSeconds: 1.5 },
    }),
  });
  const data = await res.json();
  if (data.id) {
    console.log('✅ Assistant updated with all 4 tools!');
    console.log('ID:', data.id);
    // Verify tools
    const check = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    }).then(r => r.json());
    if (check.model && check.model.tools) {
      check.model.tools.forEach(t => {
        console.log(`  ✅ ${t.function?.name} → ${t.server?.url}`);
      });
    }
  } else {
    console.log('❌ Error:', JSON.stringify(data, null, 2));
  }
})();
