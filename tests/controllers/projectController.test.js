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
let mockSearchActiveCustomers = async () => [];
let mockListActiveProjectManagers = async () => [];
let mockCreateProject = async () => ({ projectId: 101, projectCode: 'SBL-2026-0001', customerId: 10 });
let mockCancelProject = async (projectId) => ({ projectId });

class MockProjectCreationError extends Error {
  constructor(message, { statusCode = 400, fieldErrors = {}, duplicateCustomer = null } = {}) {
    super(message);
    this.name = 'ProjectCreationError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.duplicateCustomer = duplicateCustomer;
  }
}

class MockProjectCancellationError extends Error {
  constructor(message, { statusCode = 400 } = {}) {
    super(message);
    this.name = 'ProjectCancellationError';
    this.statusCode = statusCode;
  }
}

require.cache[projectServicePath] = {
  id: projectServicePath,
  filename: projectServicePath,
  loaded: true,
  exports: {
    listProjects: async (...args) => mockListProjects(...args),
    getProjectDetails: async (...args) => mockGetProjectDetails(...args),
    searchActiveCustomers: async (...args) => mockSearchActiveCustomers(...args),
    listActiveProjectManagers: async (...args) => mockListActiveProjectManagers(...args),
    createProject: async (...args) => mockCreateProject(...args),
    ProjectCreationError: MockProjectCreationError,
    cancelProject: async (...args) => mockCancelProject(...args),
    ProjectCancellationError: MockProjectCancellationError,
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

function createMockRequest({ role = 'OWNER', userId = '1', query = {}, params = {}, body = {}, authorizedProjectId = null } = {}) {
  return {
    session: { user: { userId, role, fullName: 'Test User' } },
    query,
    params,
    body,
    authorizedProjectId,
    accepts: () => true,
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    _view: null,
    _locals: null,
    _redirect: null,
    _json: null,
    headersSent: false,
    status(code) { this.statusCode = code; return this; },
    render(view, locals) { this._view = view; this._locals = locals; },
    redirect(url) { this.statusCode = 302; this._redirect = url; },
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

describe('projectController.getNewProject', () => {
  beforeEach(() => {
    mockListActiveProjectManagers = async () => [{ userId: 3, fullName: 'Kasun PM', email: 'kasun@test.local' }];
  });

  it('11. Renders projects/new with user, csrfToken, and active projectManagers', async () => {
    const req = createMockRequest({ role: 'OWNER', userId: '1' });
    const res = createMockResponse();
    await projectController.getNewProject(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res._view, 'projects/new');
    assert.ok(res._locals.user, 'locals.user must be present');
    assert.ok(typeof res._locals.csrfToken === 'string', 'locals.csrfToken must be a string');
    assert.strictEqual(res._locals.projectManagers.length, 1);
  });

  it('12. Missing session user returns 403', async () => {
    const req = createMockRequest();
    req.session = {};
    const res = createMockResponse();
    await projectController.getNewProject(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });
});

describe('projectController.searchCustomers & getActiveProjectManagers', () => {
  it('13. searchCustomers returns empty list for queries < 2 chars', async () => {
    const req = createMockRequest({ query: { q: 'a' } });
    const res = createMockResponse();
    await projectController.searchCustomers(req, res, (err) => { if (err) throw err; });

    assert.deepStrictEqual(res._json, { customers: [] });
  });

  it('14. searchCustomers forwards query >= 2 chars to service', async () => {
    mockSearchActiveCustomers = async (q) => [{ customerId: 5, fullName: 'Dialog', email: q, phone: '123', address: 'Col' }];
    const req = createMockRequest({ query: { q: 'dialog' } });
    const res = createMockResponse();
    await projectController.searchCustomers(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res._json.customers.length, 1);
    assert.strictEqual(res._json.customers[0].customerId, 5);
  });

  it('15. getActiveProjectManagers returns managers list', async () => {
    mockListActiveProjectManagers = async () => [{ userId: 4, fullName: 'PM 1', email: 'pm1@test.local' }];
    const req = createMockRequest();
    const res = createMockResponse();
    await projectController.getActiveProjectManagers(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res._json.managers.length, 1);
  });
});

describe('projectController.postCreateProject', () => {
  it('16. Validation failure returns 400 and preserves formValues', async () => {
    mockListActiveProjectManagers = async () => [];
    const req = createMockRequest({
      body: {
        customerMode: 'existing',
        customerId: '',
        projectName: 'Preserved Project Name',
        projectAddress: '',
      },
    });
    const res = createMockResponse();
    await projectController.postCreateProject(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res._view, 'projects/new');
    assert.strictEqual(res._locals.formValues.projectName, 'Preserved Project Name');
    assert.ok(res._locals.errors.customerId);
  });

  it('17. Domain error (409 duplicate email) renders projects/new with duplicateCustomer', async () => {
    mockListActiveProjectManagers = async () => [];
    mockCreateProject = async () => {
      throw new MockProjectCreationError('Duplicate email', {
        statusCode: 409,
        fieldErrors: { customerEmail: 'Already exists' },
        duplicateCustomer: { customerId: 7, fullName: 'Existing', email: 'e@e.lk', phone: '1', address: 'A' },
      });
    };

    const req = createMockRequest({
      body: {
        customerMode: 'new',
        customerFullName: 'Existing',
        customerEmail: 'e@e.lk',
        customerPhone: '12345',
        customerAddress: 'Addr',
        projectName: 'Sign',
        projectAddress: 'Addr',
      },
    });
    const res = createMockResponse();
    await projectController.postCreateProject(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res._view, 'projects/new');
    assert.strictEqual(res._locals.duplicateCustomer.customerId, 7);
  });

  it('18. Success passes session userId to createProject and redirects to /projects/:projectId', async () => {
    let capturedOwnerId = null;
    mockCreateProject = async (_data, ownerId) => {
      capturedOwnerId = ownerId;
      return { projectId: 42, projectCode: 'SBL-2026-0001', customerId: 5 };
    };

    const req = createMockRequest({
      role: 'OWNER',
      userId: '1',
      body: {
        customerMode: 'existing',
        customerId: '5',
        projectName: 'Valid Sign',
        projectAddress: 'Colombo 02',
        createdBy: '999',
      },
    });
    const res = createMockResponse();
    await projectController.postCreateProject(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(capturedOwnerId, '1');
    assert.strictEqual(res._redirect, '/projects/42');
  });
});

describe('projectController.postCancelProject', () => {
  beforeEach(() => {
    mockGetProjectDetails = async (id) => ({
      projectId: id,
      projectCode: 'SBL-2026-0001',
      projectName: 'Test Project',
      projectStatus: 'ACTIVE',
      customer: { customerId: 1, fullName: 'Customer' },
      stage: { stageId: 1, stageOrder: 1, stageName: 'PROJECT_REGISTRATION' },
      history: [],
    });
    mockCancelProject = async (projectId) => ({ projectId });
  });

  it('19. Missing session user returns 403', async () => {
    const req = createMockRequest({ authorizedProjectId: 1, body: { reason: 'Valid reason' } });
    req.session = {};
    const res = createMockResponse();
    await projectController.postCancelProject(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });

  it('20. Validation failure (empty or >500 reason) returns 400 and renders projects/detail with cancelError', async () => {
    const req = createMockRequest({
      authorizedProjectId: 5,
      body: { reason: '   ' },
    });
    const res = createMockResponse();
    await projectController.postCancelProject(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res._view, 'projects/detail');
    assert.ok(res._locals.cancelError.includes('required'));
    assert.ok(typeof res._locals.csrfToken === 'string');

    const jsonReq = createMockRequest({
      authorizedProjectId: 5,
      body: { reason: 'X'.repeat(501) },
    });
    jsonReq.accepts = () => false;
    const jsonRes = createMockResponse();
    await projectController.postCancelProject(jsonReq, jsonRes, (err) => { if (err) throw err; });

    assert.strictEqual(jsonRes.statusCode, 400);
    assert.ok(jsonRes._json.errors.reason);
  });

  it('21. Validation failure forwards 404 to next() when project no longer exists', async () => {
    mockGetProjectDetails = async () => null;
    const req = createMockRequest({ authorizedProjectId: 999, body: { reason: '' } });
    const res = createMockResponse();
    let capturedErr = null;
    await projectController.postCancelProject(req, res, (err) => { capturedErr = err; });

    assert.ok(capturedErr);
    assert.strictEqual(capturedErr.statusCode, 404);
  });

  it('22. Success calls cancelProject with session userId and trimmed reason, then redirects', async () => {
    let captured = null;
    mockCancelProject = async (projectId, ownerId, reason) => {
      captured = { projectId, ownerId, reason };
      return { projectId };
    };

    const req = createMockRequest({
      role: 'OWNER',
      userId: '1',
      authorizedProjectId: 12,
      body: { reason: '  Client cancelled  ' },
    });
    const res = createMockResponse();
    await projectController.postCancelProject(req, res, (err) => { if (err) throw err; });

    assert.deepStrictEqual(captured, { projectId: 12, ownerId: '1', reason: 'Client cancelled' });
    assert.strictEqual(res._redirect, '/projects/12');

    const jsonReq = createMockRequest({
      role: 'OWNER',
      userId: '1',
      authorizedProjectId: 12,
      body: { reason: 'Client cancelled' },
    });
    jsonReq.accepts = () => false;
    const jsonRes = createMockResponse();
    await projectController.postCancelProject(jsonReq, jsonRes, (err) => { if (err) throw err; });

    assert.strictEqual(jsonRes.statusCode, 200);
    assert.deepStrictEqual(jsonRes._json, { success: true, projectId: 12 });
  });

  it('23. ProjectCancellationError renders projects/detail with statusCode and cancelError', async () => {
    mockCancelProject = async () => {
      throw new MockProjectCancellationError('Only active projects can be cancelled.', { statusCode: 409 });
    };

    const req = createMockRequest({
      authorizedProjectId: 7,
      body: { reason: 'Valid reason' },
    });
    const res = createMockResponse();
    await projectController.postCancelProject(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res._view, 'projects/detail');
    assert.strictEqual(res._locals.cancelError, 'Only active projects can be cancelled.');
  });

  it('24. Unexpected service error is forwarded to next(err)', async () => {
    mockCancelProject = async () => {
      throw new Error('Unexpected DB failure');
    };

    const req = createMockRequest({
      authorizedProjectId: 7,
      body: { reason: 'Valid reason' },
    });
    const res = createMockResponse();
    let capturedErr = null;
    await projectController.postCancelProject(req, res, (err) => { capturedErr = err; });

    assert.ok(capturedErr);
    assert.strictEqual(capturedErr.message, 'Unexpected DB failure');
  });
});
