'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ── Mock database before requiring projectService ──────────────────────────
const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');

let mockQueryFn = async () => ({ rows: [] });
let mockConnectFn = async () => {
  throw new Error('mockConnectFn not configured for this test');
};

require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: async (...args) => mockQueryFn(...args),
    connect: async (...args) => mockConnectFn(...args),
  },
};

const projectService = require('../../src/services/projectService');

// ── Helper data builders ───────────────────────────────────────────────────

function makeCountRow(total) {
  return { rows: [{ total }] };
}

function makeProjectRow(overrides = {}) {
  return {
    project_id: 1,
    project_code: 'PRJ-2026-001',
    project_name: 'Test Sign Project',
    customer_name: 'Test Customer',
    stage_id: 1,
    stage_order: 1,
    stage_name: 'PROJECT_REGISTRATION',
    project_status: 'ACTIVE',
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: null,
    assigned_pm_name: null,
    ...overrides,
  };
}

function makeStageRow(id = 1, order = 1, name = 'PROJECT_REGISTRATION') {
  return { stage_id: id, stage_order: order, stage_name: name };
}

// ── listProjects ──────────────────────────────────────────────────────────

describe('projectService.listProjects', () => {
  beforeEach(() => {
    // Default: returns count=1, one project, one stage
    let callCount = 0;
    mockQueryFn = async (sql, params) => {
      callCount++;
      // Count query (no LIMIT/OFFSET)
      if (callCount === 1) return makeCountRow(1);
      // Data query
      if (callCount === 2) return { rows: [makeProjectRow()] };
      // Stages query
      if (callCount === 3) return { rows: [makeStageRow()] };
      return { rows: [] };
    };
  });

  it('1. OWNER listing passes without assignment EXISTS clause', async () => {
    const capturedSqls = [];
    mockQueryFn = async (sql) => {
      capturedSqls.push(sql);
      if (capturedSqls.length === 1) return makeCountRow(0);
      if (capturedSqls.length === 2) return { rows: [] };
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 1, role: 'OWNER' });
    // The count SQL for OWNER must NOT contain project_assignments scoping
    const countSql = capturedSqls[0];
    assert.ok(!countSql.includes('pa.user_id'), 'OWNER count SQL must not filter by user_id');
    assert.ok(!countSql.includes('ended_at IS NULL'), 'OWNER count SQL must not have ended_at filter');
  });

  it('2. PM listing includes EXISTS assignment filter with correct user_id binding', async () => {
    const capturedSqls = [];
    const capturedParams = [];
    mockQueryFn = async (sql, params) => {
      capturedSqls.push(sql);
      capturedParams.push(params || []);
      if (capturedSqls.length === 1) return makeCountRow(0);
      if (capturedSqls.length === 2) return { rows: [] };
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 42, role: 'PROJECT_MANAGER' });
    const countSql = capturedSqls[0];
    const countParams = capturedParams[0];
    assert.ok(countSql.includes('pa.user_id'), 'PM count SQL must filter by user_id');
    assert.ok(countSql.includes('ended_at IS NULL'), 'PM count SQL must check ended_at IS NULL');
    assert.ok(countSql.includes('EXISTS'), 'PM count SQL must use EXISTS');
    assert.strictEqual(countParams[0], 42, 'First param must be PM userId=42');
  });

  it('3. Search filter generates ILIKE with parameterized wildcard (SQL injection safe)', async () => {
    const capturedSqls = [];
    const capturedParams = [];
    mockQueryFn = async (sql, params) => {
      capturedSqls.push(sql);
      capturedParams.push(params || []);
      if (capturedSqls.length === 1) return makeCountRow(0);
      if (capturedSqls.length === 2) return { rows: [] };
      return { rows: [] };
    };
    const injection = "'; DROP TABLE projects; --";
    await projectService.listProjects({ userId: 1, role: 'OWNER', search: injection });
    const countSql = capturedSqls[0];
    // SQL must NOT contain the raw injection string
    assert.ok(!countSql.includes(injection), 'SQL must not embed injection payload directly');
    // The search must be passed as a param (wildcard-wrapped)
    const countParams = capturedParams[0];
    const searchParam = countParams.find((p) => typeof p === 'string' && p.includes('%'));
    assert.ok(searchParam, 'Search term must be passed as a parameterized wildcard');
    assert.ok(countSql.includes('ILIKE'), 'Must use ILIKE for case-insensitive search');
  });

  it('4. Status filter generates p.project_status = $N bind param', async () => {
    const capturedParams = [];
    let callCount = 0;
    mockQueryFn = async (sql, params) => {
      callCount++;
      capturedParams.push(params || []);
      if (callCount === 1) return makeCountRow(0);
      if (callCount === 2) return { rows: [] };
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 1, role: 'OWNER', status: 'COMPLETED' });
    // Count params (no LIMIT/OFFSET)
    const countParams = capturedParams[0];
    assert.ok(countParams.includes('COMPLETED'), 'Status must be passed as bind param');
  });

  it('5. Stage filter generates ps.stage_id = $N bind param', async () => {
    const capturedParams = [];
    let callCount = 0;
    mockQueryFn = async (sql, params) => {
      callCount++;
      capturedParams.push(params || []);
      if (callCount === 1) return makeCountRow(0);
      if (callCount === 2) return { rows: [] };
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 1, role: 'OWNER', stageId: '3' });
    const countParams = capturedParams[0];
    assert.ok(countParams.includes(3), 'Stage ID must be passed as a numeric bind param');
  });

  it('6. Multiple filters combine with AND (not OR)', async () => {
    const capturedSqls = [];
    let callCount = 0;
    mockQueryFn = async (sql) => {
      callCount++;
      capturedSqls.push(sql);
      if (callCount === 1) return makeCountRow(0);
      if (callCount === 2) return { rows: [] };
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 1, role: 'OWNER', status: 'ACTIVE', stageId: '2', search: 'sign' });
    const countSql = capturedSqls[0];
    // Should have WHERE ... AND ... AND ...
    const andCount = (countSql.match(/ AND /g) || []).length;
    assert.ok(andCount >= 2, `Expected at least 2 AND conditions, got ${andCount}`);
    assert.ok(!/\)\s+OR\s+p\.project_status/i.test(countSql), 'Status filter must not be combined with search via OR');
    assert.ok(!/\bOR\s+ps\.stage_id\b/i.test(countSql), 'Stage filter must not be combined via OR');
  });

  it('7. Pagination clamping: page < 1 defaults to 1', async () => {
    let callCount = 0;
    mockQueryFn = async () => {
      callCount++;
      if (callCount === 1) return makeCountRow(5);
      if (callCount === 2) return { rows: [makeProjectRow()] };
      return { rows: [] };
    };
    const result = await projectService.listProjects({ userId: 1, role: 'OWNER', page: '-5' });
    assert.strictEqual(result.pagination.page, 1);
  });

  it('8. Pagination clamping: pageSize max is 50', async () => {
    let callCount = 0;
    const capturedDataParams = [];
    mockQueryFn = async (sql, params) => {
      callCount++;
      if (callCount === 1) return makeCountRow(5);
      if (callCount === 2) { capturedDataParams.push(...(params || [])); return { rows: [] }; }
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 1, role: 'OWNER', pageSize: '999' });
    // LIMIT param must be 50
    assert.ok(capturedDataParams.includes(50), 'pageSize must be clamped to 50');
  });

  it('8b. Pagination clamping: page > totalPages clamps to totalPages and re-queries with clamped offset', async () => {
    let callCount = 0;
    const dataOffsets = [];
    mockQueryFn = async (sql, params) => {
      callCount++;
      if (callCount === 1) return makeCountRow(15);
      if (callCount === 2) {
        dataOffsets.push(params[params.length - 1]);
        return { rows: [] };
      }
      if (callCount === 3) return { rows: [makeStageRow()] };
      // Re-query with clamped offset
      dataOffsets.push(params[params.length - 1]);
      return { rows: [makeProjectRow({ project_id: 11 })] };
    };
    const result = await projectService.listProjects({ userId: 1, role: 'OWNER', page: '99', pageSize: '10' });
    assert.strictEqual(result.pagination.page, 2);
    assert.strictEqual(result.pagination.totalPages, 2);
    assert.deepStrictEqual(dataOffsets, [980, 10]);
    assert.strictEqual(result.projects.length, 1);
    assert.strictEqual(result.projects[0].projectId, 11);
  });

  it('9. Empty project list returns correct structure', async () => {
    let callCount = 0;
    mockQueryFn = async () => {
      callCount++;
      if (callCount === 1) return makeCountRow(0);
      if (callCount === 2) return { rows: [] };
      if (callCount === 3) return { rows: [makeStageRow()] };
      return { rows: [] };
    };
    const result = await projectService.listProjects({ userId: 1, role: 'OWNER' });
    assert.strictEqual(result.projects.length, 0);
    assert.strictEqual(result.pagination.totalCount, 0);
    assert.strictEqual(result.pagination.totalPages, 1);
    assert.strictEqual(result.stages.length, 1);
  });

  it('10. Invalid userId throws an error', async () => {
    await assert.rejects(
      () => projectService.listProjects({ userId: null, role: 'OWNER' }),
      (err) => err.message === 'Invalid or missing userId'
    );
  });

  it('11. DB error propagates as thrown error', async () => {
    mockQueryFn = async () => { throw new Error('DB connection lost'); };
    await assert.rejects(
      () => projectService.listProjects({ userId: 1, role: 'OWNER' }),
      /DB connection lost/
    );
  });

  it('12. Invalid status values are ignored (treated as all statuses)', async () => {
    const capturedParams = [];
    let callCount = 0;
    mockQueryFn = async (sql, params) => {
      callCount++;
      capturedParams.push(params || []);
      if (callCount === 1) return makeCountRow(0);
      if (callCount === 2) return { rows: [] };
      return { rows: [] };
    };
    await projectService.listProjects({ userId: 1, role: 'OWNER', status: 'INVALID_STATUS' });
    // No status param should be in count query
    const countParams = capturedParams[0];
    assert.ok(!countParams.includes('INVALID_STATUS'), 'Invalid status must not be passed to DB');
  });
});

