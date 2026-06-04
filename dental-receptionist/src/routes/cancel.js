const express = require('express');
const router = express.Router();
const { cancelAppointment } = require('../controllers/cancelController');
const { cancelValidators, validate } = require('../middleware/validators');

router.post('/', cancelValidators, validate, cancelAppointment);

module.exports = router;
