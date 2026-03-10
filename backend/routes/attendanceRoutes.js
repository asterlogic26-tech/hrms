const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { clockIn, clockOut, summary, myAttendance } = require('../controllers/attendanceController');

router.post('/clockin', auth, clockIn);
router.post('/clockout', auth, clockOut);
router.get('/summary', auth, summary);
router.get('/my-attendance', auth, myAttendance);

module.exports = router;
