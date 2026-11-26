const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
const originalDbCache = require.cache[databaseConfigPath];

let mockQueryHandler = async () => ({ rows: [] });
const recordedQueries = [];

require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      recordedQueries.push({ sql, params });
      return mockQueryHandler(sql, params);
    },
  },
};

const requireProjectAccess = require('../../src/middleware/requireProjectAccess');

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
    params: options.params || {},
    body: options.body || {},
    query: options.query || {},
    accepts(type) {
      if (type === 'html') {
        return acceptsHtml;
      }
      return false;
    },
  };
}

describe('requireProjectAccess Middleware - Isolated Unit Tests', () => {
  beforeEach(() => {
    recordedQueries.length = 0;
    mockQueryHandler = async () => ({ rows: [] });
  });

  after(() => {
    if (originalDbCache !== undefined) {
      require.cache[databaseConfigPath] = originalDbCache;
    } else {
      delete require.cache[databaseConfigPath];
    }
  });

  describe('Configuration Validation', () => {
    it('should throw for invalid source or allowedRoles configuration', () => {
      assert.throws(() => requireProjectAccess({ source: 'headers' }), /Invalid source/);
      assert.throws(() => requireProjectAccess({ allowedRoles: [] }), /cannot be empty/);
      assert.throws(() => requireProjectAccess({ allowedRoles: ['ADMIN'] }), /Invalid role/);
    });
  });

  describe('OWNER Access', () => {
    it('should allow OWNER access to any valid project without querying project_assignments', async () => {
      const guard = requireProjectAccess();
      const req = createMockRequest({
        session: { user: { userId: '1', fullName: 'Owner', role: 'OWNER' } },
        params: { projectId: '999' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.authorizedProjectId, 999);
      assert.strictEqual(res.locals.authorizedProjectId, 999);
      assert.strictEqual(recordedQueries.length, 0, 'OWNER must not be restricted by PM assignment queries');
    });
  });

  describe('PROJECT_MANAGER Access', () => {
    it('should allow PM access when an active assignment exists (ended_at IS NULL)', async () => {
      mockQueryHandler = async (sql, params) => {
        assert.ok(sql.includes('FROM public.project_assignments'));
        assert.ok(sql.includes('project_id = $1'));
        assert.ok(sql.includes('user_id = $2'));
        assert.ok(sql.includes('ended_at IS NULL'));
        assert.deepStrictEqual(params, [101, 4]);
        return { rows: [{ '?column?': 1 }] };
      };

      const guard = requireProjectAccess();
      const req = createMockRequest({
        session: { user: { userId: '4', fullName: 'PM User', role: 'PROJECT_MANAGER' } },
        params: { projectId: '101' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.authorizedProjectId, 101);
      assert.strictEqual(res.locals.authorizedProjectId, 101);
      assert.strictEqual(recordedQueries.length, 1);
    });

    it('should reject PM access with 403 for unassigned projects without exposing project info', async () => {
      mockQueryHandler = async () => ({ rows: [] });

      const guard = requireProjectAccess();
      const req = createMockRequest({
        session: { user: { userId: '4', fullName: 'PM User', role: 'PROJECT_MANAGER' } },
        params: { projectId: '202' },
        acceptsHtml: false,
      });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res.jsonData, { error: 'Forbidden' });
      assert.strictEqual(req.authorizedProjectId, undefined);
    });

    it('should reject PM access with 403 when assignment has ended (ended_at IS NOT NULL)', async () => {
      // Simulate DB returning 0 rows because query enforces ended_at IS NULL
      const assignments = [
        { project_id: 303, user_id: 4, ended_at: '2026-11-01T00:00:00Z' },
      ];
      mockQueryHandler = async (_sql, [projectId, userId]) => {
        const active = assignments.filter(
          (a) => a.project_id === projectId && a.user_id === userId && a.ended_at === null
        );
        return { rows: active };
      };

      const guard = requireProjectAccess();
      const req = createMockRequest({
        session: { user: { userId: 4, fullName: 'PM User', role: 'PROJECT_MANAGER' } },
        params: { projectId: '303' },
        acceptsHtml: true,
      });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.contentType, 'html');
      assert.strictEqual(res.sendData, 'Forbidden');
    });

    it('should support reading projectId from req.body or custom paramName', async () => {
      mockQueryHandler = async (_sql, params) => {
        assert.deepStrictEqual(params, [55, 7]);
        return { rows: [{ '?column?': 1 }] };
      };

      const guard = requireProjectAccess({ source: 'body', paramName: 'targetProjectId' });
      const req = createMockRequest({
        session: { user: { userId: '7', fullName: 'PM User', role: 'PROJECT_MANAGER' } },
        body: { targetProjectId: '55' },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.authorizedProjectId, 55);
    });

    it('should forward database errors safely without leaking raw SQL errors', async () => {
      mockQueryHandler = async () => {
        throw new Error('relation "project_assignments" connection refused');
      };

      const guard = requireProjectAccess();
      const req = createMockRequest({
        session: { user: { userId: '4', fullName: 'PM User', role: 'PROJECT_MANAGER' } },
        params: { projectId: '101' },
      });
      const res = createMockResponse();
      let capturedErr = null;

      await guard(req, res, (err) => {
        capturedErr = err;
      });

      assert.ok(capturedErr instanceof Error);
      assert.strictEqual(capturedErr.message, 'Failed to verify project access');
    });
  });

  describe('Missing or Invalid Session', () => {
    it('should redirect to /login for HTML requests when session is missing or invalid', async () => {
      const guard = requireProjectAccess();
      const invalidSessions = [
        null,
        {},
        { user: null },
        { user: { userId: 'abc', role: 'PROJECT_MANAGER' } },
        { user: { userId: 0, role: 'OWNER' } },
        { user: { userId: '1', role: 'INVALID_ROLE' } },
      ];

      for (const session of invalidSessions) {
        const req = createMockRequest({ session, params: { projectId: '101' }, acceptsHtml: true });
        const res = createMockResponse();
        let nextCalled = false;

        await guard(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.redirectUrl, '/login');
        assert.strictEqual(recordedQueries.length, 0);
      }
    });

    it('should return 401 JSON for non-HTML requests when session is missing', async () => {
      const guard = requireProjectAccess();
      const req = createMockRequest({ session: null, params: { projectId: '101' }, acceptsHtml: false });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res.jsonData, { error: 'Unauthorized' });
    });
  });

  describe('Invalid Project Identifiers', () => {
    it('should reject invalid project IDs with 400 without querying the database', async () => {
      const guard = requireProjectAccess();
      const invalidIds = [undefined, null, '', '   ', '0', '-5', '1.5', 'abc', '101; DROP TABLE projects', 'NaN'];

      for (const badId of invalidIds) {
        const req = createMockRequest({
          session: { user: { userId: '4', fullName: 'PM User', role: 'PROJECT_MANAGER' } },
          params: { projectId: badId },
          acceptsHtml: false,
        });
        const res = createMockResponse();
        let nextCalled = false;

        await guard(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.jsonData, { error: 'Invalid project identifier' });
        assert.strictEqual(recordedQueries.length, 0);
      }
    });
  });

  describe('Other Roles Attempting Restricted PM Operations', () => {
    it('should reject ACCOUNTS role with 403 Forbidden without querying project_assignments', async () => {
      const guard = requireProjectAccess();
      const req = createMockRequest({
        session: { user: { userId: '3', fullName: 'Accounts User', role: 'ACCOUNTS' } },
        params: { projectId: '101' },
        acceptsHtml: false,
      });
      const res = createMockResponse();
      let nextCalled = false;

      await guard(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res.jsonData, { error: 'Forbidden' });
      assert.strictEqual(recordedQueries.length, 0);
    });
  });
});
