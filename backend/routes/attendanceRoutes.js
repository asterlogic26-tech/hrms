const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const {
  clockIn, clockOut, summary, myAttendance, allAttendance, dailyReport,
  applyRegularization, myRegularizations, pendingRegularizations, approveRegularization,
} = require('../controllers/attendanceController');

router.post('/clockin', auth, clockIn);
router.post('/clockout', auth, clockOut);
router.get('/summary', auth, summary);
router.get('/my-attendance', auth, myAttendance);
router.get('/all', auth, allow('Founder'), allAttendance);
router.get('/daily-report', auth, allow('Founder'), dailyReport);

// Attendance regularization
router.post('/regularize', auth, applyRegularization);
router.get('/regularize/my', auth, myRegularizations);
router.get('/regularize/pending', auth, allow('Manager', 'Team Lead', 'Founder'), pendingRegularizations);
router.put('/regularize/:id/approve', auth, allow('Manager', 'Team Lead', 'Founder'), approveRegularization);

module.exports = router;
