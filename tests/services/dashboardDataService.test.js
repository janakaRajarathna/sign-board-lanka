const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Safeguard: mock database config module so real DB connection is never loaded
const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
let mockQuery = null;

require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: async (...args) => {
      if (typeof mockQuery !== 'function') {
        throw new Error('mockQuery handler not defined for current test');
      }
      return mockQuery(...args);
    },
  },
};

// Load dashboardDataService with mocked database dependency
const dashboardDataService = require('../../src/services/dashboardDataService');

describe('dashboardDataService.getOwnerDashboardData - Isolated Unit Tests', () => {
  beforeEach(() => {
    mockQuery = null;
  });

  it('1. Correct Owner KPI mapping (including ACTIVE, COMPLETED, CANCELLED, totalCustomers, pendingApprovalsCount)', async () => {
    mockQuery = async (sql) => {
      if (sql.includes('COUNT(*) FILTER (WHERE p.project_status = \'ACTIVE\')')) {
        return {
          rows: [
            {
              total_projects: '124',
              active_projects: '38',
              completed_projects: '76',
              cancelled_projects: '10',
              total_customers: '89',
              pending_approvals_count: '4',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    assert.deepStrictEqual(data.kpis, {
      totalProjects: 124,
      activeProjects: 38,
      completedProjects: 76,
      cancelledProjects: 10,
      totalCustomers: 89,
      pendingApprovalsCount: 4,
    });
  });

  it('2. Project KPIs strictly verify ACTIVE, COMPLETED, and CANCELLED statuses without inferring from stage', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('total_projects')) {
        capturedKpiSql = sql;
        return {
          rows: [
            {
              total_projects: '3',
              active_projects: '1',
              completed_projects: '1',
              cancelled_projects: '1',
              total_customers: '2',
              pending_approvals_count: '0',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    // Verify SQL explicitly tests project_status enum values
    assert.match(capturedKpiSql, /project_status = 'ACTIVE'/);
    assert.match(capturedKpiSql, /project_status = 'COMPLETED'/);
    assert.match(capturedKpiSql, /project_status = 'CANCELLED'/);
    // Ensure stage_order 8 is not assumed as completed in KPI query
    assert.doesNotMatch(capturedKpiSql, /stage_order = 8/);

    assert.strictEqual(data.kpis.activeProjects, 1);
    assert.strictEqual(data.kpis.completedProjects, 1);
    assert.strictEqual(data.kpis.cancelledProjects, 1);
  });

  it('3. Pending approvals query counts and retrieves pending budgets only', async () => {
    const fakeCreatedAt = new Date('2026-11-20T10:00:00Z');
    let capturedApprovalsSql = '';

    mockQuery = async (sql) => {
      if (sql.includes('WHERE b.approval_status = \'PENDING\'')) {
        capturedApprovalsSql = sql;
        return {
          rows: [
            {
              budget_id: '5',
              project_id: '12',
              project_code: 'PRJ-2026-012',
              projectName: 'Kandy HQ Signboard',
              project_name: 'Kandy HQ Signboard',
              customer_name: 'Dialog Axiata PLC',
              version_number: '2',
              total_cost: '250000.00',
              created_at: fakeCreatedAt,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    assert.match(capturedApprovalsSql, /WHERE b\.approval_status = 'PENDING'/);
    assert.strictEqual(data.pendingApprovals.length, 1);
    assert.deepStrictEqual(data.pendingApprovals[0], {
      budgetId: 5,
      projectId: 12,
      projectCode: 'PRJ-2026-012',
      projectName: 'Kandy HQ Signboard',
      customerName: 'Dialog Axiata PLC',
      versionNumber: 2,
      totalCost: 250000,
      createdAt: fakeCreatedAt,
    });
  });

  it('4. Stage distribution mapping correctly parses 8 project stages', async () => {
    const mockStages = [
      { stage_id: '1', stage_order: '1', stage_name: 'PROJECT_REGISTRATION', project_count: '5' },
      { stage_id: '2', stage_order: '2', stage_name: 'REQUIREMENTS_GATHERING', project_count: '8' },
      { stage_id: '3', stage_order: '3', stage_name: 'DESIGN', project_count: '6' },
      { stage_id: '4', stage_order: '4', stage_name: 'BUDGET_AND_QUOTATION', project_count: '4' },
      { stage_id: '5', stage_order: '5', stage_name: 'ADVANCE_PAYMENT', project_count: '3' },
      { stage_id: '6', stage_order: '6', stage_name: 'PRODUCTION_AND_QUALITY', project_count: '7' },
      { stage_id: '7', stage_order: '7', stage_name: 'INSTALLATION', project_count: '5' },
      { stage_id: '8', stage_order: '8', stage_name: 'FINAL_PAYMENT_AND_COMPLETION', project_count: '2' },
    ];

    mockQuery = async (sql) => {
      if (sql.includes('FROM project_stages ps')) {
        return { rows: mockStages };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    assert.strictEqual(data.stageDistribution.length, 8);
    assert.deepStrictEqual(data.stageDistribution[0], {
      stageId: 1,
      stageOrder: 1,
      stageName: 'PROJECT_REGISTRATION',
      projectCount: 5,
    });
    assert.deepStrictEqual(data.stageDistribution[7], {
      stageId: 8,
      stageOrder: 8,
      stageName: 'FINAL_PAYMENT_AND_COMPLETION',
      projectCount: 2,
    });
  });

  it('5. Latest active PM assignment is retrieved without duplicate project rows', async () => {
    let capturedProjectsSql = '';
    const fakeDate = new Date('2026-11-19T08:00:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('ORDER BY p.created_at DESC')) {
        capturedProjectsSql = sql;
        return {
          rows: [
            {
              project_id: '101',
              project_code: 'PRJ-2026-101',
              project_name: 'Main Signboard Colombo',
              customer_name: 'Cargills Ceylon',
              stage_order: '3',
              stage_name: 'DESIGN',
              project_status: 'ACTIVE',
              assigned_pm_name: 'Kamal Perera',
              created_at: fakeDate,
            },
            {
              project_id: '102',
              project_code: 'PRJ-2026-102',
              project_name: 'Branch Pylon Sign',
              customer_name: 'Keells Super',
              stage_order: '1',
              stage_name: 'PROJECT_REGISTRATION',
              project_status: 'ACTIVE',
              assigned_pm_name: null,
              created_at: fakeDate,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    // Verify LATERAL join pattern for deduplicated latest PM
    assert.match(capturedProjectsSql, /LEFT JOIN LATERAL/);
    assert.match(capturedProjectsSql, /pa\.ended_at IS NULL/);
    assert.match(capturedProjectsSql, /ORDER BY pa\.assigned_at DESC/);
    assert.match(capturedProjectsSql, /LIMIT 1/);

    assert.strictEqual(data.recentProjects.length, 2);
    assert.strictEqual(data.recentProjects[0].assignedPmName, 'Kamal Perera');
    assert.strictEqual(data.recentProjects[1].assignedPmName, null);
  });

  it('6. Recent projects query enforces LIMIT 10 and parses fields properly', async () => {
    let capturedProjectsSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('ORDER BY p.created_at DESC')) {
        capturedProjectsSql = sql;
        return {
          rows: Array.from({ length: 10 }, (_, i) => ({
            project_id: String(i + 1),
            project_code: `PRJ-2026-${String(i + 1).padStart(3, '0')}`,
            project_name: `Project ${i + 1}`,
            customer_name: `Customer ${i + 1}`,
            stage_order: '2',
            stage_name: 'REQUIREMENTS_GATHERING',
            project_status: 'ACTIVE',
            assigned_pm_name: 'Test PM',
            created_at: new Date(),
          })),
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    assert.match(capturedProjectsSql, /LIMIT 10/);
    assert.strictEqual(data.recentProjects.length, 10);
    assert.strictEqual(data.recentProjects[0].projectId, 1);
    assert.strictEqual(data.recentProjects[9].projectId, 10);
  });

  it('7. Recent activity uses verified history columns and joins users via changed_by', async () => {
    let capturedActivitySql = '';
    const fakeChangedAt = new Date('2026-11-21T09:30:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('FROM project_status_history h')) {
        capturedActivitySql = sql;
        return {
          rows: [
            {
              history_id: '42',
              project_id: '15',
              project_code: 'PRJ-2026-015',
              project_name: 'Odel Signboard',
              change_type: 'MANUAL_STAGE_CHANGE',
              is_manual_change: true,
              change_reason: 'Client requested rush fabrication',
              old_stage_name: 'DESIGN',
              new_stage_name: 'PRODUCTION_AND_QUALITY',
              changed_by_name: 'Admin Owner',
              changed_at: fakeChangedAt,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    // Verify exact verified columns used
    assert.match(capturedActivitySql, /h\.old_stage_id = old_ps\.stage_id/);
    assert.match(capturedActivitySql, /h\.new_stage_id = new_ps\.stage_id/);
    assert.match(capturedActivitySql, /JOIN users u ON h\.changed_by = u\.user_id/);
    assert.match(capturedActivitySql, /ORDER BY h\.changed_at DESC/);
    assert.match(capturedActivitySql, /LIMIT 10/);
    // Nonexistent columns must never appear
    assert.doesNotMatch(capturedActivitySql, /from_stage_id/);
    assert.doesNotMatch(capturedActivitySql, /to_stage_id/);

    assert.strictEqual(data.recentActivity.length, 1);
    assert.deepStrictEqual(data.recentActivity[0], {
      historyId: 42,
      projectId: 15,
      projectCode: 'PRJ-2026-015',
      projectName: 'Odel Signboard',
      changeType: 'MANUAL_STAGE_CHANGE',
      isManualChange: true,
      changeReason: 'Client requested rush fabrication',
      oldStageName: 'DESIGN',
      newStageName: 'PRODUCTION_AND_QUALITY',
      changedByName: 'Admin Owner',
      changedAt: fakeChangedAt,
    });
  });

  it('8. Empty database results safely return numeric zeros and empty arrays', async () => {
    mockQuery = async () => {
      // Simulate empty rows for every query
      return { rows: [] };
    };

    const data = await dashboardDataService.getOwnerDashboardData();

    assert.deepStrictEqual(data.kpis, {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      cancelledProjects: 0,
      totalCustomers: 0,
      pendingApprovalsCount: 0,
    });
    assert.deepStrictEqual(data.stageDistribution, []);
    assert.deepStrictEqual(data.pendingApprovals, []);
    assert.deepStrictEqual(data.recentProjects, []);
    assert.deepStrictEqual(data.recentActivity, []);
  });

  it('9. Database errors are handled safely without exposing raw database secrets', async () => {
    mockQuery = async () => {
      throw new Error('Connection terminated unexpectedly: postgres://secret@db:5432');
    };

    await assert.rejects(
      async () => {
        await dashboardDataService.getOwnerDashboardData();
      },
      (err) => {
        assert.strictEqual(err.message, 'Failed to retrieve owner dashboard data');
        assert.doesNotMatch(err.message, /postgres:\/\//);
        assert.doesNotMatch(err.message, /secret/);
        return true;
      }
    );
  });
});
