const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const requireAuth = require('../../src/middleware/requireAuth');

function createMockResponse(options = {}) {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    redirectUrl: null,
    jsonData: null,
    headersSent: options.headersSent || false,
    locals: options.locals || {},
    set(key, value) {
      headers[key.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
    json(data) {
      this.jsonData = data;
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

describe('requireAuth Middleware - Isolated Unit Tests', () => {
  describe('Exports', () => {
    it('should export the middleware function and ALLOWED_ROLES set', () => {
      assert.strictEqual(typeof requireAuth, 'function');
      assert.strictEqual(typeof requireAuth.requireAuth, 'function');
      assert.ok(requireAuth.ALLOWED_ROLES instanceof Set);
      assert.deepStrictEqual(
        Array.from(requireAuth.ALLOWED_ROLES).sort(),
        ['ACCOUNTS', 'OWNER', 'PROJECT_MANAGER'].sort()
      );
    });
  });

  describe('Authenticated Access with Allowed Roles', () => {
    it('should allow access for OWNER with string userId', () => {
      const user = { userId: '1', fullName: 'System Owner', role: 'OWNER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true, 'next() should be called');
      assert.strictEqual(res.redirectUrl, null);
      assert.deepStrictEqual(res.locals.user, user);
      assert.strictEqual(
        res.headers['cache-control'],
        'no-store, no-cache, must-revalidate, private'
      );
    });

    it('should allow access for PROJECT_MANAGER with string userId', () => {
      const user = { userId: '2', fullName: 'Project Manager', role: 'PROJECT_MANAGER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(res.redirectUrl, null);
      assert.deepStrictEqual(res.locals.user, user);
    });

    it('should allow access for ACCOUNTS with string userId', () => {
      const user = { userId: '3', fullName: 'Accounts Lead', role: 'ACCOUNTS' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(res.redirectUrl, null);
      assert.deepStrictEqual(res.locals.user, user);
    });

    it('should allow access when userId is a valid positive integer', () => {
      const user = { userId: 42, fullName: 'Numeric User', role: 'OWNER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(res.redirectUrl, null);
    });
  });

  describe('Unauthenticated and Missing Session Scenarios', () => {
    it('should redirect to /login when req is undefined or null', () => {
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(null, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should redirect to /login when session is missing', () => {
      const req = createMockRequest({ session: null });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should redirect to /login when session.user is missing or null', () => {
      const req = createMockRequest({ session: {} });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should redirect to /login when session.user is not a valid object', () => {
      const invalidUsers = ['string_user', 12345, true, ['array_user'], null];

      for (const invalidUser of invalidUsers) {
        const req = createMockRequest({ session: { user: invalidUser } });
        const res = createMockResponse();
        let nextCalled = false;

        requireAuth(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.redirectUrl, '/login');
      }
    });
  });

  describe('Malformed or Unsupported Session Data', () => {
    it('should redirect to /login when userId is missing, empty, or whitespace', () => {
      const emptyUserIds = ['', '   ', '\t\n', null, undefined, {}, []];

      for (const emptyId of emptyUserIds) {
        const user = { userId: emptyId, role: 'OWNER' };
        const req = createMockRequest({ session: { user } });
        const res = createMockResponse();
        let nextCalled = false;

        requireAuth(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.redirectUrl, '/login');
      }
    });

    it('should redirect to /login when userId is a non-positive or non-integer number', () => {
      const invalidNumericIds = [0, -1, -99, 1.5, NaN, Infinity];

      for (const badId of invalidNumericIds) {
        const user = { userId: badId, role: 'OWNER' };
        const req = createMockRequest({ session: { user } });
        const res = createMockResponse();
        let nextCalled = false;

        requireAuth(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.redirectUrl, '/login');
      }
    });

    it('should redirect to /login when role is unsupported or invalid', () => {
      const invalidRoles = [
        'ADMIN',
        'SUPERADMIN',
        'GUEST',
        'owner',              // case-sensitive: must be exact uppercase
        'project_manager',
        'accounts',
        '',
        '   ',
        null,
        undefined,
        1,
        {},
      ];

      for (const badRole of invalidRoles) {
        const user = { userId: '1', role: badRole };
        const req = createMockRequest({ session: { user } });
        const res = createMockResponse();
        let nextCalled = false;

        requireAuth(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.redirectUrl, '/login');
      }
    });
  });

  describe('Protection Against Client-Supplied Role Tampering', () => {
    it('should ignore client query parameter role spoofing when session is unauthenticated', () => {
      const req = createMockRequest({
        session: null,
        query: { role: 'OWNER', userId: '1' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should ignore client body or header role spoofing when session user has invalid role', () => {
      const req = createMockRequest({
        session: { user: { userId: '1', role: 'INVALID_ROLE' } },
        body: { role: 'OWNER' },
        headers: { 'x-role': 'OWNER' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });
  });

  describe('Non-HTML Requests and Response State', () => {
    it('should return 401 JSON for non-HTML requests when unauthenticated', () => {
      const req = createMockRequest({
        session: null,
        acceptsHtml: false,
      });
      const res = createMockResponse();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res.jsonData, { error: 'Unauthorized' });
      assert.strictEqual(res.redirectUrl, null);
    });

    it('should not redirect if response headers have already been sent', () => {
      const req = createMockRequest({ session: null });
      const res = createMockResponse({ headersSent: true });
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, null);
    });
  });
});
