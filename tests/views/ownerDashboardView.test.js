const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const templatePath = path.resolve(__dirname, '../../views/dashboards/owner.ejs');

async function renderView(data = {}, user = {}, csrfToken = 'test_csrf_token_12345678901234567890') {
  return ejs.renderFile(templatePath, {
    user: {
      userId: '1',
      fullName: 'System Owner',
      role: 'OWNER',
      ...user,
    },
    csrfToken,
    data,
  });
}

function createFullOwnerData() {
  return {
    kpis: {
      totalProjects: 120,
      activeProjects: 35,
      completedProjects: 75,
      cancelledProjects: 10,
      totalCustomers: 85,
      pendingApprovalsCount: 4,
    },
    stageDistribution: [
      { stageId: 1, stageOrder: 1, stageName: 'Project Registration', projectCount: 5 },
      { stageId: 2, stageOrder: 2, stageName: 'Requirements Gathering', projectCount: 3 },
      { stageId: 3, stageOrder: 3, stageName: 'Design', projectCount: 7 },
      { stageId: 4, stageOrder: 4, stageName: 'Budget & Quotation', projectCount: 4 },
      { stageId: 5, stageOrder: 5, stageName: 'Advance Payment (30%)', projectCount: 6 },
      { stageId: 6, stageOrder: 6, stageName: 'Quality Check', projectCount: 2 },
      { stageId: 7, stageOrder: 7, stageName: 'Installation', projectCount: 5 },
      { stageId: 8, stageOrder: 8, stageName: 'Final Payment & Completion', projectCount: 3 },
    ],
    pendingApprovals: [
      {
        budgetId: 101,
        projectId: 1,
        projectCode: 'PRJ-2026-001',
        projectName: 'Dialog Axiata 3D Acrylic Pylon Sign',
        customerName: 'Dialog Axiata PLC',
        versionNumber: 2,
        totalCost: 1850000,
        createdAt: '2026-11-20T10:00:00Z',
      },
      {
        budgetId: 102,
        projectId: 2,
        projectCode: 'PRJ-2026-002',
        projectName: 'Keells Supermarket Fascia',
        customerName: 'JayKay Marketing',
        versionNumber: 1,
        totalCost: 950000.5,
        createdAt: '2026-11-21T12:00:00Z',
      },
    ],
    recentProjects: [
      {
        projectId: 1,
        projectCode: 'PRJ-2026-001',
        projectName: 'Dialog Axiata 3D Acrylic Pylon Sign',
        customerName: 'Dialog Axiata PLC',
        stageOrder: 4,
        stageName: 'Budget & Quotation',
        projectStatus: 'ACTIVE',
        assignedPmName: 'Project Manager 01',
        createdAt: '2026-11-18T10:00:00Z',
      },
      {
        projectId: 2,
        projectCode: 'PRJ-2026-002',
        projectName: 'Cargills Food City Signage',
        customerName: 'Cargills Ceylon',
        stageOrder: 8,
        stageName: 'Final Payment & Completion',
        projectStatus: 'COMPLETED',
        assignedPmName: null, // Test unassigned PM
        createdAt: '2026-11-10T10:00:00Z',
      },
      {
        projectId: 3,
        projectCode: 'PRJ-2026-003',
        projectName: 'Old Bank Branch Sign',
        customerName: 'Commercial Bank',
        stageOrder: 2,
        stageName: 'Requirements Gathering',
        projectStatus: 'CANCELLED',
        assignedPmName: 'Project Manager 02',
        createdAt: '2026-11-05T10:00:00Z',
      },
    ],
    recentActivity: [
      {
        historyId: 201,
        projectId: 1,
        projectCode: 'PRJ-2026-001',
        projectName: 'Dialog Axiata 3D Acrylic Pylon Sign',
        changeType: 'STAGE_ADVANCED',
        isManualChange: false,
        changeReason: null,
        oldStageName: 'Design',
        newStageName: 'Budget & Quotation',
        changedByName: 'Project Manager 01',
        changedAt: '2026-11-20T14:30:00Z',
      },
      {
        historyId: 202,
        projectId: 3,
        projectCode: 'PRJ-2026-003',
        projectName: 'Old Bank Branch Sign',
        changeType: 'MANUAL_OVERRIDE',
        isManualChange: true,
        changeReason: 'Client requested cancellation due to relocation',
        oldStageName: 'Design',
        newStageName: 'Requirements Gathering',
        changedByName: 'System Owner',
        changedAt: '2026-11-19T09:15:00Z',
      },
    ],
  };
}

