const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');
const { login, register, listManagers, listPending, approveRegistration } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/managers', listManagers);                                         // public
router.get('/pending', auth, allow('Founder'), listPending);                   // Founder only
router.post('/approve/:id', auth, allow('Founder'), approveRegistration);      // Founder only

module.exports = router;
