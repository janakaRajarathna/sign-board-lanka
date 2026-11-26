'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ── Mock database ──────────────────────────────────────────────────────────
const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: () => { throw new Error('Real DB must not be called in controller unit tests'); },
  },
};

// ── Mock projectService before requiring controller ────────────────────────
const projectServicePath = path.resolve(__dirname, '../../src/services/projectService.js');

let mockListProjects = async () => ({
  projects: [],
  stages: [],
  pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
  filters: { search: '', status: '', stageId: '' },
});
let mockGetProjectDetails = async () => null;

require.cache[projectServicePath] = {
  id: projectServicePath,
  filename: projectServicePath,
  loaded: true,
  exports: {
    listProjects: async (...args) => mockListProjects(...args),
    getProjectDetails: async (...args) => mockGetProjectDetails(...args),
    parsePositiveInteger: (v) => {
      if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null;
      if (typeof v === 'string') {
        const n = Number(v.trim());
        return /^\d+$/.test(v.trim()) && n > 0 ? n : null;
      }
      return null;
    },
  },
};

const projectController = require('../../src/controllers/projectController');

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockRequest({ role = 'OWNER', userId = '1', query = {}, params = {}, authorizedProjectId = null } = {}) {
  return {
    session: { user: { userId, role, fullName: 'Test User' } },
    query,
    params,
    authorizedProjectId,
    accepts: () => true,
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    _view: null,
    _locals: null,
    headersSent: false,
    status(code) { this.statusCode = code; return this; },
    render(view, locals) { this._view = view; this._locals = locals; },
    json(data) { this._json = data; },
    type() { return this; },
    send() { return this; },
  };
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('projectController.getProjects', () => {
  beforeEach(() => {
    mockListProjects = async () => ({
      projects: [],
      stages: [],
      pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
      filters: { search: '', status: '', stageId: '' },
    });
  });

  it('1. OWNER – calls listProjects with role=OWNER and renders projects/index', async () => {
    let capturedArgs = null;
    mockListProjects = async (args) => { capturedArgs = args; return { projects: [], stages: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }, filters: {} }; };

    const req = createMockRequest({ role: 'OWNER', userId: '1', query: {} });
    const res = createMockResponse();
    const next = (err) => { throw err || new Error('next called unexpectedly'); };

    await projectController.getProjects(req, res, next);

    assert.strictEqual(res._view, 'projects/index');
    assert.strictEqual(capturedArgs.role, 'OWNER');
    assert.strictEqual(capturedArgs.userId, '1');
  });

  it('2. PROJECT_MANAGER – calls listProjects with role=PROJECT_MANAGER and correct userId', async () => {
    let capturedArgs = null;
    mockListProjects = async (args) => { capturedArgs = args; return { projects: [], stages: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }, filters: {} }; };

    const req = createMockRequest({ role: 'PROJECT_MANAGER', userId: '7', query: {} });
    const res = createMockResponse();
    const next = (err) => { if (err) throw err; };

    await projectController.getProjects(req, res, next);

    assert.strictEqual(capturedArgs.role, 'PROJECT_MANAGER');
    assert.strictEqual(capturedArgs.userId, '7');
  });

  it('3. Valid status filter is forwarded to service', async () => {
    let capturedArgs = null;
    mockListProjects = async (args) => { capturedArgs = args; return { projects: [], stages: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }, filters: {} }; };

    const req = createMockRequest({ role: 'OWNER', query: { status: 'COMPLETED' } });
    const res = createMockResponse();
    await projectController.getProjects(req, res, () => {});

    assert.strictEqual(capturedArgs.status, 'COMPLETED');
  });

  it('4. Invalid status filter is sanitized to empty string', async () => {
    let capturedArgs = null;
    mockListProjects = async (args) => { capturedArgs = args; return { projects: [], stages: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }, filters: {} }; };

    const req = createMockRequest({ role: 'OWNER', query: { status: 'INVALID' } });
    const res = createMockResponse();
    await projectController.getProjects(req, res, () => {});

    assert.strictEqual(capturedArgs.status, '');
  });

  it('5. Service error is forwarded to next()', async () => {
    const serviceErr = new Error('DB crashed');
    mockListProjects = async () => { throw serviceErr; };

    const req = createMockRequest({ role: 'OWNER', query: {} });
    const res = createMockResponse();
    let caughtErr = null;
    await projectController.getProjects(req, res, (err) => { caughtErr = err; });

    assert.strictEqual(caughtErr, serviceErr);
  });

  it('6. Render locals include user, csrfToken, data', async () => {
    const req = createMockRequest({ role: 'OWNER', query: {} });
    const res = createMockResponse();
    await projectController.getProjects(req, res, () => {});

    assert.ok(res._locals.user, 'locals.user must be present');
    assert.ok(typeof res._locals.csrfToken === 'string', 'locals.csrfToken must be a string');
    assert.ok(res._locals.data, 'locals.data must be present');
  });
  it('6b. Missing session user returns 403 without calling service', async () => {
    let called = false;
    mockListProjects = async () => { called = true; return {}; };
    const req = createMockRequest();
    req.session = {};
    const res = createMockResponse();
    await projectController.getProjects(req, res, () => {});
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(called, false);
  });
});

describe('projectController.getProjectDetails', () => {
  const sampleProject = {
    projectId: 1,
    projectCode: 'PRJ-2026-001',
    projectName: 'Test Sign',
    description: null,
    projectAddress: null,
    projectLocation: null,
    projectStatus: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: null,
    completedAt: null,
    createdByName: 'Admin',
    assignedPmName: null,
    customer: { customerId: 1, fullName: 'CustA', email: null, phone: null, address: null },
    stage: { stageId: 1, stageOrder: 1, stageName: 'PROJECT_REGISTRATION' },
    history: [],
  };

  beforeEach(() => {
    mockGetProjectDetails = async () => sampleProject;
  });

  it('7. Returns 404 when project not found (service returns null)', async () => {
    mockGetProjectDetails = async () => null;
    const req = createMockRequest({ authorizedProjectId: 999 });
    const res = createMockResponse();
    let caughtErr = null;
    await projectController.getProjectDetails(req, res, (err) => { caughtErr = err; });

    assert.ok(caughtErr instanceof Error);
    assert.strictEqual(caughtErr.statusCode, 404);
  });

  it('8. Renders projects/detail on successful lookup', async () => {
    const req = createMockRequest({ authorizedProjectId: 1 });
    const res = createMockResponse();
    await projectController.getProjectDetails(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res._view, 'projects/detail');
    assert.ok(res._locals.p, 'locals.p must be set');
    assert.strictEqual(res._locals.p.projectCode, 'PRJ-2026-001');
  });

  it('9. Service error is forwarded to next()', async () => {
    const serviceErr = new Error('timeout');
    mockGetProjectDetails = async () => { throw serviceErr; };

    const req = createMockRequest({ authorizedProjectId: 1 });
    const res = createMockResponse();
    let caughtErr = null;
    await projectController.getProjectDetails(req, res, (err) => { caughtErr = err; });

    assert.strictEqual(caughtErr, serviceErr);
  });

  it('10. Render locals include user, csrfToken, p', async () => {
    const req = createMockRequest({ authorizedProjectId: 1 });
    const res = createMockResponse();
    await projectController.getProjectDetails(req, res, () => {});

    assert.ok(res._locals.user, 'locals.user must be present');
    assert.ok(typeof res._locals.csrfToken === 'string', 'locals.csrfToken must be a string');
    assert.ok(res._locals.p, 'locals.p must be present');
  });
});
