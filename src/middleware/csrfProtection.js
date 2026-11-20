const crypto = require('crypto');

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function createToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function isValidToken(token) {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

function tokensMatch(expected, submitted) {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const submittedBuffer = Buffer.from(submitted, 'utf8');

  if (expectedBuffer.length !== submittedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, submittedBuffer);
}

function readSubmittedToken(req) {
  let bodyToken;

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, '_csrf')) {
    if (typeof req.body._csrf !== 'string') {
      return undefined;
    }

    bodyToken = req.body._csrf;
  }

  const headerToken = req.get('X-CSRF-Token');

  if (bodyToken !== undefined && headerToken !== undefined && bodyToken !== headerToken) {
    return undefined;
  }

  if (bodyToken !== undefined) {
    return bodyToken;
  }

  return headerToken;
}

function rejectForbidden(req, res) {
  res.status(403);

  if (req.accepts('html')) {
    res.type('html').send('Forbidden');
    return;
  }

  res.json({ error: 'Forbidden' });
}

function generateToken(req, forceNew) {
  if (!req || !req.session) {
    throw new Error('Session middleware is required');
  }

  if (!forceNew && isValidToken(req.session.csrfToken)) {
    return req.session.csrfToken;
  }

  const token = createToken();
  req.session.csrfToken = token;
  return token;
}

function csrfProtection(req, res, next) {
  if (!req.session) {
    rejectForbidden(req, res);
    return;
  }

  if (SAFE_METHODS.has(req.method)) {
    res.locals.csrfToken = generateToken(req);
    next();
    return;
  }

  const sessionToken = req.session.csrfToken;
  const submittedToken = readSubmittedToken(req);

  if (!isValidToken(sessionToken) || !isValidToken(submittedToken) || !tokensMatch(sessionToken, submittedToken)) {
    rejectForbidden(req, res);
    return;
  }

  next();
}

module.exports = {
  generateToken,
  csrfProtection,
};
