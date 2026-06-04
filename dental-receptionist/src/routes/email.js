const express = require('express');
const router = express.Router();
const { sendCustomEmail } = require('../controllers/emailController');
const { emailValidators, validate } = require('../middleware/validators');

router.post('/', emailValidators, validate, sendCustomEmail);

module.exports = router;
