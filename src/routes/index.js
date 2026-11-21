const express = require('express');

const healthController = require('../controllers/healthController');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.get('/health/db', healthController.getDatabaseHealth);

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

router.get('/dashboard', requireAuth, dashboardController.getDashboard);
router.post('/logout', requireAuth, authController.postLogout);

module.exports = router;
