const express = require('express');

const healthController = require('../controllers/healthController');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const projectController = require('../controllers/projectController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const requireProjectAccess = require('../middleware/requireProjectAccess');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.get('/health/db', healthController.getDatabaseHealth);

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

router.get('/dashboard', requireAuth, dashboardController.getDashboard);
router.post('/logout', requireAuth, authController.postLogout);

// Projects – listing (OWNER: all projects; PROJECT_MANAGER: assigned only via service scoping)
router.get(
  '/projects',
  requireAuth,
  requireRole('OWNER', 'PROJECT_MANAGER'),
  projectController.getProjects
);

// New project registration form & supporting OWNER-only endpoints (registered BEFORE /projects/:projectId)
router.get(
  '/projects/new',
  requireAuth,
  requireRole('OWNER'),
  projectController.getNewProject
);

router.get(
  '/projects/customers/search',
  requireAuth,
  requireRole('OWNER'),
  projectController.searchCustomers
);

router.get(
  '/projects/managers',
  requireAuth,
  requireRole('OWNER'),
  projectController.getActiveProjectManagers
);

router.post(
  '/projects',
  requireAuth,
  requireRole('OWNER'),
  projectController.postCreateProject
);

// Project cancellation (OWNER only, registered BEFORE /projects/:projectId catch-all)
router.post(
  '/projects/:projectId/cancel',
  requireAuth,
  requireRole('OWNER'),
  requireProjectAccess(),
  projectController.postCancelProject
);

// Project detail (PM assignment enforced by requireProjectAccess)
router.get(
  '/projects/:projectId',
  requireAuth,
  requireRole('OWNER', 'PROJECT_MANAGER'),
  requireProjectAccess(),
  projectController.getProjectDetails
);

module.exports = router;
