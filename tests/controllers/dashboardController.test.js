const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Safeguard: mock database config module so real DB connection is never loaded
const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: () => {
      throw new Error('Real database query must never be executed during unit tests');
    },
  },
};

const dashboardController = require('../../src/controllers/dashboardController');

function createMockResponse(options = {}) {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    renderedView: null,
    renderedData: null,
    responseBody: null,
    responseType: null,
    locals: options.locals || {},
    set(key, value) {
      headers[key.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(t) {
      this.responseType = t;
      return this;
    },
    send(body) {
      this.responseBody = body;
      return this;
    },
    json(data) {
      this.responseBody = data;
      return this;
    },
    render(view, data) {
      if (options.renderError) {
        throw options.renderError;
      }
      this.renderedView = view;
      this.renderedData = data;
      return this;
    },
  };
}

function createMockRequest(options = {}) {
  const acceptsHtml = options.acceptsHtml !== undefined ? options.acceptsHtml : true;
  return {
    session: options.session !== undefined ? options.session : null,
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    accepts(type) {
      if (type === 'html') {
        return acceptsHtml;
      }
      return false;
    },
  };
}

describe('dashboardController - Isolated Unit Tests', () => {
  describe('Exports', () => {
    it('should export getDashboard function and ROLE_VIEW_MAP', () => {
      assert.strictEqual(typeof dashboardController.getDashboard, 'function');
      assert.strictEqual(typeof dashboardController.ROLE_VIEW_MAP, 'object');
      assert.deepStrictEqual(dashboardController.ROLE_VIEW_MAP, {
        OWNER: 'dashboards/owner',
        PROJECT_MANAGER: 'dashboards/pm',
        ACCOUNTS: 'dashboards/accounts',
      });
    });
  });

  describe('Role-to-View Mapping & Data Passing', () => {
    it('should map OWNER to dashboards/owner and pass user and csrfToken', () => {
      const user = { userId: '1', fullName: 'System Owner', role: 'OWNER' };
      const req = createMockRequest({
        session: {
          user,
          csrfToken: '1111111111111111111111111111111111111111111111111111111111111111',
        },
      });
      const res = createMockResponse();
      let nextCalled = false;

      dashboardController.getDashboard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.renderedView, 'dashboards/owner');
      assert.deepStrictEqual(res.renderedData.user, {
        userId: '1',
        fullName: 'System Owner',
        role: 'OWNER',
      });
      assert.strictEqual(
        res.renderedData.csrfToken,
        '1111111111111111111111111111111111111111111111111111111111111111'
      );
    });

    it('should map PROJECT_MANAGER to dashboards/pm and pass user and csrfToken', () => {
      const user = { userId: '2', fullName: 'Project Manager', role: 'PROJECT_MANAGER' };
      const req = createMockRequest({
        session: {
          user,
          csrfToken: '2222222222222222222222222222222222222222222222222222222222222222',
        },
      });
      const res = createMockResponse();
      let nextCalled = false;

      dashboardController.getDashboard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.renderedView, 'dashboards/pm');
      assert.deepStrictEqual(res.renderedData.user, {
        userId: '2',
        fullName: 'Project Manager',
        role: 'PROJECT_MANAGER',
      });
      assert.strictEqual(
        res.renderedData.csrfToken,
        '2222222222222222222222222222222222222222222222222222222222222222'
      );
    });

    it('should map ACCOUNTS to dashboards/accounts and pass user and csrfToken', () => {
      const user = { userId: '3', fullName: 'Accounts Lead', role: 'ACCOUNTS' };
      const req = createMockRequest({
        session: {
          user,
          csrfToken: '3333333333333333333333333333333333333333333333333333333333333333',
        },
      });
      const res = createMockResponse();
      let nextCalled = false;

      dashboardController.getDashboard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.renderedView, 'dashboards/accounts');
      assert.deepStrictEqual(res.renderedData.user, {
        userId: '3',
        fullName: 'Accounts Lead',
        role: 'ACCOUNTS',
      });
      assert.strictEqual(
        res.renderedData.csrfToken,
        '3333333333333333333333333333333333333333333333333333333333333333'
      );
    });

    it('should use res.locals.csrfToken when available', () => {
      const user = { userId: '1', fullName: 'System Owner', role: 'OWNER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse({
        locals: {
          csrfToken: 'from_res_locals_token_44444444444444444444444444444444444444444444',
        },
      });

      dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(
        res.renderedData.csrfToken,
        'from_res_locals_token_44444444444444444444444444444444444444444444'
      );
    });
  });

  describe('Unsupported Roles & Missing/Malformed Session Data', () => {
    it('should return 403 when req is null or undefined', () => {
      const res = createMockResponse();
      let nextCalled = false;

      dashboardController.getDashboard(null, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.responseBody, 'Forbidden');
      assert.strictEqual(res.renderedView, null);
    });

    it('should return 403 when session is missing', () => {
      const req = createMockRequest({ session: null });
      const res = createMockResponse();

      dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.responseBody, 'Forbidden');
      assert.strictEqual(res.renderedView, null);
    });

    it('should return 403 when session.user is missing or not an object', () => {
      const invalidUsers = [null, undefined, 'user', 123, ['array'], true];

      for (const invalidUser of invalidUsers) {
        const req = createMockRequest({ session: { user: invalidUser } });
        const res = createMockResponse();

        dashboardController.getDashboard(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.responseBody, 'Forbidden');
        assert.strictEqual(res.renderedView, null);
      }
    });

    it('should return 403 for unsupported or unknown roles', () => {
      const unsupportedRoles = [
        'ADMIN',
        'SUPERADMIN',
        'GUEST',
        'owner',              // lowercase is not accepted
        'project_manager',
        'accounts',
        '',
        '   ',
        null,
        undefined,
        123,
      ];

      for (const badRole of unsupportedRoles) {
        const req = createMockRequest({
          session: { user: { userId: '1', fullName: 'Test', role: badRole } },
        });
        const res = createMockResponse();

        dashboardController.getDashboard(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.responseBody, 'Forbidden');
        assert.strictEqual(res.renderedView, null);
      }
    });

    it('should return 403 JSON when client does not accept HTML', () => {
      const req = createMockRequest({
        session: null,
        acceptsHtml: false,
      });
      const res = createMockResponse();

      dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res.responseBody, { error: 'Forbidden' });
      assert.strictEqual(res.renderedView, null);
    });
  });

  describe('Protection Against Client-Supplied Role and Identity Tampering', () => {
    it('should strictly ignore client query parameters, body, and headers attempting to change role', () => {
      // User is authenticated as ACCOUNTS in session
      const req = createMockRequest({
        session: {
          user: { userId: '3', fullName: 'Accounts User', role: 'ACCOUNTS' },
          csrfToken: 'tokentokentokentokentokentokentokentokentokentokentokentokentoken12',
        },
        // Client attempts to spoof OWNER role via every possible channel
        query: { role: 'OWNER', user: 'Owner', userId: '1' },
        body: { role: 'OWNER', user: 'Owner', userId: '1' },
        headers: {
          'x-role': 'OWNER',
          'x-user-id': '1',
        },
      });
      const res = createMockResponse();

      dashboardController.getDashboard(req, res, () => {});

      // Controller MUST render accounts dashboard and pass session user only
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.renderedView, 'dashboards/accounts');
      assert.deepStrictEqual(res.renderedData.user, {
        userId: '3',
        fullName: 'Accounts User',
        role: 'ACCOUNTS',
      });
    });

    it('should return 403 when unauthenticated despite client supplying role in query/body', () => {
      const req = createMockRequest({
        session: { user: null },
        query: { role: 'OWNER' },
        body: { role: 'OWNER' },
      });
      const res = createMockResponse();

      dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.renderedView, null);
    });
  });

  describe('Error Handling', () => {
    it('should forward view rendering unexpected errors to next()', () => {
      const renderError = new Error('View template parsing failed');
      const req = createMockRequest({
        session: {
          user: { userId: '1', fullName: 'Owner', role: 'OWNER' },
          csrfToken: '5555555555555555555555555555555555555555555555555555555555555555',
        },
      });
      const res = createMockResponse({ renderError });
      let capturedError = null;

      dashboardController.getDashboard(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, renderError);
    });
  });
});