// ── getProjectDetails ─────────────────────────────────────────────────────

describe('projectService.getProjectDetails', () => {
  it('13. Returns null for invalid projectId (string)', async () => {
    const result = await projectService.getProjectDetails('abc');
    assert.strictEqual(result, null);
  });

  it('14. Returns null for invalid projectId (zero)', async () => {
    const result = await projectService.getProjectDetails(0);
    assert.strictEqual(result, null);
  });

  it('15. Returns null when no project row found', async () => {
    let callCount = 0;
    mockQueryFn = async () => {
      callCount++;
      return { rows: [] };
    };
    const result = await projectService.getProjectDetails(999);
    assert.strictEqual(result, null);
  });

  it('16. Returns formatted project object when found', async () => {
    let callCount = 0;
    mockQueryFn = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          rows: [{
            project_id: 5,
            project_code: 'PRJ-2026-005',
            project_name: 'Big Sign',
            description: 'A large sign',
            project_address: '123 Main St',
            project_location: 'Colombo',
            project_status: 'ACTIVE',
            created_at: new Date('2026-06-01'),
            updated_at: null,
            completed_at: null,
            customer_id: 10,
            customer_name: 'BigCo',
            customer_email: 'big@co.lk',
            customer_phone: '0771234567',
            customer_address: null,
            stage_id: 2,
            stage_order: 2,
            stage_name: 'REQUIREMENTS_GATHERING',
            created_by_name: 'Admin User',
            assigned_pm_name: 'PM One',
          }],
        };
      }
      // history query
      return { rows: [] };
    };
    const result = await projectService.getProjectDetails(5);
    assert.ok(result !== null);
    assert.strictEqual(result.projectId, 5);
    assert.strictEqual(result.projectCode, 'PRJ-2026-005');
    assert.strictEqual(result.customer.fullName, 'BigCo');
    assert.strictEqual(result.stage.stageOrder, 2);
    assert.strictEqual(result.stage.stageName, 'REQUIREMENTS_GATHERING');
    assert.strictEqual(result.assignedPmName, 'PM One');
    assert.deepStrictEqual(result.history, []);
  });

  it('17. History entries are formatted correctly', async () => {
    let callCount = 0;
    mockQueryFn = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          rows: [{
            project_id: 5, project_code: 'PRJ-X', project_name: 'X', description: null,
            project_address: null, project_location: null, project_status: 'ACTIVE',
            created_at: new Date(), updated_at: null, completed_at: null,
            customer_id: 1, customer_name: 'CustX', customer_email: null,
            customer_phone: null, customer_address: null,
            stage_id: 1, stage_order: 1, stage_name: 'PROJECT_REGISTRATION',
            created_by_name: 'Admin', assigned_pm_name: null,
          }],
        };
      }
      return {
        rows: [{
          history_id: 100,
          change_type: 'STAGE_CHANGE',
          old_project_status: null,
          new_project_status: null,
          is_manual_change: false,
          change_reason: null,
          changed_at: new Date('2026-07-01'),
          old_stage_name: 'PROJECT_REGISTRATION',
          old_stage_order: 1,
          new_stage_name: 'REQUIREMENTS_GATHERING',
          new_stage_order: 2,
          changed_by_name: 'Admin User',
        }],
      };
    };
    const result = await projectService.getProjectDetails(5);
    assert.strictEqual(result.history.length, 1);
    const h = result.history[0];
    assert.strictEqual(h.historyId, 100);
    assert.strictEqual(h.changeType, 'STAGE_CHANGE');
    assert.strictEqual(h.oldStageName, 'PROJECT_REGISTRATION');
    assert.strictEqual(h.newStageName, 'REQUIREMENTS_GATHERING');
    assert.strictEqual(h.isManualChange, false);
    assert.strictEqual(h.changedByName, 'Admin User');
  });

  it('18. DB error propagates', async () => {
    mockQueryFn = async () => { throw new Error('timeout'); };
    await assert.rejects(
      () => projectService.getProjectDetails(1),
      /timeout/
    );
  });
});

