const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// 1. Safeguard: mock database config module so real DB connection is never loaded
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

// 2. Mock dashboardDataService in require.cache before requiring dashboardController
const dashboardDataServicePath = path.resolve(__dirname, '../../src/services/dashboardDataService.js');

const mockOwnerData = {
  kpis: {
    totalProjects: 12,
    activeProjects: 8,
    completedProjects: 3,
    cancelledProjects: 1,
    totalCustomers: 5,
    pendingApprovalsCount: 2,
  },
  stageDistribution: [
    { stageId: 1, stageOrder: 1, stageName: 'Project Registration', projectCount: 2 },
  ],
  pendingApprovals: [
    {
      budgetId: 10,
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      versionNumber: 1,
      estimatedCost: 250000,
      submittedDate: '2026-11-20T10:00:00Z',
    },
  ],
  recentProjects: [
    {
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      stageName: 'Project Registration',
      stageOrder: 1,
      projectStatus: 'ACTIVE',
      pmName: 'Project Manager',
      createdAt: '2026-11-18T10:00:00Z',
    },
  ],
  recentActivity: [],
};

const mockPmData = {
  kpis: {
    myActiveProjectsCount: 5,
    requiresAttentionCount: 2,
    pendingSiteVisitsCount: 1,
    pendingDesignWorkCount: 1,
    pendingQualityChecksCount: 0,
    upcomingInstallationsCount: 1,
  },
  stageDistribution: [
    { stageId: 1, stageOrder: 1, stageName: 'Project Registration', projectCount: 1 },
  ],
  actionItems: [
    {
      actionId: 'ACTION-SITE-VISIT-1',
      type: 'PENDING_SITE_VISIT',
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      stageOrder: 2,
      stageName: 'Site Visit',
      description: 'Site visit has not been performed',
      priorityDate: '2026-11-18T10:00:00Z',
    },
  ],
  assignedProjects: [
    {
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      stageOrder: 2,
      stageName: 'Site Visit',
      assignedDate: '2026-11-18T10:00:00Z',
    },
  ],
  recentQualityChecks: [],
};

const mockAccountsData = {
  kpis: {
    pendingBudgetPrepCount: 2,
    quotationsDraftCount: 1,
    quotationsSentCount: 1,
    pendingQuotationsCount: 2,
    totalOutstandingBalance: 1500000,
    unpaidInvoicesCount: 3,
    paymentsReceivedThisMonth: 850000,
    paymentCountThisMonth: 4,
  },
  financialTasks: [
    {
      taskId: 'TASK-BUDGET-1',
      taskType: 'BUDGET_PREP',
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      description: 'Prepare initial project budget',
      referenceCode: null,
      referenceAmount: null,
      priorityDate: '2026-11-18T10:00:00Z',
    },
  ],
  recentPayments: [
    {
      paymentId: 101,
      paymentNumber: 'PAY-001',
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      amount: 150000,
      paymentMethod: 'BANK_TRANSFER',
      paymentType: 'ADVANCE',
      paymentDate: '2026-11-20T10:00:00Z',
    },
  ],
  outstandingInvoices: [
    {
      invoiceId: 201,
      invoiceNumber: 'INV-001',
      projectId: 1,
      projectCode: 'PRJ-2026-001',
      projectName: 'Main Sign',
      customerName: 'Acme Corp',
      totalAmount: 500000,
      paidAmount: 150000,
      balanceAmount: 350000,
      dueDate: '2026-12-01',
      invoiceDate: '2026-11-19',
    },
  ],
};

let serviceCalls = {
  ownerCount: 0,
  pmCount: 0,
  pmUserIds: [],
  accountsCount: 0,
};

let ownerServiceError = null;
let pmServiceError = null;
let accountsServiceError = null;

function resetServiceState() {
  serviceCalls = {
    ownerCount: 0,
    pmCount: 0,
    pmUserIds: [],
    accountsCount: 0,
  };
  ownerServiceError = null;
  pmServiceError = null;
  accountsServiceError = null;
}

