const express = require('express');
const router = express.Router();
const { bookAppointment } = require('../controllers/appointmentController');
const { appointmentValidators, validate } = require('../middleware/validators');

router.post('/', appointmentValidators, validate, bookAppointment);

module.exports = router;
