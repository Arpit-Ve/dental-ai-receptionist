const { body, validationResult } = require('express-validator');

// ── Reusable validators ───────────────────────────────────────────────────────

const nameValidator = body('patientName')
  .trim()
  .notEmpty().withMessage('Patient name required')
  .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 chars')
  .matches(/^[a-zA-Z\s\-']+$/).withMessage('Name: letters only');

const phoneValidator = body('phone')
  .trim()
  .notEmpty().withMessage('Phone required')
  .matches(/^[\+]?[\d\s\-\(\)\.]{7,20}$/).withMessage('Valid phone number required');

const emailValidator = body('email')
  .trim()
  .notEmpty().withMessage('Email required')
  .isEmail().withMessage('Valid email required')
  .normalizeEmail();

const dobValidator = body('dob')
  .optional()
  .isDate({ format: 'YYYY-MM-DD' }).withMessage('DOB format: YYYY-MM-DD');

const dateValidator = (field) => body(field)
  .optional()
  .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${field} format: YYYY-MM-DD`);

const timeValidator = (field) => body(field)
  .optional()
  .matches(/^([01]?\d|2[0-3]):([0-5]\d)$/).withMessage(`${field} format: HH:MM`);

// ── Validation rule sets ──────────────────────────────────────────────────────

const appointmentValidators = [
  nameValidator,
  phoneValidator,
  emailValidator,
  dobValidator,
  body('patientType').trim().isIn(['new', 'existing']).withMessage('patientType: new|existing'),
  body('insurance').trim().optional().isLength({ max: 100 }),
  body('reasonForVisit').trim().notEmpty().withMessage('Reason for visit required').isLength({ max: 500 }),
  dateValidator('preferredDate'),
  timeValidator('preferredTime'),
];

const rescheduleValidators = [
  nameValidator,
  phoneValidator,
  dateValidator('existingDate'),
  dateValidator('newDate'),
  timeValidator('newTime'),
];

const cancelValidators = [
  nameValidator,
  phoneValidator,
  dateValidator('appointmentDate'),
];

const emergencyValidators = [
  nameValidator,
  phoneValidator,
  body('symptoms').trim().notEmpty().withMessage('Symptoms required').isLength({ max: 1000 }),
  body('severity').isIn(['moderate', 'severe', 'critical']).withMessage('severity: moderate|severe|critical'),
];

const emailValidators = [
  emailValidator,
  body('subject').trim().notEmpty().isLength({ max: 200 }),
  body('body').trim().notEmpty().isLength({ max: 5000 }),
];

// ── Result checker ────────────────────────────────────────────────────────────

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = {
  appointmentValidators,
  rescheduleValidators,
  cancelValidators,
  emergencyValidators,
  emailValidators,
  validate,
};