require.cache[dashboardDataServicePath] = {
  id: dashboardDataServicePath,
  filename: dashboardDataServicePath,
  loaded: true,
  exports: {
    getOwnerDashboardData: async () => {
      serviceCalls.ownerCount += 1;
      if (ownerServiceError) {
        throw ownerServiceError;
      }
      return mockOwnerData;
    },
    getPmDashboardData: async (pmUserId) => {
      serviceCalls.pmCount += 1;
      serviceCalls.pmUserIds.push(pmUserId);
      if (pmServiceError) {
        throw pmServiceError;
      }
      if (!pmUserId || (typeof pmUserId === 'string' && !/^\d+$/.test(pmUserId.trim()))) {
        throw new Error('Invalid or missing pmUserId');
      }
      return mockPmData;
    },
    getAccountsDashboardData: async () => {
      serviceCalls.accountsCount += 1;
      if (accountsServiceError) {
        throw accountsServiceError;
      }
      return mockAccountsData;
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
  beforeEach(() => {
    resetServiceState();
  });

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

  describe('Role-to-View Mapping, Service Dispatch & Data Handoff', () => {
    it('should map OWNER to dashboards/owner, call getOwnerDashboardData(), and pass data', async () => {
      const user = { userId: '1', fullName: 'System Owner', role: 'OWNER' };
      const req = createMockRequest({
        session: {
          user,
          csrfToken: '1111111111111111111111111111111111111111111111111111111111111111',
        },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await dashboardController.getDashboard(req, res, () => {
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
      assert.deepStrictEqual(res.renderedData.data, mockOwnerData);
      // Verify data is not spread into top-level render object
      assert.strictEqual(res.renderedData.kpis, undefined);
      assert.strictEqual(res.renderedData.stageDistribution, undefined);

      // Verify correct service dispatch
      assert.strictEqual(serviceCalls.ownerCount, 1);
      assert.strictEqual(serviceCalls.pmCount, 0);
      assert.strictEqual(serviceCalls.accountsCount, 0);
    });

    it('should map PROJECT_MANAGER to dashboards/pm, call getPmDashboardData(userId) with exact session ID, and pass data', async () => {
      const user = { userId: '2', fullName: 'Project Manager', role: 'PROJECT_MANAGER' };
      const req = createMockRequest({
        session: {
          user,
          csrfToken: '2222222222222222222222222222222222222222222222222222222222222222',
        },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await dashboardController.getDashboard(req, res, () => {
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
      assert.deepStrictEqual(res.renderedData.data, mockPmData);
      assert.strictEqual(res.renderedData.kpis, undefined);

      // Verify correct service dispatch and user ID passing
      assert.strictEqual(serviceCalls.ownerCount, 0);
      assert.strictEqual(serviceCalls.pmCount, 1);
      assert.deepStrictEqual(serviceCalls.pmUserIds, ['2']);
      assert.strictEqual(serviceCalls.accountsCount, 0);
    });

    it('should map ACCOUNTS to dashboards/accounts, call getAccountsDashboardData(), and pass data', async () => {
      const user = { userId: '3', fullName: 'Accounts Lead', role: 'ACCOUNTS' };
      const req = createMockRequest({
        session: {
          user,
          csrfToken: '3333333333333333333333333333333333333333333333333333333333333333',
        },
      });
      const res = createMockResponse();
      let nextCalled = false;

      await dashboardController.getDashboard(req, res, () => {
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
      assert.deepStrictEqual(res.renderedData.data, mockAccountsData);
      assert.strictEqual(res.renderedData.kpis, undefined);

      // Verify correct service dispatch
      assert.strictEqual(serviceCalls.ownerCount, 0);
      assert.strictEqual(serviceCalls.pmCount, 0);
      assert.strictEqual(serviceCalls.accountsCount, 1);
    });

    it('should use res.locals.csrfToken when available', async () => {
      const user = { userId: '1', fullName: 'System Owner', role: 'OWNER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse({
        locals: {
          csrfToken: 'from_res_locals_token_44444444444444444444444444444444444444444444',
        },
      });

      await dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(
        res.renderedData.csrfToken,
        'from_res_locals_token_44444444444444444444444444444444444444444444'
      );
    });
  });

  describe('Service Failure & Error Handling', () => {
    it('should forward OWNER service rejection to next(err)', async () => {
      ownerServiceError = new Error('Failed to retrieve owner dashboard data');
      const user = { userId: '1', fullName: 'Owner', role: 'OWNER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let capturedError = null;

      await dashboardController.getDashboard(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, ownerServiceError);
      assert.strictEqual(res.renderedView, null);
    });

    it('should forward PM service rejection to next(err)', async () => {
      pmServiceError = new Error('Failed to retrieve PM dashboard data');
      const user = { userId: '2', fullName: 'Project Manager', role: 'PROJECT_MANAGER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let capturedError = null;

      await dashboardController.getDashboard(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, pmServiceError);
      assert.strictEqual(res.renderedView, null);
    });

    it('should forward ACCOUNTS service rejection to next(err)', async () => {
      accountsServiceError = new Error('Failed to retrieve accounts dashboard data');
      const user = { userId: '3', fullName: 'Accounts User', role: 'ACCOUNTS' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let capturedError = null;

      await dashboardController.getDashboard(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, accountsServiceError);
      assert.strictEqual(res.renderedView, null);
    });

    it('should handle invalid PM identity safely by forwarding error to next(err)', async () => {
      const user = { userId: 'invalid_non_numeric_id', fullName: 'PM', role: 'PROJECT_MANAGER' };
      const req = createMockRequest({ session: { user } });
      const res = createMockResponse();
      let capturedError = null;

      await dashboardController.getDashboard(req, res, (err) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof Error);
      assert.strictEqual(capturedError.message, 'Invalid or missing pmUserId');
      assert.strictEqual(res.renderedView, null);
    });

    it('should forward view rendering unexpected errors to next()', async () => {
      const renderError = new Error('View template parsing failed');
      const req = createMockRequest({
        session: {
          user: { userId: '1', fullName: 'Owner', role: 'OWNER' },
          csrfToken: '5555555555555555555555555555555555555555555555555555555555555555',
        },
      });
      const res = createMockResponse({ renderError });
      let capturedError = null;

      await dashboardController.getDashboard(req, res, (err) => {
        capturedError = err;
      });

      assert.strictEqual(capturedError, renderError);
    });
  });

  describe('Unsupported Roles & Missing/Malformed Session Data', () => {
    it('should return 403 when req is null or undefined without invoking data services', async () => {
      const res = createMockResponse();
      let nextCalled = false;

      await dashboardController.getDashboard(null, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.responseBody, 'Forbidden');
      assert.strictEqual(res.renderedView, null);
      assert.strictEqual(serviceCalls.ownerCount, 0);
      assert.strictEqual(serviceCalls.pmCount, 0);
      assert.strictEqual(serviceCalls.accountsCount, 0);
    });

    it('should return 403 when session is missing without invoking data services', async () => {
      const req = createMockRequest({ session: null });
      const res = createMockResponse();

      await dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.responseBody, 'Forbidden');
      assert.strictEqual(res.renderedView, null);
      assert.strictEqual(serviceCalls.ownerCount, 0);
      assert.strictEqual(serviceCalls.pmCount, 0);
      assert.strictEqual(serviceCalls.accountsCount, 0);
    });

    it('should return 403 when session.user is missing or not an object', async () => {
      const invalidUsers = [null, undefined, 'user', 123, ['array'], true];

      for (const invalidUser of invalidUsers) {
        resetServiceState();
        const req = createMockRequest({ session: { user: invalidUser } });
        const res = createMockResponse();

        await dashboardController.getDashboard(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.responseBody, 'Forbidden');
        assert.strictEqual(res.renderedView, null);
        assert.strictEqual(serviceCalls.ownerCount, 0);
        assert.strictEqual(serviceCalls.pmCount, 0);
        assert.strictEqual(serviceCalls.accountsCount, 0);
      }
    });

    it('should return 403 for unsupported or unknown roles', async () => {
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
        resetServiceState();
        const req = createMockRequest({
          session: { user: { userId: '1', fullName: 'Test', role: badRole } },
        });
        const res = createMockResponse();

        await dashboardController.getDashboard(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.responseBody, 'Forbidden');
        assert.strictEqual(res.renderedView, null);
        assert.strictEqual(serviceCalls.ownerCount, 0);
        assert.strictEqual(serviceCalls.pmCount, 0);
        assert.strictEqual(serviceCalls.accountsCount, 0);
      }
    });

    it('should return 403 JSON when client does not accept HTML', async () => {
      const req = createMockRequest({
        session: null,
        acceptsHtml: false,
      });
      const res = createMockResponse();

      await dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res.responseBody, { error: 'Forbidden' });
      assert.strictEqual(res.renderedView, null);
    });
  });

  describe('Protection Against Client-Supplied Role and Identity Tampering', () => {
    it('should strictly ignore client query parameters, body, and headers attempting to change role', async () => {
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

      await dashboardController.getDashboard(req, res, () => {});

      // Controller MUST render accounts dashboard and pass session user only
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.renderedView, 'dashboards/accounts');
      assert.deepStrictEqual(res.renderedData.user, {
        userId: '3',
        fullName: 'Accounts User',
        role: 'ACCOUNTS',
      });
      assert.deepStrictEqual(res.renderedData.data, mockAccountsData);

      // Verify ONLY accounts service was called
      assert.strictEqual(serviceCalls.ownerCount, 0);
      assert.strictEqual(serviceCalls.pmCount, 0);
      assert.strictEqual(serviceCalls.accountsCount, 1);
    });

    it('should return 403 when unauthenticated despite client supplying role in query/body', async () => {
      const req = createMockRequest({
        session: { user: null },
        query: { role: 'OWNER' },
        body: { role: 'OWNER' },
      });
      const res = createMockResponse();

      await dashboardController.getDashboard(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.renderedView, null);
      assert.strictEqual(serviceCalls.ownerCount, 0);
      assert.strictEqual(serviceCalls.pmCount, 0);
      assert.strictEqual(serviceCalls.accountsCount, 0);
    });
  });
});
