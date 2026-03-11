const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const { apply, approve, list, getBalance, renewBalances } = require('../controllers/leaveController');

router.post('/apply', auth, apply);
router.put('/approve', auth, allow('Manager', 'Team Lead', 'Founder'), approve);
router.get('/', auth, list);
router.get('/balance', auth, getBalance);
// Admin-only: trigger January balance renewal
router.post('/renew-balances', auth, allow('Founder'), renewBalances);

module.exports = router;
