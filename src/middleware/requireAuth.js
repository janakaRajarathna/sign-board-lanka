const ALLOWED_ROLES = new Set(['OWNER', 'PROJECT_MANAGER', 'ACCOUNTS']);

function isValidUserId(userId) {
  if (typeof userId === 'string') {
    return userId.trim().length > 0;
  }
  if (typeof userId === 'number') {
    return Number.isInteger(userId) && userId > 0;
  }
  return false;
}

function isValidRole(role) {
  return typeof role === 'string' && ALLOWED_ROLES.has(role);
}

function denyAccess(req, res) {
  if (!res || res.headersSent) {
    return;
  }

  if (req && typeof req.accepts === 'function' && !req.accepts('html')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.redirect('/login');
}

function requireAuth(req, res, next) {
  if (!req || !req.session) {
    return denyAccess(req, res);
  }

  const user = req.session.user;

  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    return denyAccess(req, res);
  }

  // Validate server-side session data strictly; never read client-supplied values
  if (!isValidUserId(user.userId) || !isValidRole(user.role)) {
    return denyAccess(req, res);
  }

  // Set Cache-Control to prevent caching of authenticated/protected pages
  if (typeof res.set === 'function') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }

  res.locals = res.locals || {};
  res.locals.user = user;

  return next();
}

requireAuth.ALLOWED_ROLES = ALLOWED_ROLES;
requireAuth.requireAuth = requireAuth;

module.exports = requireAuth;
