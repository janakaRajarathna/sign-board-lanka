const { describe, it, beforeEach } = require('node:test');
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

// Mock authService before requiring authController
const authServicePath = path.resolve(__dirname, '../../src/services/authService.js');
let mockLoginResult = null;
let mockLoginError = null;

require.cache[authServicePath] = {
  id: authServicePath,
  filename: authServicePath,
  loaded: true,
  exports: {
    login: async (email, password) => {
      if (mockLoginError) {
        throw mockLoginError;
      }
      return mockLoginResult;
    },
  },
};

const authController = require('../../src/controllers/authController');

function createMockResponse() {
  const res = {
    statusCode: 200,
    renderedView: null,
    renderedData: null,
    redirectUrl: null,
    clearedCookies: [],
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, data) {
      this.renderedView = view;
      this.renderedData = data;
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    },
  };
  return res;
}

function createMockRequest(options = {}) {
  const session =
    options.session !== undefined
      ? options.session
      : {
          csrfToken: 'existing_csrf_token_abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
          user: options.user || null,
          regenerate(callback) {
            if (options.regenerateError) {
              return callback(options.regenerateError);
            }
            delete this.user;
            delete this.csrfToken;
            this.id = 'new_session_id_999';
            callback(null);
          },
          save(callback) {
            if (options.saveError) {
              return callback(options.saveError);
            }
            callback(null);
          },
          destroy(callback) {
            if (options.destroyError) {
              return callback(options.destroyError);
            }
            callback(null);
          },
        };

  return {
    method: options.method || 'GET',
    body: options.body || {},
    session,
  };
}

