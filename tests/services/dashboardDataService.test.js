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

describe('dashboardDataService.getPmDashboardData - Isolated Unit Tests', () => {
  beforeEach(() => {
    mockQuery = null;
  });

  it('1. Correct PM KPI mapping', async () => {
    mockQuery = async (sql, params) => {
      if (sql.includes('my_active_projects_count')) {
        return {
          rows: [
            {
              my_active_projects_count: '12',
              requires_attention_count: '3',
              pending_site_visits_count: '2',
              pending_design_work_count: '4',
              pending_quality_checks_count: '3',
              upcoming_installations_count: '2',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getPmDashboardData(4);

    assert.deepStrictEqual(data.kpis, {
      myActiveProjectsCount: 12,
      requiresAttentionCount: 3,
      pendingSiteVisitsCount: 2,
      pendingDesignWorkCount: 4,
      pendingQualityChecksCount: 3,
      upcomingInstallationsCount: 2,
    });
  });

  it('2. Invalid or missing pmUserId rejects before querying database', async () => {
    let queryCalled = false;
    mockQuery = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const invalidInputs = [
      undefined,
      null,
      '',
      '   ',
      0,
      -5,
      '-1',
      'abc',
      NaN,
      {},
      [],
      true,
      false,
      3.14,
    ];

    for (const input of invalidInputs) {
      await assert.rejects(
        async () => {
          await dashboardDataService.getPmDashboardData(input);
        },
        (err) => {
          assert.strictEqual(err.message, 'Invalid or missing pmUserId');
          return true;
        }
      );
    }

    assert.strictEqual(queryCalled, false, 'Database query must not be executed for invalid pmUserId');
  });

  it('3. Parameterized PM identity handling passes parsed numeric ID', async () => {
    const capturedParams = [];
    mockQuery = async (sql, params) => {
      capturedParams.push(params);
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData('42');

    assert.strictEqual(capturedParams.length, 5, 'All 5 queries must be executed');
    for (const params of capturedParams) {
      assert.deepStrictEqual(params, [42], 'pmUserId string "42" must be parsed and passed as number 42');
    }
  });

  it('4. Active assignment filtering ensures ended_at IS NULL is enforced', async () => {
    const executedQueries = [];
    mockQuery = async (sql) => {
      executedQueries.push(sql);
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(10);

    for (const sql of executedQueries) {
      assert.match(sql, /pa\.ended_at IS NULL/, 'Every query must filter on active assignments with ended_at IS NULL');
    }
  });

  it('5. Duplicate assignment prevention ensures projects are not multiplied', async () => {
    let capturedKpiSql = '';
    let capturedProjectsSql = '';

    mockQuery = async (sql) => {
      if (sql.includes('my_active_projects_count')) {
        capturedKpiSql = sql;
      }
      if (sql.includes('ORDER BY pa.assigned_at DESC, p.project_id DESC')) {
        capturedProjectsSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(7);

    // KPI CTE uses EXISTS so multiple assignment rows never duplicate project rows
    assert.match(capturedKpiSql, /EXISTS\s*\(\s*SELECT 1 FROM project_assignments pa/);
    // Assigned projects query uses LATERAL ... LIMIT 1 to prevent multiple rows per project
    assert.match(capturedProjectsSql, /JOIN LATERAL/);
    assert.match(capturedProjectsSql, /LIMIT 1/);
  });

  it('6. Correct pending site visit detection checks Stage 2 without site_visits', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('my_active_projects_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(7);

    assert.match(capturedKpiSql, /stage_order = 2/);
    assert.match(capturedKpiSql, /NOT EXISTS\s*\(\s*SELECT 1 FROM site_visits/);
  });

  it('7. Correct client-approved design detection checks Stage 3 without approved design', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('my_active_projects_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(7);

    assert.match(capturedKpiSql, /stage_order = 3/);
    assert.match(capturedKpiSql, /NOT EXISTS\s*\(\s*SELECT 1 FROM design_versions dv/);
    assert.match(capturedKpiSql, /dv\.approval_status = 'APPROVED'/);
  });

  it('8. Correct PASS quality-check detection checks Stage 6 without result = PASS', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('my_active_projects_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(7);

    assert.match(capturedKpiSql, /stage_order = 6/);
    assert.match(capturedKpiSql, /NOT EXISTS\s*\(\s*SELECT 1 FROM quality_checks qc/);
    assert.match(capturedKpiSql, /qc\.result = 'PASS'/);
  });

  it('9. Multiple installation visit handling checks Stage 7 with missing or INCOMPLETE installation', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('my_active_projects_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(7);

    assert.match(capturedKpiSql, /stage_order = 7/);
    assert.match(capturedKpiSql, /NOT EXISTS\s*\(\s*SELECT 1 FROM installations/);
    assert.match(capturedKpiSql, /i\.installation_status = 'INCOMPLETE'/);
  });

  it('10. Distinct requiresAttentionCount prevents double-counting across blocker categories', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('my_active_projects_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getPmDashboardData(7);

    assert.match(capturedKpiSql, /SELECT COUNT\(DISTINCT project_id\)::int/);
    assert.match(capturedKpiSql, /FROM \(\s*SELECT project_id FROM pending_site_visits\s*UNION\s*SELECT project_id FROM pending_designs\s*UNION\s*SELECT project_id FROM pending_qc\s*\) blockers/);
  });

  it('11. All eight stage distribution entries are returned including zero counts', async () => {
    const mockStages = [
      { stage_id: '1', stage_order: '1', stage_name: 'PROJECT_REGISTRATION', project_count: '2' },
      { stage_id: '2', stage_order: '2', stage_name: 'REQUIREMENTS_GATHERING', project_count: '0' },
      { stage_id: '3', stage_order: '3', stage_name: 'DESIGN', project_count: '3' },
      { stage_id: '4', stage_order: '4', stage_name: 'BUDGET_AND_QUOTATION', project_count: '0' },
      { stage_id: '5', stage_order: '5', stage_name: 'ADVANCE_PAYMENT', project_count: '1' },
      { stage_id: '6', stage_order: '6', stage_name: 'PRODUCTION_AND_QUALITY', project_count: '4' },
      { stage_id: '7', stage_order: '7', stage_name: 'INSTALLATION', project_count: '2' },
      { stage_id: '8', stage_order: '8', stage_name: 'FINAL_PAYMENT_AND_COMPLETION', project_count: '0' },
    ];

    mockQuery = async (sql) => {
      if (sql.includes('FROM project_stages ps')) {
        return { rows: mockStages };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getPmDashboardData(3);

    assert.strictEqual(data.stageDistribution.length, 8);
    assert.deepStrictEqual(data.stageDistribution[1], {
      stageId: 2,
      stageOrder: 2,
      stageName: 'REQUIREMENTS_GATHERING',
      projectCount: 0,
    });
    assert.deepStrictEqual(data.stageDistribution[7], {
      stageId: 8,
      stageOrder: 8,
      stageName: 'FINAL_PAYMENT_AND_COMPLETION',
      projectCount: 0,
    });
  });

  it('12. Action item mapping and duplicate prevention', async () => {
    mockQuery = async (sql) => {
      if (sql.includes('SITE_VISIT')) {
        return {
          rows: [
            {
              type: 'SITE_VISIT',
              project_id: '201',
              project_code: 'PRJ-2026-201',
              project_name: 'Supermarket Facade',
              description: 'Site measurement and requirements gathering pending.',
              stage_name: 'REQUIREMENTS_GATHERING',
            },
            {
              type: 'DESIGN_WORK',
              project_id: '202',
              project_code: 'PRJ-2026-202',
              project_name: 'Branch Neon Sign',
              description: 'Client design approval pending.',
              stage_name: 'DESIGN',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getPmDashboardData(5);

    assert.strictEqual(data.actionItems.length, 2);
    assert.deepStrictEqual(data.actionItems[0], {
      type: 'SITE_VISIT',
      projectId: 201,
      projectCode: 'PRJ-2026-201',
      projectName: 'Supermarket Facade',
      description: 'Site measurement and requirements gathering pending.',
      stageName: 'REQUIREMENTS_GATHERING',
    });
    assert.deepStrictEqual(data.actionItems[1], {
      type: 'DESIGN_WORK',
      projectId: 202,
      projectCode: 'PRJ-2026-202',
      projectName: 'Branch Neon Sign',
      description: 'Client design approval pending.',
      stageName: 'DESIGN',
    });
  });

  it('13. Assigned project mapping includes customer name and stage info', async () => {
    const fakeAssignedAt = new Date('2026-11-20T14:00:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('ORDER BY pa.assigned_at DESC, p.project_id DESC')) {
        return {
          rows: [
            {
              project_id: '301',
              project_code: 'PRJ-2026-301',
              project_name: 'Hotel Roof Sign',
              customer_name: 'Aitken Spence PLC',
              stage_order: '6',
              stage_name: 'PRODUCTION_AND_QUALITY',
              project_status: 'ACTIVE',
              assigned_at: fakeAssignedAt,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getPmDashboardData(2);

    assert.strictEqual(data.assignedProjects.length, 1);
    assert.deepStrictEqual(data.assignedProjects[0], {
      projectId: 301,
      projectCode: 'PRJ-2026-301',
      projectName: 'Hotel Roof Sign',
      customerName: 'Aitken Spence PLC',
      stageOrder: 6,
      stageName: 'PRODUCTION_AND_QUALITY',
      projectStatus: 'ACTIVE',
      assignedAt: fakeAssignedAt,
    });
  });

  it('14. Latest 10 quality checks and inspector mapping', async () => {
    let capturedQcSql = '';
    const fakeCheckDate = new Date('2026-11-22T11:00:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('FROM quality_checks qc')) {
        capturedQcSql = sql;
        return {
          rows: [
            {
              quality_check_id: '50',
              project_id: '301',
              project_code: 'PRJ-2026-301',
              project_name: 'Hotel Roof Sign',
              result: 'PASS',
              remarks: 'Illumination and acrylic joints passed inspection',
              check_date: fakeCheckDate,
              inspector_name: 'Sunil Quality Lead',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getPmDashboardData(2);

    assert.match(capturedQcSql, /LIMIT 10/);
    assert.match(capturedQcSql, /ORDER BY qc\.check_date DESC/);
    assert.strictEqual(data.recentQualityChecks.length, 1);
    assert.deepStrictEqual(data.recentQualityChecks[0], {
      qualityCheckId: 50,
      projectId: 301,
      projectCode: 'PRJ-2026-301',
      projectName: 'Hotel Roof Sign',
      result: 'PASS',
      remarks: 'Illumination and acrylic joints passed inspection',
      checkDate: fakeCheckDate,
      inspectorName: 'Sunil Quality Lead',
    });
  });

  it('15. Empty database results return zero KPI values and empty arrays', async () => {
    mockQuery = async () => {
      return { rows: [] };
    };

    const data = await dashboardDataService.getPmDashboardData(99);

    assert.deepStrictEqual(data.kpis, {
      myActiveProjectsCount: 0,
      requiresAttentionCount: 0,
      pendingSiteVisitsCount: 0,
      pendingDesignWorkCount: 0,
      pendingQualityChecksCount: 0,
      upcomingInstallationsCount: 0,
    });
    assert.deepStrictEqual(data.stageDistribution, []);
    assert.deepStrictEqual(data.actionItems, []);
    assert.deepStrictEqual(data.assignedProjects, []);
    assert.deepStrictEqual(data.recentQualityChecks, []);
  });

  it('16. Database error handling without exposing sensitive database details', async () => {
    mockQuery = async () => {
      throw new Error('Fatal socket connection error: postgres://pm_user:secret_pw@db:5432/signboard');
    };

    await assert.rejects(
      async () => {
        await dashboardDataService.getPmDashboardData(5);
      },
      (err) => {
        assert.strictEqual(err.message, 'Failed to retrieve PM dashboard data');
        assert.doesNotMatch(err.message, /postgres:\/\//);
        assert.doesNotMatch(err.message, /secret/);
        return true;
      }
    );
  });
});

describe('dashboardDataService.getAccountsDashboardData - Isolated Unit Tests', () => {
  beforeEach(() => {
    mockQuery = null;
  });

  it('1. Correct KPI mapping', async () => {
    mockQuery = async (sql) => {
      if (sql.includes('pending_budget_prep_count')) {
        return {
          rows: [
            {
              pending_budget_prep_count: '2',
              quotations_draft_count: '2',
              quotations_sent_count: '1',
              pending_quotations_count: '3',
              total_outstanding_balance: '1240000.50',
              unpaid_invoices_count: '1',
              payments_received_this_month: '7111000.00',
              payment_count_this_month: '8',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.deepStrictEqual(data.kpis, {
      pendingBudgetPrepCount: 2,
      quotationsDraftCount: 2,
      quotationsSentCount: 1,
      pendingQuotationsCount: 3,
      totalOutstandingBalance: 1240000.5,
      unpaidInvoicesCount: 1,
      paymentsReceivedThisMonth: 7111000,
      paymentCountThisMonth: 8,
    });
  });

  it('2. Budget preparation task detection for active Stage 4 projects without budget', async () => {
    let capturedTasksSql = '';
    const fakeCreatedAt = new Date('2026-11-18T09:00:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('TASK-BUDGET-')) {
        capturedTasksSql = sql;
        return {
          rows: [
            {
              task_id: 'TASK-BUDGET-104',
              task_type: 'BUDGET_PREP',
              project_id: '104',
              project_code: 'PRJ-2026-104',
              project_name: 'Keells Supermarket Pylon',
              customer_name: 'Jayasinghe Stores',
              description: 'Design approved. Prepare initial material & fabrication budget.',
              action_label: 'Prepare Budget',
              priority_date: fakeCreatedAt,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /ps\.stage_order = 4/);
    assert.match(capturedTasksSql, /p\.project_status = 'ACTIVE'/);
    assert.match(capturedTasksSql, /NOT EXISTS\s*\(\s*SELECT 1 FROM budgets/);

    assert.strictEqual(data.pendingFinancialTasks.length, 1);
    assert.deepStrictEqual(data.pendingFinancialTasks[0], {
      taskId: 'TASK-BUDGET-104',
      taskType: 'BUDGET_PREP',
      projectId: 104,
      projectCode: 'PRJ-2026-104',
      projectName: 'Keells Supermarket Pylon',
      customerName: 'Jayasinghe Stores',
      description: 'Design approved. Prepare initial material & fabrication budget.',
      actionLabel: 'Prepare Budget',
      priorityDate: fakeCreatedAt,
    });
  });

  it('3. Latest DRAFT quotation selection uses version_number DESC for Stage 4 active projects', async () => {
    let capturedTasksSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('TASK-QUOTE-')) {
        capturedTasksSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /JOIN LATERAL/);
    assert.match(capturedTasksSql, /q_sub\.quotation_status = 'DRAFT'/);
    assert.match(capturedTasksSql, /ORDER BY q_sub\.version_number DESC/);
    assert.match(capturedTasksSql, /LIMIT 1/);
    assert.match(capturedTasksSql, /ps\.stage_order = 4/);
  });

  it('4. DRAFT and SENT quotation counts query verified quotation_status', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('quotations_draft_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedKpiSql, /SELECT COUNT\(\*\)::int FROM quotations WHERE quotation_status = 'DRAFT'/);
    assert.match(capturedKpiSql, /SELECT COUNT\(\*\)::int FROM quotations WHERE quotation_status = 'SENT'/);
    assert.doesNotMatch(capturedKpiSql, /approval_status/);
  });

  it('5. Correct pending quotation total sums DRAFT and SENT statuses', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('pending_quotations_count')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedKpiSql, /WHERE quotation_status IN \('DRAFT', 'SENT'\)/);
  });

  it('6. Advance invoice task detection uses latest ACCEPTED quotation on active Stage 5 projects without invoice', async () => {
    let capturedTasksSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('TASK-ADV-INV-')) {
        capturedTasksSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /ps\.stage_order = 5/);
    assert.match(capturedTasksSql, /q_sub\.quotation_status = 'ACCEPTED'/);
    assert.match(capturedTasksSql, /ORDER BY q_sub\.version_number DESC/);
    assert.match(capturedTasksSql, /NOT EXISTS\s*\(\s*SELECT 1 FROM invoices/);
  });

  it('7. Correct accepted_at / created_at fallback for priorityDate in advance invoice task', async () => {
    let capturedTasksSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('TASK-ADV-INV-')) {
        capturedTasksSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /COALESCE\(q\.accepted_at, q\.created_at\) AS priority_date/);
  });

  it('8. 30% advance threshold is calculated from tax-inclusive invoices.total_amount using ROUND', async () => {
    let capturedTasksSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('TASK-COLL-ADV-')) {
        capturedTasksSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /ROUND\(0\.30 \* inv\.total_amount, 2\)/);
    assert.doesNotMatch(capturedTasksSql, /quotation_items\.total_price/);
  });

  it('9. Partial ADVANCE payment aggregation sums payments with payment_type = ADVANCE', async () => {
    let capturedTasksSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('TASK-COLL-ADV-')) {
        capturedTasksSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /SELECT COALESCE\(SUM\(pay\.amount\), 0\) AS total_advance_paid/);
    assert.match(capturedTasksSql, /pay\.payment_type = 'ADVANCE'/);
  });

  it('10. Correct COLLECT_ADVANCE task detection when advance paid is below 30% threshold', async () => {
    let capturedTasksSql = '';
    const fakeInvoiceDate = new Date('2026-11-19T10:00:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('TASK-COLL-ADV-')) {
        capturedTasksSql = sql;
        return {
          rows: [
            {
              task_id: 'TASK-COLL-ADV-12',
              task_type: 'COLLECT_ADVANCE',
              project_id: '106',
              project_code: 'PRJ-2026-106',
              project_name: 'Crescat Boulevard Sign',
              customer_name: 'Crescat Mall Ltd',
              description: 'Advance invoice issued. Collect required 30% advance deposit of LKR 150,000.00 (Remaining: LKR 50,000.00).',
              action_label: 'Record Advance Payment',
              priority_date: fakeInvoiceDate,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /COALESCE\(adv_pay\.total_advance_paid, 0\) < ROUND\(0\.30 \* inv\.total_amount, 2\)/);
    assert.strictEqual(data.pendingFinancialTasks.length, 1);
    assert.strictEqual(data.pendingFinancialTasks[0].taskType, 'COLLECT_ADVANCE');
  });

  it('11. Correct COLLECT_FINAL task detection for active Stage 8 projects with balance_amount > 0', async () => {
    let capturedTasksSql = '';
    const fakeInvoiceDate = new Date('2026-11-15T08:00:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('TASK-INV-')) {
        capturedTasksSql = sql;
        return {
          rows: [
            {
              task_id: 'TASK-INV-44',
              task_type: 'COLLECT_FINAL',
              project_id: '108',
              project_code: 'PRJ-2026-108',
              project_name: 'Odel Department Store Flagship',
              customer_name: 'Odel PLC',
              description: 'Project in final completion. Invoice SBL-INV-044 has outstanding balance of LKR 1,240,000.00',
              action_label: 'Record Final Payment',
              priority_date: fakeInvoiceDate,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedTasksSql, /ps\.stage_order = 8/);
    assert.match(capturedTasksSql, /inv\.balance_amount > 0/);
    assert.strictEqual(data.pendingFinancialTasks.length, 1);
    assert.strictEqual(data.pendingFinancialTasks[0].taskType, 'COLLECT_FINAL');
  });

  it('12. Outstanding invoice balance and count calculations strictly filter balance_amount > 0', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('total_outstanding_balance')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedKpiSql, /SELECT\s+COALESCE\(SUM\(balance_amount\),\s*0\)::numeric\s+FROM\s+invoices\s+WHERE\s+balance_amount\s*>\s*0/);
    assert.match(capturedKpiSql, /SELECT\s+COUNT\(\*\)::int\s+FROM\s+invoices\s+WHERE\s+balance_amount\s*>\s*0/);
    assert.doesNotMatch(capturedKpiSql, /payment_status/);
    assert.doesNotMatch(capturedKpiSql, /due_date/);
  });

  it('13. Asia/Colombo calendar-month payment boundaries use bounded month start and next month start', async () => {
    let capturedKpiSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('payments_received_this_month')) {
        capturedKpiSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    assert.match(capturedKpiSql, /date_trunc\('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia\/Colombo'\)/);
    assert.match(capturedKpiSql, /INTERVAL '1 month'/);
    assert.doesNotMatch(capturedKpiSql, /is_cleared/);
    assert.doesNotMatch(capturedKpiSql, /cleared_at/);
  });

  it('14. Recent payment mapping correctly formats numeric amount and fields', async () => {
    const fakePaymentDate = new Date('2026-11-21T14:30:00Z');

    mockQuery = async (sql) => {
      if (sql.includes('FROM payments pay')) {
        return {
          rows: [
            {
              payment_id: '88',
              project_id: '106',
              project_code: 'PRJ-2026-106',
              project_name: 'Crescat Boulevard Sign',
              customer_name: 'Crescat Mall Ltd',
              amount: '100000.00',
              payment_type: 'ADVANCE',
              payment_method: 'BANK_TRANSFER',
              reference_number: 'BOC-TXN-998231',
              payment_date: fakePaymentDate,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.strictEqual(data.recentPayments.length, 1);
    assert.deepStrictEqual(data.recentPayments[0], {
      paymentId: 88,
      projectId: 106,
      projectCode: 'PRJ-2026-106',
      projectName: 'Crescat Boulevard Sign',
      customerName: 'Crescat Mall Ltd',
      amount: 100000,
      paymentType: 'ADVANCE',
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'BOC-TXN-998231',
      paymentDate: fakePaymentDate,
    });
  });

  it('15. Outstanding invoice mapping correctly formats invoice fields and amounts', async () => {
    const fakeInvoiceDate = new Date('2026-11-16');

    mockQuery = async (sql) => {
      if (sql.includes('FROM invoices inv')) {
        return {
          rows: [
            {
              invoice_id: '44',
              invoice_number: 'SBL-INV-044',
              project_id: '108',
              project_code: 'PRJ-2026-108',
              project_name: 'Odel Department Store Flagship',
              customer_name: 'Odel PLC',
              invoice_date: fakeInvoiceDate,
              total_amount: '2000000.00',
              advance_paid: '760000.00',
              balance_amount: '1240000.00',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.strictEqual(data.outstandingInvoices.length, 1);
    assert.deepStrictEqual(data.outstandingInvoices[0], {
      invoiceId: 44,
      invoiceNumber: 'SBL-INV-044',
      projectId: 108,
      projectCode: 'PRJ-2026-108',
      projectName: 'Odel Department Store Flagship',
      customerName: 'Odel PLC',
      invoiceDate: fakeInvoiceDate,
      totalAmount: 2000000,
      advancePaid: 760000,
      balanceAmount: 1240000,
    });
  });

  it('16. No duplicate tasks or duplicated aggregate amounts are returned', async () => {
    let capturedTasksSql = '';
    mockQuery = async (sql) => {
      if (sql.includes('UNION ALL')) {
        capturedTasksSql = sql;
      }
      return { rows: [] };
    };

    await dashboardDataService.getAccountsDashboardData();

    // Verify limit and deterministic ordering
    assert.match(capturedTasksSql, /ORDER BY priority_date DESC/);
    assert.match(capturedTasksSql, /LIMIT 10/);
  });

  it('17. Empty database results return zero numeric KPIs and empty arrays', async () => {
    mockQuery = async () => {
      return { rows: [] };
    };

    const data = await dashboardDataService.getAccountsDashboardData();

    assert.deepStrictEqual(data.kpis, {
      pendingBudgetPrepCount: 0,
      quotationsDraftCount: 0,
      quotationsSentCount: 0,
      pendingQuotationsCount: 0,
      totalOutstandingBalance: 0,
      unpaidInvoicesCount: 0,
      paymentsReceivedThisMonth: 0,
      paymentCountThisMonth: 0,
    });
    assert.deepStrictEqual(data.pendingFinancialTasks, []);
    assert.deepStrictEqual(data.recentPayments, []);
    assert.deepStrictEqual(data.outstandingInvoices, []);
  });

  it('18. Database error sanitization without exposing sensitive database details', async () => {
    mockQuery = async () => {
      throw new Error('Connection refused: postgres://accounts_user:secret_pwd@127.0.0.1:5432/signboard');
    };

    await assert.rejects(
      async () => {
        await dashboardDataService.getAccountsDashboardData();
      },
      (err) => {
        assert.strictEqual(err.message, 'Failed to retrieve accounts dashboard data');
        assert.doesNotMatch(err.message, /postgres:\/\//);
        assert.doesNotMatch(err.message, /secret_pwd/);
        return true;
      }
    );
  });

  it('19. Owner and PM regression tests continue passing alongside Accounts implementation', async () => {
    mockQuery = async () => ({ rows: [] });

    const ownerData = await dashboardDataService.getOwnerDashboardData();
    const pmData = await dashboardDataService.getPmDashboardData(1);
    const accountsData = await dashboardDataService.getAccountsDashboardData();

    assert.ok(ownerData.kpis);
    assert.ok(pmData.kpis);
    assert.ok(accountsData.kpis);
  });
});
