const express = require('express');
const router = express.Router();
const { rescheduleAppointment } = require('../controllers/rescheduleController');
const { rescheduleValidators, validate } = require('../middleware/validators');

router.post('/', rescheduleValidators, validate, rescheduleAppointment);

module.exports = router;