describe('authController - Isolated Unit Tests', () => {
  beforeEach(() => {
    mockLoginResult = null;
    mockLoginError = null;
  });

  describe('getLogin', () => {
    it('should redirect already-authenticated users to /dashboard', () => {
      const req = createMockRequest({
        user: { userId: '1', fullName: 'Test User', role: 'admin' },
      });
      const res = createMockResponse();

      authController.getLogin(req, res);

      assert.strictEqual(res.redirectUrl, '/dashboard');
      assert.strictEqual(res.renderedView, null);
    });

    it('should render login view with loginError: null and CSRF token for unauthenticated users', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      authController.getLogin(req, res);

      assert.strictEqual(res.redirectUrl, null);
      assert.strictEqual(res.renderedView, 'login');
      assert.strictEqual(res.renderedData.loginError, null);
      assert.ok(typeof res.renderedData.csrfToken === 'string');
      assert.strictEqual(res.renderedData.csrfToken.length, 64);
    });
  });

  describe('postLogin', () => {
    it('should redirect already-authenticated users to /dashboard', async () => {
      const req = createMockRequest({
        method: 'POST',
        user: { userId: '2', fullName: 'Logged In User', role: 'manager' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await authController.postLogin(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(res.redirectUrl, '/dashboard');
      assert.strictEqual(nextCalled, false);
    });

    it('should return 401 and re-render login with error message on authentication failure', async () => {
      mockLoginResult = {
        success: false,
        message: 'Invalid email or password.',
      };

      const req = createMockRequest({
        method: 'POST',
        body: { email: 'wrong@example.com', password: 'badpassword' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await authController.postLogin(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.renderedView, 'login');
      assert.strictEqual(res.renderedData.loginError, 'Invalid email or password.');
      assert.ok(typeof res.renderedData.csrfToken === 'string');
      assert.strictEqual(res.renderedData.csrfToken.length, 64);
      assert.strictEqual(nextCalled, false);
    });

    it('should regenerate session, store minimal user data, generate fresh CSRF token, save, and redirect to /dashboard on success', async () => {
      mockLoginResult = {
        success: true,
        user: {
          userId: '101',
          fullName: 'Alice Johnson',
          role: 'owner',
        },
      };

      let regenerated = false;
      let saved = false;

      const req = {
        method: 'POST',
        body: { email: 'alice@example.com', password: 'correctpassword' },
        session: {
          csrfToken: 'old_csrf_token_111111111111111111111111111111111111111111111111111111111111',
          regenerate(cb) {
            regenerated = true;
            delete this.csrfToken;
            cb(null);
          },
          save(cb) {
            saved = true;
            cb(null);
          },
        },
      };

      const res = createMockResponse();
      let nextCalled = false;

      await authController.postLogin(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(regenerated, true, 'Session should be regenerated');
      assert.strictEqual(saved, true, 'Session should be saved before redirect');
      assert.strictEqual(res.redirectUrl, '/dashboard', 'Should redirect to /dashboard');

      // Verify minimal session user data (no passwords or sensitive data)
      assert.deepStrictEqual(req.session.user, {
        userId: '101',
        fullName: 'Alice Johnson',
        role: 'owner',
      });

      // Verify fresh CSRF token generated in the new session
      assert.ok(typeof req.session.csrfToken === 'string');
      assert.strictEqual(req.session.csrfToken.length, 64);
      assert.notStrictEqual(
        req.session.csrfToken,
        'old_csrf_token_111111111111111111111111111111111111111111111111111111111111'
      );

      assert.strictEqual(nextCalled, false);
    });

    it('should forward session regeneration error to next()', async () => {
      mockLoginResult = {
        success: true,
        user: {
          userId: '102',
          fullName: 'Bob Smith',
          role: 'pm',
        },
      };

      const regenError = new Error('Session store regeneration error');
      const req = createMockRequest({
        method: 'POST',
        body: { email: 'bob@example.com', password: 'pwd' },
        regenerateError: regenError,
      });
      const res = createMockResponse();

      let capturedError = null;
      await authController.postLogin(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, regenError);
      assert.strictEqual(res.redirectUrl, null);
    });

    it('should forward session save error to next()', async () => {
      mockLoginResult = {
        success: true,
        user: {
          userId: '103',
          fullName: 'Charlie Davis',
          role: 'accounts',
        },
      };

      const saveError = new Error('Session store save failure');
      const req = createMockRequest({
        method: 'POST',
        body: { email: 'charlie@example.com', password: 'pwd' },
        saveError,
      });
      const res = createMockResponse();

      let capturedError = null;
      await authController.postLogin(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, saveError);
      assert.strictEqual(res.redirectUrl, null);
    });

    it('should forward authService unexpected exceptions to next()', async () => {
      const unexpectedError = new Error('Database lookup failed');
      mockLoginError = unexpectedError;

      const req = createMockRequest({
        method: 'POST',
        body: { email: 'error@example.com', password: 'pwd' },
      });
      const res = createMockResponse();

      let capturedError = null;
      await authController.postLogin(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, unexpectedError);
      assert.strictEqual(res.redirectUrl, null);
    });
  });

  describe('postLogout', () => {
    it('should destroy session, clear connect.sid cookie, and redirect to /login on success', () => {
      let destroyCalled = false;
      const req = {
        method: 'POST',
        session: {
          destroy(callback) {
            destroyCalled = true;
            callback(null);
          },
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      authController.postLogout(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(destroyCalled, true, 'Session destroy must be called');
      assert.strictEqual(nextCalled, false, 'next() should not be called on success');
      assert.strictEqual(res.redirectUrl, '/login', 'Should redirect to /login');
      assert.strictEqual(res.clearedCookies.length, 1);
      assert.strictEqual(res.clearedCookies[0].name, 'connect.sid');
    });

    it('should verify the strict ordering: destroy -> clearCookie -> redirect', () => {
      const order = [];
      const req = {
        method: 'POST',
        session: {
          destroy(callback) {
            order.push('destroy');
            callback(null);
          },
        },
      };
      const res = {
        clearCookie(name) {
          order.push(`clearCookie:${name}`);
        },
        redirect(url) {
          order.push(`redirect:${url}`);
        },
      };

      authController.postLogout(req, res, () => {});

      assert.deepStrictEqual(order, [
        'destroy',
        'clearCookie:connect.sid',
        'redirect:/login',
      ]);
    });

    it('should forward session destruction error to next(err) and NOT clear cookie or redirect', () => {
      const destroyError = new Error('PostgreSQL session deletion failed');
      const req = createMockRequest({
        method: 'POST',
        destroyError,
      });
      const res = createMockResponse();

      let capturedError = null;
      authController.postLogout(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, destroyError);
      assert.strictEqual(res.redirectUrl, null, 'Must not redirect on destroy error');
      assert.strictEqual(res.clearedCookies.length, 0, 'Must not clear cookie on destroy error');
    });

    it('should handle missing session safely by redirecting to /login without errors', () => {
      const req = createMockRequest({ session: null });
      const res = createMockResponse();
      let nextCalled = false;

      authController.postLogout(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should handle null or undefined req safely', () => {
      const res = createMockResponse();
      let nextCalled = false;

      authController.postLogout(null, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should handle session without destroy function safely', () => {
      const req = { session: {} };
      const res = createMockResponse();
      let nextCalled = false;

      authController.postLogout(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });
  });
});
