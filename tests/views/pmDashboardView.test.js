const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const templatePath = path.resolve(__dirname, '../../views/dashboards/pm.ejs');

async function renderView(data = {}, user = {}, csrfToken = 'test_csrf_token_12345678901234567890') {
  return ejs.renderFile(templatePath, {
    user: {
      userId: '4',
      fullName: 'Sunil Perera',
      role: 'PROJECT_MANAGER',
      ...user,
    },
    csrfToken,
    data,
  });
}

function createFullPmData() {
  return {
    kpis: {
      myActiveProjectsCount: 12,
      requiresAttentionCount: 5,
      pendingSiteVisitsCount: 2,
      pendingDesignWorkCount: 3,
      pendingQualityChecksCount: 1,
      upcomingInstallationsCount: 2,
    },
    stageDistribution: [
      { stageId: 1, stageOrder: 1, stageName: 'Project Registration', projectCount: 1 },
      { stageId: 2, stageOrder: 2, stageName: 'Requirements Gathering', projectCount: 2 },
      { stageId: 3, stageOrder: 3, stageName: 'Design', projectCount: 3 },
      { stageId: 4, stageOrder: 4, stageName: 'Budget & Quotation', projectCount: 2 },
      { stageId: 5, stageOrder: 5, stageName: 'Advance Payment', projectCount: 1 },
      { stageId: 6, stageOrder: 6, stageName: 'Quality Check', projectCount: 1 },
      { stageId: 7, stageOrder: 7, stageName: 'Installation', projectCount: 2 },
      { stageId: 8, stageOrder: 8, stageName: 'Final Payment & Completion', projectCount: 0 },
    ],
    actionItems: [
      {
        type: 'SITE_VISIT',
        projectId: 101,
        projectCode: 'PRJ-2026-101',
        projectName: 'Seylan Bank Head Office Fascia',
        description: 'Site measurement and requirements gathering pending.',
        stageName: 'Requirements Gathering',
      },
      {
        type: 'DESIGN_WORK',
        projectId: 102,
        projectCode: 'PRJ-2026-102',
        projectName: 'Dialog Axiata Acrylic Pylon',
        description: 'Client design approval pending.',
        stageName: 'Design',
      },
      {
        type: 'QUALITY_CHECK',
        projectId: 103,
        projectCode: 'PRJ-2026-103',
        projectName: 'Softlogic GLOMARK Channel Letters',
        description: 'Final production quality inspection pending.',
        stageName: 'Quality Check',
      },
      {
        type: 'INSTALLATION',
        projectId: 104,
        projectCode: 'PRJ-2026-104',
        projectName: 'Cinnamon Life Wayfinding Signs',
        description: 'On-site installation and completion verification pending.',
        stageName: 'Installation',
      },
    ],
    assignedProjects: [
      {
        projectId: 101,
        projectCode: 'PRJ-2026-101',
        projectName: 'Seylan Bank Head Office Fascia',
        customerName: 'Seylan Bank PLC',
        stageOrder: 2,
        stageName: 'Requirements Gathering',
        projectStatus: 'ACTIVE',
        assignedAt: '2026-11-10T08:30:00.000Z',
      },
      {
        projectId: 102,
        projectCode: 'PRJ-2026-102',
        projectName: 'Dialog Axiata Acrylic Pylon',
        customerName: 'Dialog Axiata PLC',
        stageOrder: 3,
        stageName: 'Design',
        projectStatus: 'ACTIVE',
        assignedAt: '2026-11-12T14:15:00.000Z',
      },
    ],
    recentQualityChecks: [
      {
        qualityCheckId: 201,
        projectId: 103,
        projectCode: 'PRJ-2026-103',
        projectName: 'Softlogic GLOMARK Channel Letters',
        result: 'PASS',
        remarks: 'Illumination test passed with 100% LED module verification.',
        checkDate: '2026-11-20T10:00:00.000Z',
        inspectorName: 'Kamal Silva',
      },
      {
        qualityCheckId: 202,
        projectId: 104,
        projectCode: 'PRJ-2026-104',
        projectName: 'Cinnamon Life Wayfinding Signs',
        result: 'FAIL',
        remarks: 'Minor paint defect on corner framing. Touch-up requested.',
        checkDate: '2026-11-21T11:30:00.000Z',
        inspectorName: 'Nimal Jayawardena',
      },
    ],
  };
}

