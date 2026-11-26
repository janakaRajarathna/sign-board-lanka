const { ALLOWED_ROLES } = require('./requireAuth');

function isValidUserId(userId) {
  if (typeof userId === 'string') {
    return userId.trim().length > 0;
  }
  if (typeof userId === 'number') {
    return Number.isInteger(userId) && userId > 0;
  }
  return false;
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

/**
 * Creates Express middleware that restricts route access to one or more allowed roles.
 *
 * @param {...(string|string[])} roles Allowed role names from ALLOWED_ROLES
 * @returns {Function} Express middleware (req, res, next)
 */
function requireRole(...roles) {
  const flatRoles = roles.flat();

  if (flatRoles.length === 0) {
    throw new Error('requireRole requires at least one allowed role');
  }

  const allowedSet = new Set();
  for (const role of flatRoles) {
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      throw new Error(`Invalid role configured in requireRole: ${String(role)}`);
    }
    allowedSet.add(role);
  }

  return function roleGuard(req, res, next) {
    if (!res || res.headersSent) {
      return;
    }

    const user = req && req.session ? req.session.user : null;

    if (
      !user ||
      typeof user !== 'object' ||
      Array.isArray(user) ||
      !isValidUserId(user.userId) ||
      typeof user.role !== 'string' ||
      !ALLOWED_ROLES.has(user.role)
    ) {
      return sendUnauthenticated(req, res);
    }

    if (!allowedSet.has(user.role)) {
      return sendForbidden(req, res);
    }

    return next();
  };
}

module.exports = requireRole;
