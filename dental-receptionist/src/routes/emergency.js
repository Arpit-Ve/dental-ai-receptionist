const express = require('express');
const router = express.Router();
const { handleEmergency } = require('../controllers/emergencyController');
const { emergencyValidators, validate } = require('../middleware/validators');

router.post('/', emergencyValidators, validate, handleEmergency);

module.exports = router;