describe('PM Dashboard EJS View Data Binding Tests', () => {
  it('1. should render fully populated PM dashboard data correctly', async () => {
    const data = createFullPmData();
    const html = await renderView(data);

    assert.ok(html.includes('Sunil Perera'), 'Authenticated PM name must be rendered in header/welcome');
    assert.ok(html.includes('ROLE: PROJECT_MANAGER'), 'Role badge must be rendered');
    assert.ok(html.includes('PRJ-2026-101'), 'Project code must be rendered');
    assert.ok(html.includes('PRJ-2026-102'), 'Second project code must be rendered');
    assert.ok(html.includes('Seylan Bank PLC'), 'Customer name must be rendered');
    assert.ok(html.includes('Dialog Axiata PLC'), 'Customer name must be rendered');
  });

  it('2. should bind all six KPI values accurately without demo text', async () => {
    const data = createFullPmData();
    data.kpis = {
      myActiveProjectsCount: 15,
      requiresAttentionCount: 7,
      pendingSiteVisitsCount: 3,
      pendingDesignWorkCount: 4,
      pendingQualityChecksCount: 2,
      upcomingInstallationsCount: 1,
    };

    const html = await renderView(data);

    assert.ok(html.includes('15'), 'myActiveProjectsCount must be bound');
    assert.ok(html.includes('7'), 'requiresAttentionCount must be bound');
    assert.ok(html.includes('3'), 'pendingSiteVisitsCount must be bound');
    assert.ok(html.includes('4'), 'pendingDesignWorkCount must be bound');
    assert.ok(html.includes('2'), 'pendingQualityChecksCount must be bound');
    assert.ok(html.includes('1'), 'upcomingInstallationsCount must be bound');
  });

  it('3. should render all eight stages in canonical order with order, name, and count', async () => {
    const data = createFullPmData();
    const html = await renderView(data);

    for (let i = 1; i <= 8; i++) {
      assert.ok(html.includes(`STG 0${i}`), `Stage order STG 0${i} must be displayed`);
    }

    assert.ok(html.includes('Project Registration'), 'Stage 1 name must be rendered');
    assert.ok(html.includes('Requirements Gathering'), 'Stage 2 name must be rendered');
    assert.ok(html.includes('Design'), 'Stage 3 name must be rendered');
    assert.ok(html.includes('Budget &amp; Quotation') || html.includes('Budget & Quotation'), 'Stage 4 name must be rendered');
    assert.ok(html.includes('Advance Payment'), 'Stage 5 name must be rendered');
    assert.ok(html.includes('Quality Check'), 'Stage 6 name must be rendered');
    assert.ok(html.includes('Installation'), 'Stage 7 name must be rendered');
    assert.ok(html.includes('Final Payment &amp; Completion') || html.includes('Final Payment & Completion'), 'Stage 8 name must be rendered');
  });

  it('4. should calculate stage percentage correctly against myActiveProjectsCount', async () => {
    const data = createFullPmData();
    data.kpis.myActiveProjectsCount = 10;
    data.stageDistribution = [
      { stageId: 1, stageOrder: 1, stageName: 'Project Registration', projectCount: 5 },
      { stageId: 2, stageOrder: 2, stageName: 'Requirements Gathering', projectCount: 3 },
      { stageId: 3, stageOrder: 3, stageName: 'Design', projectCount: 2 },
      { stageId: 4, stageOrder: 4, stageName: 'Budget & Quotation', projectCount: 0 },
      { stageId: 5, stageOrder: 5, stageName: 'Advance Payment', projectCount: 0 },
      { stageId: 6, stageOrder: 6, stageName: 'Quality Check', projectCount: 0 },
      { stageId: 7, stageOrder: 7, stageName: 'Installation', projectCount: 0 },
      { stageId: 8, stageOrder: 8, stageName: 'Final Payment & Completion', projectCount: 0 },
    ];

    const html = await renderView(data);

    assert.ok(html.includes('50% of portfolio'), '5 out of 10 must be 50%');
    assert.ok(html.includes('30% of portfolio'), '3 out of 10 must be 30%');
    assert.ok(html.includes('20% of portfolio'), '2 out of 10 must be 20%');
    assert.ok(html.includes('0% of portfolio'), '0 out of 10 must be 0%');
  });

  it('5. should handle zero active projects safely without division by zero or NaN%', async () => {
    const data = createFullPmData();
    data.kpis.myActiveProjectsCount = 0;
    data.stageDistribution = [
      { stageId: 1, stageOrder: 1, stageName: 'Project Registration', projectCount: 0 },
    ];

    const html = await renderView(data);

    assert.ok(!html.includes('NaN%'), 'Must not display NaN%');
    assert.ok(html.includes('0% of portfolio'), 'Must display 0% when active projects count is zero');
  });

  it('6. should render each supported action item type correctly', async () => {
    const data = createFullPmData();
    const html = await renderView(data);

    assert.ok(html.includes('Site Visit Required'), 'SITE_VISIT label must be rendered');
    assert.ok(html.includes('Design Review / Approval Pending'), 'DESIGN_WORK label must be rendered');
    assert.ok(html.includes('Quality Inspection Pending'), 'QUALITY_CHECK label must be rendered');
    assert.ok(html.includes('Installation Coordination Required'), 'INSTALLATION label must be rendered');

    assert.ok(html.includes('PRJ-2026-101'), 'PRJ-2026-101 in action item must be rendered');
    assert.ok(html.includes('PRJ-2026-102'), 'PRJ-2026-102 in action item must be rendered');
    assert.ok(html.includes('PRJ-2026-103'), 'PRJ-2026-103 in action item must be rendered');
    assert.ok(html.includes('PRJ-2026-104'), 'PRJ-2026-104 in action item must be rendered');
  });

  it('7. should render empty state when action items array is empty', async () => {
    const data = createFullPmData();
    data.actionItems = [];

    const html = await renderView(data);

    assert.ok(html.includes('No Pending Action Items'), 'Must display empty action items state');
    assert.ok(html.includes('All active assigned projects are progressing smoothly'), 'Must display reassuring empty state text');
  });

  it('8. should render assigned projects with customer name, stage, status, and assignment date', async () => {
    const data = createFullPmData();
    const html = await renderView(data);

    assert.ok(html.includes('Seylan Bank Head Office Fascia'), 'Project name must be rendered');
    assert.ok(html.includes('Seylan Bank PLC'), 'Customer name must be rendered');
    assert.ok(html.includes('Stg 2: Requirements Gathering'), 'Current stage badge must be rendered');
    assert.ok(html.includes('2026-11-10'), 'Assigned date formatted as YYYY-MM-DD must be rendered');
    assert.ok(html.includes('ACTIVE'), 'Project status must be rendered');
  });

  it('9. should render empty state when assigned projects array is empty', async () => {
    const data = createFullPmData();
    data.assignedProjects = [];

    const html = await renderView(data);

    assert.ok(html.includes('No active projects currently assigned to your PM console'), 'Must render assigned projects empty state row');
  });

  it('10. should render recent quality checks with result badges, inspector name, remarks, and check date', async () => {
    const data = createFullPmData();
    const html = await renderView(data);

    assert.ok(html.includes('Recent Quality Checks'), 'Section title must be rendered');
    assert.ok(html.includes('PASS'), 'PASS result badge must be rendered');
    assert.ok(html.includes('FAIL'), 'FAIL result badge must be rendered');
    assert.ok(html.includes('Kamal Silva'), 'Inspector name must be rendered');
    assert.ok(html.includes('Nimal Jayawardena'), 'Inspector name must be rendered');
    assert.ok(html.includes('Illumination test passed with 100% LED module verification'), 'Remarks must be rendered');
    assert.ok(html.includes('2026-11-20'), 'Check date must be rendered');
  });

  it('11. should render empty state when recent quality checks array is empty', async () => {
    const data = createFullPmData();
    data.recentQualityChecks = [];

    const html = await renderView(data);

    assert.ok(html.includes('No Inspections Recorded'), 'Must render empty quality checks state');
    assert.ok(html.includes('No quality check records logged yet'), 'Must display explanation in empty state');
  });

  it('12. should properly HTML-escape dynamic strings to prevent XSS injection', async () => {
    const maliciousPayload = '<script id="xss-probe">alert("pwned")</script>';
    const data = createFullPmData();
    data.assignedProjects = [
      {
        projectId: 999,
        projectCode: maliciousPayload,
        projectName: 'Malicious <img src=x onerror=alert(1)> Sign',
        customerName: 'Evil <b onmouseover=alert(1)>Customer</b>',
        stageOrder: 1,
        stageName: 'Registration <script>evil()</script>',
        projectStatus: 'ACTIVE',
        assignedAt: '2026-11-15T00:00:00Z',
      },
    ];
    data.actionItems = [
      {
        type: 'SITE_VISIT',
        projectId: 999,
        projectCode: maliciousPayload,
        projectName: 'Malicious Project',
        description: 'Test <script>xss()</script> description',
        stageName: 'Stage <svg onload=alert(1)>',
      },
    ];
    data.recentQualityChecks = [
      {
        qualityCheckId: 999,
        projectId: 999,
        projectCode: maliciousPayload,
        projectName: 'Malicious QC',
        result: 'PASS',
        remarks: 'Test <script>xss()</script> remarks',
        checkDate: '2026-11-15T00:00:00Z',
        inspectorName: 'Evil <script>xss()</script> Inspector',
      },
    ];

    const html = await renderView(data);

    assert.ok(!html.includes('<script id="xss-probe">'), 'Raw script tags must not be rendered');
    assert.ok(html.includes('&lt;script id=&#34;xss-probe&#34;&gt;') || html.includes('&lt;script id="xss-probe"&gt;'), 'Script tags must be escaped');
    assert.ok(!html.includes('<img src=x onerror=alert(1)>'), 'Raw img tags must not be rendered');
    assert.ok(!html.includes('<svg onload=alert(1)>'), 'Raw svg tags must not be rendered');
  });

  it('13. should handle undefined or empty data payload gracefully', async () => {
    const emptyPayloads = [undefined, null, {}];

    for (const payload of emptyPayloads) {
      const html = await renderView(payload);
      assert.ok(html.includes('Welcome back, Sunil Perera'), 'Must render with empty/null payload');
      assert.ok(html.includes('0 active signboard projects'), 'Must default active projects to 0');
      assert.ok(html.includes('0 action items'), 'Must default action items to 0');
      assert.ok(html.includes('No Pending Action Items'), 'Must show empty state for action items');
      assert.ok(html.includes('No active projects currently assigned to your PM console'), 'Must show empty state for projects');
      assert.ok(html.includes('No Inspections Recorded'), 'Must show empty state for quality checks');
    }
  });

  it('14. should confirm all old fake demo watermark phrases and fabricated due dates have been removed', async () => {
    const data = createFullPmData();
    const html = await renderView(data);

    assert.ok(!html.includes('[Sample / Demo ERP Dataset - Assigned Projects Only]'), 'Old demo watermark must be removed');
    assert.ok(!html.includes('(Fictional Demo Records)'), 'Fictional demo records phrase must be removed');
    assert.ok(!html.includes('Assigned PM (Demo Operational Dataset)'), 'Demo subtitle must be removed');
    assert.ok(!html.includes('Due Tomorrow'), 'Fabricated deadline "Due Tomorrow" must be removed');
    assert.ok(!html.includes('Crescat &amp; Kandy KCC'), 'Fake card subtitle must be removed');
    assert.ok(!html.includes('Field Operations Summary (Demo)'), 'Fake summary card must be removed');
    assert.ok(!html.includes('GLOMARK &amp; Dialog Signs'), 'Fake QC subtitle must be removed');
    assert.ok(!html.includes('Showing 6 of 12 assigned demo projects'), 'Fake pagination text must be removed');
  });

  describe('Mobile Responsive Navigation Drawer Tests', () => {
    it('15. should render the sidebar drawer with id="sidebarDrawer" and off-canvas responsive classes', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('id="sidebarDrawer"'), 'Sidebar must have id="sidebarDrawer"');
      assert.ok(html.includes('-translate-x-full'), 'Sidebar must include -translate-x-full for off-canvas mobile state');
      assert.ok(html.includes('lg:translate-x-0'), 'Sidebar must include lg:translate-x-0 for desktop visibility');
      assert.ok(html.includes('transition-transform'), 'Sidebar must include transition-transform');
    });

    it('16. should render the mobile backdrop with id="mobileDrawerBackdrop" and click toggle', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('id="mobileDrawerBackdrop"'), 'Backdrop must have id="mobileDrawerBackdrop"');
      assert.ok(html.includes('lg:hidden'), 'Backdrop must have lg:hidden');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Backdrop must trigger toggleMobileMenu() on click');
      assert.ok(html.includes('backdrop-blur-sm'), 'Backdrop must include blur styling');
    });

    it('17. should render mobile hamburger menu button with accessible label and mobile-only visibility', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('aria-label="Open sidebar menu"'), 'Hamburger button must have accessible label');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Hamburger button must trigger toggleMobileMenu()');
      assert.ok(/aria-label="Open sidebar menu"[^>]*class="[^"]*lg:hidden/.test(html) ||
                /class="[^"]*lg:hidden[^"]*"[^>]*aria-label="Open sidebar menu"/.test(html),
                'Hamburger button must have lg:hidden class');
    });

    it('18. should render mobile drawer close button with accessible label and mobile-only visibility', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('aria-label="Close menu"'), 'Close button must have accessible label');
      assert.ok(/aria-label="Close menu"[^>]*class="[^"]*lg:hidden/.test(html) ||
                /class="[^"]*lg:hidden[^"]*"[^>]*aria-label="Close menu"/.test(html),
                'Close button must have lg:hidden class');
    });

    it('19. should use responsive lg:pl-72 on main wrapper without hardcoded pl-72', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('lg:pl-72'), 'Main wrapper must have lg:pl-72');
      assert.ok(!html.includes('class="pl-72"'), 'Must not have static pl-72 without lg: prefix');
    });

    it('20. should position header responsively with left-0 right-0 lg:left-72', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('fixed top-0 left-0 right-0 lg:left-72'), 'Header must span full width on mobile and offset on desktop');
    });

    it('21. should include toggleMobileMenu client function implementation in script', async () => {
      const html = await renderView(createFullPmData());

      assert.ok(html.includes('function toggleMobileMenu()'), 'Script must define toggleMobileMenu()');
      assert.ok(html.includes('sidebar.classList.contains(\'-translate-x-full\')'), 'toggleMobileMenu must toggle -translate-x-full');
      assert.ok(html.includes('backdrop.classList.remove(\'hidden\')'), 'toggleMobileMenu must show backdrop');
      assert.ok(html.includes('backdrop.classList.add(\'hidden\')'), 'toggleMobileMenu must hide backdrop');
    });
  });
});
