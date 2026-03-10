const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const { list, create, updateRole } = require('../controllers/employeeController');

router.get('/', auth, list);
router.post('/', auth, allow('Founder', 'Manager'), create);
router.patch('/:id/role', auth, allow('Founder'), updateRole);

module.exports = router;
