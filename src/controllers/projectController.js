'use strict';

const projectService = require('../services/projectService');
const projectValidator = require('../validators/projectValidator');
const { generateToken } = require('../middleware/csrfProtection');

const VALID_STATUSES = new Set(['ACTIVE', 'COMPLETED', 'CANCELLED', '']);

/**
 * GET /projects
 * Lists projects with optional search, status, stage, and pagination filters.
 * Access: OWNER (all projects) | PROJECT_MANAGER (assigned projects only, enforced by service)
 */
async function getProjects(req, res, next) {
  try {
    const user = req && req.session ? req.session.user : null;
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      res.status(403);
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.json({ error: 'Forbidden' });
      }
      return res.type('html').send('Forbidden');
    }

    const { search, status, stage, page } = req.query || {};

    // Validate status filter
    const rawStatus = typeof status === 'string' ? status.trim() : '';
    const cleanStatus = VALID_STATUSES.has(rawStatus) ? rawStatus : '';

    const csrfToken = generateToken(req);

    const data = await projectService.listProjects({
      userId: user.userId,
      role: user.role,
      search: typeof search === 'string' ? search : '',
      status: cleanStatus,
      stageId: stage,
      page,
      pageSize: 10,
    });

    return res.render('projects/index', {
      user,
      csrfToken,
      data,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /projects/:projectId
 * Returns detailed view of a single project.
 * Access: OWNER (any project, 404 if not found) | PROJECT_MANAGER (assigned only, enforced by requireProjectAccess)
 * req.authorizedProjectId is set by requireProjectAccess middleware.
 */
async function getProjectDetails(req, res, next) {
  try {
    const user = req && req.session ? req.session.user : null;
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      res.status(403);
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.json({ error: 'Forbidden' });
      }
      return res.type('html').send('Forbidden');
    }

    const projectId = req.authorizedProjectId;

    const csrfToken = generateToken(req);

    const p = await projectService.getProjectDetails(projectId);
    if (!p) {
      const err = new Error('Project not found');
      err.statusCode = 404;
      return next(err);
    }

    return res.render('projects/detail', {
      user,
      csrfToken,
      p,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Extracts and validates the session user object for OWNER-only endpoints.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Object|null}
 */
function requireSessionUser(req, res) {
  const user = req && req.session ? req.session.user : null;
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    res.status(403);
    if (typeof req?.accepts === 'function' && !req.accepts('html')) {
      res.json({ error: 'Forbidden' });
      return null;
    }
    res.type('html').send('Forbidden');
    return null;
  }
  return user;
}

/**
 * GET /projects/new
 * Renders the Project Registration Form (Stage 1: Project Registration).
 * Access: OWNER only.
 */
async function getNewProject(req, res, next) {
  try {
    const user = requireSessionUser(req, res);
    if (!user) return;

    const csrfToken = generateToken(req);
    const projectManagers = await projectService.listActiveProjectManagers();

    return res.render('projects/new', {
      user,
      csrfToken,
      projectManagers,
      formValues: { customerMode: 'existing' },
      errors: {},
      formError: null,
      duplicateCustomer: null,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /projects/customers/search?q=...
 * Searches active customers by email or address (min 2 characters).
 * Access: OWNER only.
 */
async function searchCustomers(req, res, next) {
  try {
    const user = requireSessionUser(req, res);
    if (!user) return;

    const q = typeof req.query?.q === 'string' ? req.query.q : '';
    if (q.trim().length < 2) {
      return res.json({ customers: [] });
    }

    const customers = await projectService.searchActiveCustomers(q);
    return res.json({ customers });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /projects/managers
 * Returns active users with the PROJECT_MANAGER role.
 * Access: OWNER only.
 */
async function getActiveProjectManagers(req, res, next) {
  try {
    const user = requireSessionUser(req, res);
    if (!user) return;

    const managers = await projectService.listActiveProjectManagers();
    return res.json({ managers });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /projects
 * Validates input, creates customer (if new), project, and optional PM assignment
 * in a single PostgreSQL transaction, then redirects to /projects/:projectId.
 * Access: OWNER only.
 */
async function postCreateProject(req, res, next) {
  try {
    const user = requireSessionUser(req, res);
    if (!user) return;

    const csrfToken = generateToken(req);
    const validation = projectValidator.validateCreateProjectInput(req.body);

    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0] || 'Please check the highlighted fields.';
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.status(400).json({ error: firstError, errors: validation.errors });
      }
      const projectManagers = await projectService.listActiveProjectManagers();
      return res.status(400).render('projects/new', {
        user,
        csrfToken,
        projectManagers,
        formValues: validation.formValues,
        errors: validation.errors,
        formError: firstError,
        duplicateCustomer: null,
      });
    }

    try {
      const created = await projectService.createProject(validation.data, user.userId);
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.status(201).json(created);
      }
      return res.redirect(`/projects/${created.projectId}`);
    } catch (err) {
      if (err && err.name === 'ProjectCreationError') {
        const status = err.statusCode || 400;
        if (typeof req?.accepts === 'function' && !req.accepts('html')) {
          return res.status(status).json({
            error: err.message,
            errors: err.fieldErrors || {},
            duplicateCustomer: err.duplicateCustomer || null,
          });
        }
        const projectManagers = await projectService.listActiveProjectManagers();
        return res.status(status).render('projects/new', {
          user,
          csrfToken,
          projectManagers,
          formValues: validation.formValues,
          errors: err.fieldErrors || {},
          formError: err.message,
          duplicateCustomer: err.duplicateCustomer || null,
        });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /projects/:projectId/cancel
 * Validates the cancellation reason, calls the cancellation service,
 * and redirects to the project details page on success.
 * Access: OWNER only. req.authorizedProjectId set by requireProjectAccess middleware.
 */
async function postCancelProject(req, res, next) {
  try {
    const user = requireSessionUser(req, res);
    if (!user) return;

    const projectId = req.authorizedProjectId;

    const validation = projectValidator.validateCancelProjectInput(req.body);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0] || 'Please provide a cancellation reason.';
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.status(400).json({ error: firstError, errors: validation.errors });
      }
      // Re-fetch the project to re-render the details page with an error
      const p = await projectService.getProjectDetails(projectId);
      if (!p) {
        const err = new Error('Project not found');
        err.statusCode = 404;
        return next(err);
      }
      const csrfToken = generateToken(req);
      return res.status(400).render('projects/detail', {
        user,
        csrfToken,
        p,
        cancelError: firstError,
      });
    }

    try {
      await projectService.cancelProject(projectId, user.userId, validation.data.reason);

      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.status(200).json({ success: true, projectId });
      }
      return res.redirect(`/projects/${projectId}`);
    } catch (err) {
      if (err && err.name === 'ProjectCancellationError') {
        const status = err.statusCode || 400;
        if (typeof req?.accepts === 'function' && !req.accepts('html')) {
          return res.status(status).json({ error: err.message });
        }
        const p = await projectService.getProjectDetails(projectId);
        if (!p) {
          const notFound = new Error('Project not found');
          notFound.statusCode = 404;
          return next(notFound);
        }
        const csrfToken = generateToken(req);
        return res.status(status).render('projects/detail', {
          user,
          csrfToken,
          p,
          cancelError: err.message,
        });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProjects,
  getNewProject,
  searchCustomers,
  getActiveProjectManagers,
  postCreateProject,
  getProjectDetails,
  postCancelProject,
};
