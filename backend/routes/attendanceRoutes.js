const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const { clockIn, clockOut, summary, myAttendance, allAttendance } = require('../controllers/attendanceController');

router.post('/clockin', auth, clockIn);
router.post('/clockout', auth, clockOut);
router.get('/summary', auth, summary);
router.get('/my-attendance', auth, myAttendance);
router.get('/all', auth, allow('Founder'), allAttendance);

module.exports = router;
