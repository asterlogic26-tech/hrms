const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { clockIn, clockOut, summary } = require('../controllers/attendanceController');

router.post('/clockin', auth, clockIn);
router.post('/clockout', auth, clockOut);
router.get('/summary', auth, summary);

module.exports = router;
