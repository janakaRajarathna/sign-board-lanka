const { generateToken } = require('../middleware/csrfProtection');
const {
  getOwnerDashboardData,
  getPmDashboardData,
  getAccountsDashboardData,
} = require('../services/dashboardDataService');

const ROLE_VIEW_MAP = {
  OWNER: 'dashboards/owner',
  PROJECT_MANAGER: 'dashboards/pm',
  ACCOUNTS: 'dashboards/accounts',
};

async function getDashboard(req, res, next) {
  try {
    const user = req?.session?.user;

    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      res.status(403);
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.json({ error: 'Forbidden' });
      }
      return res.type('html').send('Forbidden');
    }

    const viewName = ROLE_VIEW_MAP[user.role];

    if (!viewName) {
      res.status(403);
      if (typeof req?.accepts === 'function' && !req.accepts('html')) {
        return res.json({ error: 'Forbidden' });
      }
      return res.type('html').send('Forbidden');
    }

    let dashboardData;
    if (user.role === 'OWNER') {
      dashboardData = await getOwnerDashboardData();
    } else if (user.role === 'PROJECT_MANAGER') {
      dashboardData = await getPmDashboardData(user.userId);
    } else if (user.role === 'ACCOUNTS') {
      dashboardData = await getAccountsDashboardData();
    }

    const csrfToken =
      (res.locals && res.locals.csrfToken) ||
      (req.session ? generateToken(req) : undefined);

    return res.render(viewName, {
      user: {
        userId: user.userId,
        fullName: user.fullName,
        role: user.role,
      },
      csrfToken,
      data: dashboardData,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboard,
  ROLE_VIEW_MAP,
};
