const db = require('../config/database');
const { ALLOWED_ROLES } = require('./requireAuth');

const DEFAULT_ALLOWED_ROLES = new Set(['OWNER', 'PROJECT_MANAGER']);
const VALID_SOURCES = new Set(['params', 'body', 'query']);

function parsePositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const num = Number(trimmed);
    return num > 0 && Number.isSafeInteger(num) ? num : null;
  }
  return null;
}

function sendUnauthenticated(req, res) {
  if (!res || res.headersSent) {
    return;
  }

  if (req && typeof req.accepts === 'function' && !req.accepts('html')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.redirect('/login');
}

function sendForbidden(req, res) {
  if (!res || res.headersSent) {
    return;
  }

  res.status(403);

  if (req && typeof req.accepts === 'function' && !req.accepts('html')) {
    return res.json({ error: 'Forbidden' });
  }

  return res.type('html').send('Forbidden');
}

function sendBadRequest(req, res, message) {
  if (!res || res.headersSent) {
    return;
  }

  res.status(400);

  if (req && typeof req.accepts === 'function' && !req.accepts('html')) {
    return res.json({ error: message });
  }

  return res.type('html').send(message);
}

function extractRawProjectId(req, source, paramName) {
  if (!req || !req[source] || typeof req[source] !== 'object') {
    return undefined;
  }

  if (paramName) {
    return req[source][paramName];
  }

  if (req[source].projectId !== undefined) {
    return req[source].projectId;
  }

  return req[source].id;
}

/**
 * Creates Express middleware that authorizes project-specific access.
 *
 * Rules:
 * - OWNER: Permitted across all projects (never restricted by PM assignment checks).
 * - PROJECT_MANAGER: Permitted only when an active assignment exists in
 *   public.project_assignments (user_id = session.user.userId AND ended_at IS NULL).
 * - Other roles (e.g. ACCOUNTS): Rejected with 403 Forbidden unless explicitly included
 *   via options.allowedRoles.
 *
 * @param {Object} [options]
 * @param {string} [options.paramName] Request property name for project ID (defaults to projectId or id)
 * @param {'params'|'body'|'query'} [options.source='params'] Request container to read project ID from
 * @param {string[]} [options.allowedRoles=['OWNER', 'PROJECT_MANAGER']] Roles permitted on the route
 * @returns {Function} Express async middleware (req, res, next)
 */
function requireProjectAccess(options = {}) {
  const source = options.source || 'params';
  if (!VALID_SOURCES.has(source)) {
    throw new Error(`Invalid source configured in requireProjectAccess: ${String(source)}`);
  }

  const paramName = typeof options.paramName === 'string' && options.paramName.trim() !== ''
    ? options.paramName.trim()
    : null;

  let allowedRoleSet = DEFAULT_ALLOWED_ROLES;
  if (Array.isArray(options.allowedRoles)) {
    if (options.allowedRoles.length === 0) {
      throw new Error('requireProjectAccess allowedRoles cannot be empty');
    }
    allowedRoleSet = new Set();
    for (const role of options.allowedRoles) {
      if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
        throw new Error(`Invalid role configured in requireProjectAccess: ${String(role)}`);
      }
      allowedRoleSet.add(role);
    }
  }

  return async function projectAccessGuard(req, res, next) {
    if (!res || res.headersSent) {
      return;
    }

    const user = req && req.session ? req.session.user : null;

    if (
      !user ||
      typeof user !== 'object' ||
      Array.isArray(user) ||
      typeof user.role !== 'string' ||
      !ALLOWED_ROLES.has(user.role)
    ) {
      return sendUnauthenticated(req, res);
    }

    const parsedUserId = parsePositiveInteger(user.userId);
    if (!parsedUserId) {
      return sendUnauthenticated(req, res);
    }

    if (!allowedRoleSet.has(user.role)) {
      return sendForbidden(req, res);
    }

    const rawProjectId = extractRawProjectId(req, source, paramName);
    const projectId = parsePositiveInteger(rawProjectId);

    if (!projectId) {
      return sendBadRequest(req, res, 'Invalid project identifier');
    }

    if (user.role === 'OWNER') {
      req.authorizedProjectId = projectId;
      res.locals = res.locals || {};
      res.locals.authorizedProjectId = projectId;
      return next();
    }

    if (user.role === 'PROJECT_MANAGER') {
      try {
        const result = await db.query(
          `SELECT 1
           FROM public.project_assignments
           WHERE project_id = $1
             AND user_id = $2
             AND ended_at IS NULL
           LIMIT 1`,
          [projectId, parsedUserId]
        );

        if (!result || !Array.isArray(result.rows) || result.rows.length === 0) {
          return sendForbidden(req, res);
        }

        req.authorizedProjectId = projectId;
        res.locals = res.locals || {};
        res.locals.authorizedProjectId = projectId;
        return next();
      } catch (_err) {
        return next(new Error('Failed to verify project access'));
      }
    }

    return sendForbidden(req, res);
  };
}

requireProjectAccess.parsePositiveInteger = parsePositiveInteger;

module.exports = requireProjectAccess;
