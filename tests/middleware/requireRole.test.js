const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const requireRole = require('../../src/middleware/requireRole');

function createMockResponse(options = {}) {
  return {
    statusCode: 200,
    redirectUrl: null,
    jsonData: null,
    sendData: null,
    contentType: null,
    headersSent: options.headersSent || false,
    locals: options.locals || {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(val) {
      this.contentType = val;
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
    send(data) {
      this.sendData = data;
      return this;
    },
  };
}

function createMockRequest(options = {}) {
  const acceptsHtml = options.acceptsHtml !== undefined ? options.acceptsHtml : true;
  return {
    session: options.session !== undefined ? options.session : null,
    accepts(type) {
      if (type === 'html') {
        return acceptsHtml;
      }
      return false;
    },
  };
}

describe('requireRole Middleware - Isolated Unit Tests', () => {
  describe('Configuration Validation', () => {
    it('should throw when called with no roles', () => {
      assert.throws(() => requireRole(), /at least one allowed role/);
      assert.throws(() => requireRole([]), /at least one allowed role/);
    });

    it('should throw when configured with an unsupported role', () => {
      assert.throws(() => requireRole('ADMIN'), /Invalid role/);
      assert.throws(() => requireRole('OWNER', 'owner'), /Invalid role/);
    });
  });

  describe('Role Enforcement', () => {
    it('should allow access when user role matches single allowed role', () => {
      const guard = requireRole('PROJECT_MANAGER');
      const req = createMockRequest({
        session: { user: { userId: '4', fullName: 'PM User', role: 'PROJECT_MANAGER' } },
      });
      const res = createMockResponse();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(res.statusCode, 200);
    });

    it('should allow access when user role matches one of multiple allowed roles (variadic or array)', () => {
      const guardVariadic = requireRole('OWNER', 'PROJECT_MANAGER');
      const guardArray = requireRole(['OWNER', 'ACCOUNTS']);

      const ownerReq = createMockRequest({
        session: { user: { userId: '1', fullName: 'Owner', role: 'OWNER' } },
      });
      const pmReq = createMockRequest({
        session: { user: { userId: '2', fullName: 'PM', role: 'PROJECT_MANAGER' } },
      });
      const accReq = createMockRequest({
        session: { user: { userId: '3', fullName: 'Accounts', role: 'ACCOUNTS' } },
      });

      let ownerNext = false;
      guardVariadic(ownerReq, createMockResponse(), () => { ownerNext = true; });
      assert.strictEqual(ownerNext, true);

      let pmNext = false;
      guardVariadic(pmReq, createMockResponse(), () => { pmNext = true; });
      assert.strictEqual(pmNext, true);

      let accNext = false;
      guardArray(accReq, createMockResponse(), () => { accNext = true; });
      assert.strictEqual(accNext, true);
    });

    it('should reject disallowed role with 403 HTML for browser requests', () => {
      const guard = requireRole('OWNER', 'PROJECT_MANAGER');
      const req = createMockRequest({
        session: { user: { userId: '3', fullName: 'Accounts', role: 'ACCOUNTS' } },
        acceptsHtml: true,
      });
      const res = createMockResponse();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.contentType, 'html');
      assert.strictEqual(res.sendData, 'Forbidden');
    });

    it('should reject disallowed role with 403 JSON for API requests', () => {
      const guard = requireRole('PROJECT_MANAGER');
      const req = createMockRequest({
        session: { user: { userId: '3', fullName: 'Accounts', role: 'ACCOUNTS' } },
        acceptsHtml: false,
      });
      const res = createMockResponse();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res.jsonData, { error: 'Forbidden' });
    });

    it('should reject PROJECT_MANAGER from OWNER-only routes with 403', () => {
      const guard = requireRole('OWNER');
      const req = createMockRequest({
        session: { user: { userId: '2', fullName: 'PM', role: 'PROJECT_MANAGER' } },
        acceptsHtml: false,
      });
      const res = createMockResponse();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res.jsonData, { error: 'Forbidden' });
    });
  });

  describe('Missing or Invalid Session Handling', () => {
    it('should redirect to /login for HTML requests when session is missing', () => {
      const guard = requireRole('OWNER');
      const req = createMockRequest({ session: null, acceptsHtml: true });
      const res = createMockResponse();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.redirectUrl, '/login');
    });

    it('should return 401 JSON for non-HTML requests when session or user is invalid', () => {
      const guard = requireRole('OWNER');
      const invalidSessions = [
        null,
        {},
        { user: null },
        { user: { userId: '', role: 'OWNER' } },
        { user: { userId: '1', role: 'UNKNOWN' } },
      ];

      for (const session of invalidSessions) {
        const req = createMockRequest({ session, acceptsHtml: false });
        const res = createMockResponse();
        let nextCalled = false;

        guard(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
        assert.deepStrictEqual(res.jsonData, { error: 'Unauthorized' });
      }
    });
  });
});