// ── parsePositiveInteger export ───────────────────────────────────────────

describe('projectService.parsePositiveInteger', () => {
  const { parsePositiveInteger } = projectService;

  it('19. Valid positive integer string returns number', () => {
    assert.strictEqual(parsePositiveInteger('42'), 42);
  });

  it('20. Zero returns null', () => {
    assert.strictEqual(parsePositiveInteger('0'), null);
  });

  it('21. Negative returns null', () => {
    assert.strictEqual(parsePositiveInteger('-5'), null);
  });

  it('22. Non-numeric string returns null', () => {
    assert.strictEqual(parsePositiveInteger('abc'), null);
  });

  it('23. Float string returns null', () => {
    assert.strictEqual(parsePositiveInteger('1.5'), null);
  });
});

// ── Customer Search, PM List, and Project Creation ────────────────────────

describe('projectService.searchActiveCustomers', () => {
  it('24. Returns empty array when query has fewer than 2 characters', async () => {
    let called = false;
    mockQueryFn = async () => { called = true; return { rows: [] }; };
    const res = await projectService.searchActiveCustomers('a');
    assert.deepStrictEqual(res, []);
    assert.strictEqual(called, false);
  });

  it('25. Searches active customers by email or address and excludes inactive', async () => {
    let capturedSql = '';
    let capturedParams = [];
    mockQueryFn = async (sql, params) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [
          {
            customer_id: 5,
            full_name: 'Dialog Axiata PLC',
            email: 'signage@dialog.lk',
            phone: '+94 11 234 5678',
            address: '475 Union Place, Colombo 02',
          },
        ],
      };
    };

    const res = await projectService.searchActiveCustomers('colombo');
    assert.ok(capturedSql.includes('is_active = true'));
    assert.ok(capturedSql.includes('email ILIKE'));
    assert.ok(capturedSql.includes('address ILIKE'));
    assert.strictEqual(capturedParams[0], '%colombo%');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].customerId, 5);
    assert.strictEqual(res[0].fullName, 'Dialog Axiata PLC');
  });
});

