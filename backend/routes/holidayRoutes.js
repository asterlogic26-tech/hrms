const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const { getHolidays, createHoliday } = require('../controllers/holidayController');

router.get('/', auth, getHolidays);
router.post('/', auth, allow('Founder'), createHoliday);

module.exports = router;
