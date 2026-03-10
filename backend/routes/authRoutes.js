const express = require('express');
const router = express.Router();
const { login, register, listManagers } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/managers', listManagers); // public – used by registration form

module.exports = router;