describe('projectService.listActiveProjectManagers', () => {
  it('26. Queries active users with PROJECT_MANAGER role', async () => {
    let capturedSql = '';
    mockQueryFn = async (sql) => {
      capturedSql = sql;
      return {
        rows: [{ user_id: 3, full_name: 'Kasun PM', email: 'kasun@test.local' }],
      };
    };

    const res = await projectService.listActiveProjectManagers();
    assert.ok(capturedSql.includes("r.role_name = 'PROJECT_MANAGER'"));
    assert.ok(capturedSql.includes('u.is_active = true'));
    assert.deepStrictEqual(res, [{ userId: 3, fullName: 'Kasun PM', email: 'kasun@test.local' }]);
  });
});

describe('projectService.createProject', () => {
  function makeMockClient(handler) {
    const calls = [];
    let released = false;
    const client = {
      calls,
      get released() { return released; },
      query: async (sql, params) => {
        calls.push({ sql, params });
        return handler(sql, params, calls);
      },
      release: () => { released = true; },
    };
    return client;
  }

  it('27. Creates project with existing active customer and no PM in a transaction', async () => {
    const year = projectService.getSriLankaYear();
    const client = makeMockClient(async (sql) => {
      if (sql.includes('FROM public.customers')) return { rows: [{ customer_id: 10, is_active: true }] };
      if (sql.includes('MAX(')) return { rows: [{ max_seq: 4 }] };
      if (sql.includes('INSERT INTO public.projects')) return { rows: [{ project_id: 77 }] };
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    const result = await projectService.createProject(
      {
        customerMode: 'existing',
        customerId: 10,
        newCustomer: null,
        projectName: 'Main Street Sign',
        projectAddress: '12 Galle Rd',
        projectLocation: 'Colombo',
        description: 'Illuminated',
        projectManagerId: null,
      },
      1
    );

    assert.strictEqual(result.projectId, 77);
    assert.strictEqual(result.projectCode, `SBL-${year}-0005`);
    assert.strictEqual(result.customerId, 10);
    assert.ok(client.calls.some((c) => c.sql === 'BEGIN'));
    assert.ok(client.calls.some((c) => c.sql.includes('pg_advisory_xact_lock')));
    assert.ok(client.calls.some((c) => c.sql === 'COMMIT'));
    assert.ok(!client.calls.some((c) => c.sql.includes('project_assignments')));
    assert.ok(!client.calls.some((c) => c.sql.includes('project_status_history')));
    assert.strictEqual(client.released, true);
  });

  it('28. Creates new customer, project, and PM assignment using session ownerUserId', async () => {
    const year = projectService.getSriLankaYear();
    const client = makeMockClient(async (sql) => {
      if (sql.includes('LOWER(email)')) return { rows: [] };
      if (sql.includes('INSERT INTO public.customers')) return { rows: [{ customer_id: 22 }] };
      if (sql.includes('FROM public.users u')) return { rows: [{ user_id: 8, is_active: true, role_name: 'PROJECT_MANAGER' }] };
      if (sql.includes('MAX(')) return { rows: [{ max_seq: 0 }] };
      if (sql.includes('INSERT INTO public.projects')) return { rows: [{ project_id: 99 }] };
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    const result = await projectService.createProject(
      {
        customerMode: 'new',
        customerId: null,
        newCustomer: {
          fullName: 'New Co',
          email: 'new@co.lk',
          phone: '0112223334',
          address: '100 Kandy Rd',
        },
        projectName: 'Billboard',
        projectAddress: '100 Kandy Rd',
        projectLocation: null,
        description: null,
        projectManagerId: 8,
      },
      15
    );

    assert.strictEqual(result.projectId, 99);
    assert.strictEqual(result.projectCode, `SBL-${year}-0001`);
    assert.strictEqual(result.customerId, 22);
    const projInsert = client.calls.find((c) => c.sql.includes('INSERT INTO public.projects'));
    assert.strictEqual(projInsert.params[6], 15);
    const assignInsert = client.calls.find((c) => c.sql.includes('INSERT INTO public.project_assignments'));
    assert.deepStrictEqual(assignInsert.params, [99, 8, 15]);
    assert.strictEqual(client.released, true);
  });

  it('29. Rejects duplicate customer email with 409 ProjectCreationError and existing customer info', async () => {
    const client = makeMockClient(async (sql) => {
      if (sql.includes('LOWER(email)')) {
        return {
          rows: [{
            customer_id: 14,
            full_name: 'Existing Co',
            email: 'dup@co.lk',
            phone: '0110000000',
            address: '50 Main St',
            is_active: true,
          }],
        };
      }
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    await assert.rejects(
      () => projectService.createProject(
        {
          customerMode: 'new',
          customerId: null,
          newCustomer: { fullName: 'Dup', email: 'dup@co.lk', phone: '123', address: 'Addr' },
          projectName: 'P',
          projectAddress: 'A',
          projectLocation: null,
          description: null,
          projectManagerId: null,
        },
        1
      ),
      (err) => {
        assert.strictEqual(err.name, 'ProjectCreationError');
        assert.strictEqual(err.statusCode, 409);
        assert.strictEqual(err.duplicateCustomer.customerId, 14);
        return true;
      }
    );
    assert.ok(client.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.strictEqual(client.released, true);
  });

  it('30. Rejects inactive PM or non-PROJECT_MANAGER user and rolls back', async () => {
    const inactiveClient = makeMockClient(async (sql) => {
      if (sql.includes('FROM public.customers')) return { rows: [{ customer_id: 10, is_active: true }] };
      if (sql.includes('FROM public.users u')) return { rows: [{ user_id: 8, is_active: false, role_name: 'PROJECT_MANAGER' }] };
      return { rows: [] };
    });
    mockConnectFn = async () => inactiveClient;

    await assert.rejects(
      () => projectService.createProject(
        {
          customerMode: 'existing',
          customerId: 10,
          newCustomer: null,
          projectName: 'P',
          projectAddress: 'A',
          projectLocation: null,
          description: null,
          projectManagerId: 8,
        },
        1
      ),
      /inactive/i
    );
    assert.ok(inactiveClient.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.strictEqual(inactiveClient.released, true);

    const wrongRoleClient = makeMockClient(async (sql) => {
      if (sql.includes('FROM public.customers')) return { rows: [{ customer_id: 10, is_active: true }] };
      if (sql.includes('FROM public.users u')) return { rows: [{ user_id: 9, is_active: true, role_name: 'ACCOUNTS' }] };
      return { rows: [] };
    });
    mockConnectFn = async () => wrongRoleClient;

    await assert.rejects(
      () => projectService.createProject(
        {
          customerMode: 'existing',
          customerId: 10,
          newCustomer: null,
          projectName: 'P',
          projectAddress: 'A',
          projectLocation: null,
          description: null,
          projectManagerId: 9,
        },
        1
      ),
      /PROJECT_MANAGER/
    );
    assert.ok(wrongRoleClient.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.strictEqual(wrongRoleClient.released, true);
  });

  it('31. Rolls back entire transaction and releases client if project or assignment insert fails', async () => {
    const failProjectClient = makeMockClient(async (sql) => {
      if (sql.includes('LOWER(email)')) return { rows: [] };
      if (sql.includes('INSERT INTO public.customers')) return { rows: [{ customer_id: 30 }] };
      if (sql.includes('MAX(')) return { rows: [{ max_seq: 0 }] };
      if (sql.includes('INSERT INTO public.projects')) throw new Error('db write failure');
      return { rows: [] };
    });
    mockConnectFn = async () => failProjectClient;

    await assert.rejects(
      () => projectService.createProject(
        {
          customerMode: 'new',
          customerId: null,
          newCustomer: { fullName: 'C', email: 'c@c.lk', phone: '123', address: 'Addr' },
          projectName: 'P',
          projectAddress: 'A',
          projectLocation: null,
          description: null,
          projectManagerId: null,
        },
        1
      ),
      /db write failure/
    );
    assert.ok(failProjectClient.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.ok(!failProjectClient.calls.some((c) => c.sql === 'COMMIT'));
    assert.strictEqual(failProjectClient.released, true);

    const failAssignClient = makeMockClient(async (sql) => {
      if (sql.includes('FROM public.customers')) return { rows: [{ customer_id: 10, is_active: true }] };
      if (sql.includes('FROM public.users u')) return { rows: [{ user_id: 8, is_active: true, role_name: 'PROJECT_MANAGER' }] };
      if (sql.includes('MAX(')) return { rows: [{ max_seq: 0 }] };
      if (sql.includes('INSERT INTO public.projects')) return { rows: [{ project_id: 55 }] };
      if (sql.includes('INSERT INTO public.project_assignments')) throw new Error('trigger error');
      return { rows: [] };
    });
    mockConnectFn = async () => failAssignClient;

    await assert.rejects(
      () => projectService.createProject(
        {
          customerMode: 'existing',
          customerId: 10,
          newCustomer: null,
          projectName: 'P',
          projectAddress: 'A',
          projectLocation: null,
          description: null,
          projectManagerId: 8,
        },
        1
      ),
      /trigger error/
    );
    assert.ok(failAssignClient.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.ok(!failAssignClient.calls.some((c) => c.sql === 'COMMIT'));
    assert.strictEqual(failAssignClient.released, true);
  });
});

// ── cancelProject ──────────────────────────────────────────────────────────

describe('projectService.cancelProject', () => {
  function makeCancelClient(handler) {
    const calls = [];
    let released = false;
    return {
      calls,
      get released() { return released; },
      query: async (sql, params) => {
        const clean = typeof sql === 'string' ? sql.trim() : '';
        calls.push({ sql: clean, params });
        if (clean === 'BEGIN' || clean === 'COMMIT' || clean === 'ROLLBACK') {
          return { rows: [] };
        }
        return handler(clean, params, calls);
      },
      release: () => { released = true; },
    };
  }

  it('32. Cancels ACTIVE project via change_project_status(), ends active PM assignment, and commits', async () => {
    const client = makeCancelClient(async (sql) => {
      if (sql.includes('SELECT change_project_status')) return { rows: [{ change_project_status: null }] };
      if (sql.includes('UPDATE public.project_assignments')) return { rowCount: 1, rows: [] };
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    const result = await projectService.cancelProject(15, 1, '  Client cancelled order  ');
    assert.deepStrictEqual(result, { projectId: 15 });

    const sqls = client.calls.map((c) => c.sql);
    assert.strictEqual(sqls[0], 'BEGIN');
    assert.ok(sqls[1].includes('SELECT change_project_status($1, $2, \'CANCELLED\', $3)'));
    assert.deepStrictEqual(client.calls[1].params, [15, 1, 'Client cancelled order']);
    assert.ok(sqls[2].includes('UPDATE public.project_assignments'));
    assert.ok(sqls[2].includes('ended_at = CURRENT_TIMESTAMP'));
    assert.ok(sqls[2].includes('ended_at IS NULL'));
    assert.deepStrictEqual(client.calls[2].params, [15]);
    assert.strictEqual(sqls[3], 'COMMIT');
    assert.strictEqual(client.released, true);

    // Ensure no financial tables are touched
    const joined = sqls.join('\n').toLowerCase();
    assert.ok(!joined.includes('payment'));
    assert.ok(!joined.includes('advance'));
    assert.ok(!joined.includes('refund'));
  });

  it('33. Commits cleanly even when project has no active PM assignment (0 rows updated)', async () => {
    const client = makeCancelClient(async (sql) => {
      if (sql.includes('SELECT change_project_status')) return { rows: [] };
      if (sql.includes('UPDATE public.project_assignments')) return { rowCount: 0, rows: [] };
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    const result = await projectService.cancelProject('22', '3', 'No PM assigned');
    assert.deepStrictEqual(result, { projectId: 22 });
    assert.ok(client.calls.some((c) => c.sql === 'COMMIT'));
    assert.strictEqual(client.released, true);
  });

  it('34. Rolls back entire transaction if ending PM assignment fails', async () => {
    const client = makeCancelClient(async (sql) => {
      if (sql.includes('SELECT change_project_status')) return { rows: [] };
      if (sql.includes('UPDATE public.project_assignments')) throw new Error('assignment update failure');
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    await assert.rejects(
      () => projectService.cancelProject(15, 1, 'Valid reason'),
      /assignment update failure/
    );
    assert.ok(client.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.ok(!client.calls.some((c) => c.sql === 'COMMIT'));
    assert.strictEqual(client.released, true);
  });

  it('35. Maps non-ACTIVE status DB error to ProjectCancellationError (409) and rolls back', async () => {
    const client = makeCancelClient(async (sql) => {
      if (sql.includes('SELECT change_project_status')) {
        throw new Error('This project status transition is not allowed');
      }
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    await assert.rejects(
      () => projectService.cancelProject(15, 1, 'Valid reason'),
      (err) => {
        assert.strictEqual(err.name, 'ProjectCancellationError');
        assert.strictEqual(err.statusCode, 409);
        assert.ok(err.message.includes('Only active projects can be cancelled'));
        return true;
      }
    );
    assert.ok(client.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.ok(!client.calls.some((c) => c.sql === 'COMMIT'));
    assert.strictEqual(client.released, true);
  });

  it('36. Maps missing project DB error to ProjectCancellationError (404) and rolls back', async () => {
    const client = makeCancelClient(async (sql) => {
      if (sql.includes('SELECT change_project_status')) {
        throw new Error('Project not found');
      }
      return { rows: [] };
    });
    mockConnectFn = async () => client;

    await assert.rejects(
      () => projectService.cancelProject(999, 1, 'Valid reason'),
      (err) => {
        assert.strictEqual(err.name, 'ProjectCancellationError');
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
    assert.ok(client.calls.some((c) => c.sql === 'ROLLBACK'));
    assert.strictEqual(client.released, true);
  });

  it('37. Maps OWNER / inactive user / reason DB errors to appropriate status codes', async () => {
    for (const [dbMsg, expectedStatus] of [
      ['Only an OWNER can change this project status', 403],
      ['Invalid or inactive user', 403],
      ['A reason is required', 400],
    ]) {
      const client = makeCancelClient(async () => { throw new Error(dbMsg); });
      mockConnectFn = async () => client;

      await assert.rejects(
        () => projectService.cancelProject(15, 1, 'Valid reason'),
        (err) => {
          assert.strictEqual(err.name, 'ProjectCancellationError');
          assert.strictEqual(err.statusCode, expectedStatus);
          return true;
        }
      );
      assert.ok(client.calls.some((c) => c.sql === 'ROLLBACK'));
      assert.strictEqual(client.released, true);
    }
  });

  it('38. Rejects invalid projectId, ownerUserId, empty reason, or >500 chars before connecting to DB', async () => {
    let connectCalled = false;
    mockConnectFn = async () => {
      connectCalled = true;
      throw new Error('Should not connect');
    };

    for (const args of [
      [0, 1, 'Reason'],
      ['abc', 1, 'Reason'],
      [1, 0, 'Reason'],
      [1, 1, '   '],
      [1, 1, 'X'.repeat(501)],
    ]) {
      await assert.rejects(
        () => projectService.cancelProject(...args),
        (err) => {
          assert.strictEqual(err.name, 'ProjectCancellationError');
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );
    }
    assert.strictEqual(connectCalled, false);
  });
});
