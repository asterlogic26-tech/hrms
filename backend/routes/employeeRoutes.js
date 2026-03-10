const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const { list, create } = require('../controllers/employeeController');

router.get('/', auth, list);
router.post('/', auth, allow('Founder', 'Manager'), create);

module.exports = router;
