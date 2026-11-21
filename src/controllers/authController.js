const authService = require('../services/authService');
const { generateToken } = require('../middleware/csrfProtection');

function getLogin(req, res) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  return res.render('login', {
    loginError: null,
    csrfToken: res.locals.csrfToken || generateToken(req),
  });
}

async function postLogin(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  try {
    const { email, password } = req.body || {};

    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(401).render('login', {
        loginError: result.message || 'Invalid email or password.',
        csrfToken: generateToken(req),
      });
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        return next(regenErr);
      }

      req.session.user = {
        userId: result.user.userId,
        fullName: result.user.fullName,
        role: result.user.role,
      };

      generateToken(req, true);

      req.session.save((saveErr) => {
        if (saveErr) {
          return next(saveErr);
        }

        return res.redirect('/dashboard');
      });
    });
  } catch (err) {
    return next(err);
  }
}

function postLogout(req, res, next) {
  if (!req || !req.session || typeof req.session.destroy !== 'function') {
    return res.redirect('/login');
  }

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    if (typeof res.clearCookie === 'function') {
      res.clearCookie('connect.sid');
    }

    return res.redirect('/login');
  });
}

module.exports = {
  getLogin,
  postLogin,
  postLogout,
};
