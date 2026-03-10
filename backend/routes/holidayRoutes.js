const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getHolidays } = require('../controllers/holidayController');

router.get('/', auth, getHolidays);

module.exports = router;