describe('Owner Dashboard EJS View Data Binding Tests', () => {
  it('1. should render fully populated Owner dashboard data correctly', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    // Welcome banner & user info
    assert.ok(html.includes('Welcome back, System Owner'));
    assert.ok(html.includes('35 active client projects'));
    assert.ok(html.includes('ROLE: OWNER'));

    // Six KPI cards
    assert.ok(html.includes('120')); // totalProjects
    assert.ok(html.includes('35'));  // activeProjects
    assert.ok(html.includes('75'));  // completedProjects
    assert.ok(html.includes('10'));  // cancelledProjects
    assert.ok(html.includes('85'));  // totalCustomers
    assert.ok(html.includes('4'));   // pendingApprovalsCount
  });

  it('2. should bind all six KPI values accurately without demo text', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    assert.ok(!html.includes('124 Total'), 'Old demo figure removed');
    assert.ok(!html.includes('+8 this month (Sample)'), 'Sample trend removed');
    assert.ok(!html.includes('LKR 148.2M Cleared Ledger'), 'Demo ledger removed');
    assert.ok(!html.includes('Demo Environment'), 'Demo environment banner updated');
  });

  it('3. should render all eight stages in canonical order with order, name, and count', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    assert.ok(html.includes('STG 01'));
    assert.ok(html.includes('Project Registration'));
    assert.ok(html.includes('STG 02'));
    assert.ok(html.includes('Requirements Gathering'));
    assert.ok(html.includes('STG 03'));
    assert.ok(html.includes('Design'));
    assert.ok(html.includes('STG 04'));
    assert.ok(html.includes('Budget &amp; Quotation')); // & is properly XML-escaped
    assert.ok(html.includes('STG 05'));
    assert.ok(html.includes('Advance Payment (30%)'));
    assert.ok(html.includes('STG 06'));
    assert.ok(html.includes('Quality Check'));
    assert.ok(html.includes('STG 07'));
    assert.ok(html.includes('Installation'));
    assert.ok(html.includes('STG 08'));
    assert.ok(html.includes('Final Payment &amp; Completion'));
  });

  it('4. should calculate stage percentage correctly against activeProjects total', async () => {
    const data = createFullOwnerData();
    // activeProjects = 35. Stg 1 count = 5. (5 / 35) * 100 = 14%
    const html = await renderView(data);
    assert.ok(html.includes('5 <span class="font-body-sm text-body-sm text-outline font-normal">/ 14%</span>'));
    assert.ok(html.includes('style="width: 14%;"'));
  });

  it('5. should handle zero active projects safely without division by zero or NaN%', async () => {
    const data = createFullOwnerData();
    data.kpis.activeProjects = 0;
    data.stageDistribution.forEach((s) => {
      s.projectCount = 0;
    });

    const html = await renderView(data);
    assert.ok(!html.includes('NaN%'));
    assert.ok(!html.includes('undefined%'));
    assert.ok(html.includes('0 <span class="font-body-sm text-body-sm text-outline font-normal">/ 0%</span>'));
    assert.ok(html.includes('style="width: 0%;"'));
  });

  it('6. should render pending budget approvals with formatted LKR currency and date', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    assert.ok(html.includes('PRJ-2026-001'));
    assert.ok(html.includes('Dialog Axiata 3D Acrylic Pylon Sign'));
    assert.ok(html.includes('Dialog Axiata PLC'));
    assert.ok(html.includes('v2'));
    assert.ok(html.includes('LKR 1,850,000.00'));

    assert.ok(html.includes('PRJ-2026-002'));
    assert.ok(html.includes('LKR 950,000.50'));
  });

  it('7. should render empty state when pending approvals is empty', async () => {
    const data = createFullOwnerData();
    data.pendingApprovals = [];
    const html = await renderView(data);

    assert.ok(html.includes('No Pending Approvals'));
    assert.ok(html.includes('All submitted project budgets have been authorized.'));
  });

  it('8. should render recent activity feed with transitions, user, and reason', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    assert.ok(html.includes('PRJ-2026-001'));
    assert.ok(html.includes('moved to <span class="text-primary font-medium">Budget &amp; Quotation</span> (from Design)'));
    assert.ok(html.includes('By Project Manager 01'));

    // Manual change with reason
    assert.ok(html.includes('PRJ-2026-003'));
    assert.ok(html.includes('(MANUAL)'));
    assert.ok(html.includes('By System Owner'));
    assert.ok(html.includes('Reason: "Client requested cancellation due to relocation"'));
  });

  it('9. should render empty state when recent activity is empty', async () => {
    const data = createFullOwnerData();
    data.recentActivity = [];
    const html = await renderView(data);

    assert.ok(html.includes('No recent activity recorded.'));
  });

  it('10. should render recent projects table with status badges and handle null PM as Unassigned', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    // Active project with PM
    assert.ok(html.includes('PRJ-2026-001'));
    assert.ok(html.includes('Project Manager 01'));
    assert.ok(html.includes('ACTIVE'));

    // Completed project with null PM -> Unassigned
    assert.ok(html.includes('PRJ-2026-002'));
    assert.ok(html.includes('Unassigned'));
    assert.ok(html.includes('COMPLETED'));

    // Cancelled project
    assert.ok(html.includes('PRJ-2026-003'));
    assert.ok(html.includes('CANCELLED'));
  });

  it('11. should render empty state when recent projects is empty', async () => {
    const data = createFullOwnerData();
    data.recentProjects = [];
    const html = await renderView(data);

    assert.ok(html.includes('No projects found in the system.'));
  });

  it('12. should properly HTML-escape dynamic strings to prevent XSS injection', async () => {
    const data = createFullOwnerData();
    data.pendingApprovals = [
      {
        budgetId: 999,
        projectId: 99,
        projectCode: '<script>alert("code")</script>',
        projectName: '<img src=x onerror=alert("name")>',
        customerName: '<b onmouseover=alert("cust")>Malicious Customer</b>',
        versionNumber: 1,
        totalCost: 1000,
        createdAt: '2026-11-20T10:00:00Z',
      },
    ];
    data.recentProjects = [
      {
        projectId: 99,
        projectCode: 'PRJ-XSS',
        projectName: '<script>alert("proj")</script>',
        customerName: 'Safe Corp',
        stageOrder: 1,
        stageName: 'Registration',
        projectStatus: 'ACTIVE',
        assignedPmName: '<script>alert("pm")</script>',
        createdAt: '2026-11-20T10:00:00Z',
      },
    ];
    data.recentActivity = [
      {
        historyId: 999,
        projectId: 99,
        projectCode: 'PRJ-XSS',
        projectName: 'Safe Project',
        changeType: 'STAGE_ADVANCED',
        isManualChange: true,
        changeReason: '<script>alert("reason")</script>',
        oldStageName: '<script>old</script>',
        newStageName: '<script>new</script>',
        changedByName: '<script>user</script>',
        changedAt: '2026-11-20T10:00:00Z',
      },
    ];

    const html = await renderView(data);

    // Assert that raw malicious tags are NOT present unescaped
    assert.ok(!html.includes('<script>alert("code")</script>'));
    assert.ok(!html.includes('<img src=x onerror=alert("name")>'));
    assert.ok(!html.includes('<script>alert("proj")</script>'));
    assert.ok(!html.includes('<script>alert("pm")</script>'));
    assert.ok(!html.includes('<script>alert("reason")</script>'));

    // Assert that escaped brackets are present
    assert.ok(html.includes('&lt;script&gt;alert('));
    assert.ok(html.includes('&lt;img src=x'));
  });

  it('13. should handle undefined or empty data payload gracefully', async () => {
    // Completely empty data object (simulating controller edge case)
    const html = await renderView({});

    assert.ok(html.includes('0 active client projects'));
    assert.ok(html.includes('No Pending Approvals'));
    assert.ok(html.includes('No recent activity recorded.'));
    assert.ok(html.includes('No projects found in the system.'));
    assert.ok(!html.includes('NaN'));
    assert.ok(!html.includes('undefined'));
  });

  it('14. should confirm all old fake demo watermark phrases have been removed', async () => {
    const data = createFullOwnerData();
    const html = await renderView(data);

    assert.ok(!html.includes('[SAMPLE / DEMO ERP DATASET'));
    assert.ok(!html.includes('SYS: OWNER DASHBOARD PREVIEW'));
    assert.ok(!html.includes('38 active client projects (Demo)'));
    assert.ok(!html.includes('Budgets &amp; Reactivation Reviews (Demo)'));
    assert.ok(!html.includes('PRJ-2025-089 (Sample)'));
    assert.ok(!html.includes('PRJ-2025-052 (Sample)'));
    assert.ok(!html.includes('PRJ-2025-098'));
  });

  describe('Mobile Responsive Navigation Drawer Tests', () => {
    it('15. should render the sidebar drawer with id="sidebarDrawer" and off-canvas responsive classes', async () => {
      const html = await renderView({});
      assert.ok(html.includes('id="sidebarDrawer"'), 'Sidebar must have id="sidebarDrawer"');
      assert.ok(html.includes('-translate-x-full'), 'Sidebar must be hidden off-canvas on mobile');
      assert.ok(html.includes('lg:translate-x-0'), 'Sidebar must be visible on desktop lg breakpoint');
      assert.ok(html.includes('transition-transform'), 'Sidebar must have smooth transition classes');
    });

    it('16. should render the mobile backdrop with id="mobileDrawerBackdrop" and click toggle', async () => {
      const html = await renderView({});
      assert.ok(html.includes('id="mobileDrawerBackdrop"'), 'Backdrop must have id="mobileDrawerBackdrop"');
      assert.ok(html.includes('hidden transition-opacity lg:hidden'), 'Backdrop must be hidden by default and hidden on desktop');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Backdrop must have click toggle handler');
    });

    it('17. should render mobile hamburger menu button with accessible label and mobile-only visibility', async () => {
      const html = await renderView({});
      assert.ok(html.includes('aria-label="Open sidebar menu"'), 'Hamburger button must have aria-label');
      assert.ok(html.includes('lg:hidden'), 'Hamburger button must be hidden on desktop');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Hamburger button must call toggleMobileMenu');
      assert.ok(html.includes('menu</span>'), 'Hamburger button must contain menu icon');
    });

    it('18. should render mobile drawer close button with accessible label and mobile-only visibility', async () => {
      const html = await renderView({});
      assert.ok(html.includes('aria-label="Close menu"'), 'Close button must have aria-label');
      assert.ok(html.includes('lg:hidden'), 'Close button must be hidden on desktop');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Close button must call toggleMobileMenu');
      assert.ok(html.includes('close</span>'), 'Close button must contain close icon');
    });

    it('19. should use responsive lg:pl-72 on main wrapper without hardcoded pl-72', async () => {
      const html = await renderView({});
      assert.ok(html.includes('lg:pl-72'), 'Wrapper must use responsive lg:pl-72');
      // Ensure no standalone pl-72 class without responsive prefix
      const hasHardcodedPl72 = /\bpl-72\b/.test(html.replace(/lg:pl-72/g, ''));
      assert.strictEqual(hasHardcodedPl72, false, 'No hardcoded pl-72 without lg: prefix should exist');
    });

    it('20. should position header responsively with left-0 right-0 lg:left-72', async () => {
      const html = await renderView({});
      assert.ok(html.includes('left-0 right-0 lg:left-72'), 'Header must span full width on mobile and offset on desktop');
      // Ensure no standalone left-72 class without lg: prefix
      const hasHardcodedLeft72 = /\bleft-72\b/.test(html.replace(/lg:left-72/g, ''));
      assert.strictEqual(hasHardcodedLeft72, false, 'No hardcoded left-72 without lg: prefix should exist');
    });

    it('21. should include toggleMobileMenu client function implementation in script', async () => {
      const html = await renderView({});
      assert.ok(html.includes('function toggleMobileMenu()'), 'toggleMobileMenu function must be defined');
      assert.ok(html.includes("document.getElementById('sidebarDrawer')"), 'Function must reference sidebarDrawer');
      assert.ok(html.includes("document.getElementById('mobileDrawerBackdrop')"), 'Function must reference mobileDrawerBackdrop');
      assert.ok(html.includes('-translate-x-full'), 'Function must toggle -translate-x-full class');
    });
  });
});
