'use strict';

const projectService = require('../services/projectService');
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

module.exports = { getProjects, getProjectDetails };
