const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');
const sheetsService = require('../services/sheetsService');

// ── Vapi webhook signature verification ───────────────────────────────────────
const verifyVapiSignature = (req, res, next) => {
  const signature = req.headers['x-vapi-signature'];
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  if (!secret) return next(); // Skip in dev if secret not set

  if (!signature) {
    logger.warn('Vapi webhook — missing signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
    logger.warn('Vapi webhook — invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

// ── Vapi webhook handler ───────────────────────────────────────────────────────
router.post('/webhook', express.json(), verifyVapiSignature, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(200).json({ received: true });

  logger.info(`Vapi webhook: ${message.type}`);

  switch (message.type) {
    case 'call-started':
      logger.info(`Call started: ${message.call?.id}`);
      break;

    case 'call-ended': {
      const call = message.call;
      await sheetsService.saveCallLog({
        callId: call?.id,
        callType: call?.endedReason || 'UNKNOWN',
        duration: call?.duration || 0,
        patientName: call?.metadata?.patientName || '',
        phone: call?.customer?.number || '',
        outcome: call?.endedReason || 'completed',
        summary: call?.summary || '',
      }).catch(err => logger.warn(`Call log save failed: ${err.message}`));
      break;
    }

    case 'function-call': {
      // Vapi calls backend functions — handled by individual API routes
      // This is a pass-through acknowledgment
      logger.info(`Function call: ${message.functionCall?.name}`);
      break;
    }

    case 'transcript':
      logger.debug(`Transcript update: ${message.transcript?.text}`);
      break;

    default:
      logger.debug(`Unhandled Vapi event: ${message.type}`);
  }

  res.status(200).json({ received: true });
});

module.exports = router;
