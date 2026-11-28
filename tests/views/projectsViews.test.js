'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ejs = require('ejs');

const indexTemplatePath = path.resolve(__dirname, '../../views/projects/index.ejs');
const detailTemplatePath = path.resolve(__dirname, '../../views/projects/detail.ejs');
const newTemplatePath = path.resolve(__dirname, '../../views/projects/new.ejs');
const ownerDashboardPath = path.resolve(__dirname, '../../views/dashboards/owner.ejs');
const pmDashboardPath = path.resolve(__dirname, '../../views/dashboards/pm.ejs');

const DEFAULT_STAGES = [
  { stageId: 1, stageOrder: 1, stageName: 'PROJECT_REGISTRATION' },
  { stageId: 2, stageOrder: 2, stageName: 'REQUIREMENTS_GATHERING' },
  { stageId: 3, stageOrder: 3, stageName: 'DESIGN' },
];

function createSampleListData(overrides = {}) {
  return {
    projects: [
      {
        projectId: 1,
        projectCode: 'PRJ-2026-001',
        projectName: 'Dialog 3D Pylon Sign',
        customerName: 'Dialog Axiata PLC',
        stageId: 2,
        stageOrder: 2,
        stageName: 'REQUIREMENTS_GATHERING',
        projectStatus: 'ACTIVE',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-05T12:00:00Z',
        assignedPmName: 'Kasun Perera',
      },
      {
        projectId: 2,
        projectCode: 'PRJ-2026-002',
        projectName: 'Keells Fascia Board',
        customerName: 'JayKay Marketing',
        stageId: 8,
        stageOrder: 8,
        stageName: 'FINAL_PAYMENT_AND_COMPLETION',
        projectStatus: 'COMPLETED',
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: null,
        assignedPmName: null,
      },
    ],
    stages: DEFAULT_STAGES,
    pagination: { page: 2, pageSize: 10, totalCount: 25, totalPages: 3 },
    filters: { search: '', status: '', stageId: '' },
    ...overrides,
  };
}

function createSampleProjectDetail(overrides = {}) {
  return {
    projectId: 1,
    projectCode: 'PRJ-2026-001',
    projectName: 'Dialog 3D Pylon Sign',
    description: 'Outdoor illuminated pylon sign',
    projectAddress: '45 Galle Road',
    projectLocation: 'Colombo 03',
    projectStatus: 'ACTIVE',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-05T12:00:00Z',
    completedAt: null,
    createdByName: 'System Owner',
    assignedPmName: 'Kasun Perera',
    customer: {
      customerId: 10,
      fullName: 'Dialog Axiata PLC',
      email: 'signage@dialog.lk',
      phone: '0112345678',
      address: '475 Union Place',
    },
    stage: {
      stageId: 2,
      stageOrder: 2,
      stageName: 'REQUIREMENTS_GATHERING',
    },
    history: [
      {
        historyId: 101,
        changeType: 'MANUAL_STAGE_CHANGE',
        oldProjectStatus: 'ACTIVE',
        newProjectStatus: 'ACTIVE',
        oldStageName: 'PROJECT_REGISTRATION',
        oldStageOrder: 1,
        newStageName: 'REQUIREMENTS_GATHERING',
        newStageOrder: 2,
        isManualChange: true,
        changeReason: 'Priority client schedule',
        changedByName: 'System Owner',
        changedAt: '2026-11-02T09:30:00Z',
      },
    ],
    ...overrides,
  };
}

describe('Step 9.8.6 – Projects EJS Views Tests', () => {
  describe('views/projects/index.ejs', () => {
    it('1. Renders project listing for OWNER and PROJECT_MANAGER', async () => {
      const ownerHtml = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_123',
        data: createSampleListData(),
      });
      assert.ok(ownerHtml.includes('All Projects'));
      assert.ok(ownerHtml.includes('PRJ-2026-001'));
      assert.ok(ownerHtml.includes('Dialog 3D Pylon Sign'));
      assert.ok(ownerHtml.includes('href="/projects/1"'));
      assert.ok(ownerHtml.includes('ACTIVE'));
      assert.ok(ownerHtml.includes('COMPLETED'));

      const pmHtml = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '2', fullName: 'PM User', role: 'PROJECT_MANAGER' },
        csrfToken: 'csrf_123',
        data: createSampleListData(),
      });
      assert.ok(pmHtml.includes('My Projects'));
      assert.ok(pmHtml.includes('Showing projects actively assigned to you.'));
    });

    it('2. HTML-escapes XSS payloads in project rows and search input', async () => {
      const xss = '<script>alert("xss")</script>';
      const html = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '1', fullName: xss, role: 'OWNER' },
        csrfToken: 'csrf_123',
        data: createSampleListData({
          filters: { search: xss, status: '', stageId: '' },
          projects: [{
            projectId: 1,
            projectCode: xss,
            projectName: xss,
            customerName: xss,
            stageId: 1,
            stageOrder: 1,
            stageName: 'PROJECT_REGISTRATION',
            projectStatus: 'ACTIVE',
            createdAt: '2026-11-01T10:00:00Z',
            updatedAt: null,
          }],
        }),
      });
      assert.ok(!html.includes('<script>alert("xss")</script>'), 'Raw script tag must not be rendered');
      assert.ok(html.includes('&lt;script&gt;alert(&#34;xss&#34;)&lt;/script&gt;'));
    });

    it('3. Renders empty state for no projects and for filtered no-match', async () => {
      const emptyPmHtml = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '2', fullName: 'PM User', role: 'PROJECT_MANAGER' },
        csrfToken: 'csrf_123',
        data: createSampleListData({
          projects: [],
          pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
        }),
      });
      assert.ok(emptyPmHtml.includes('No projects found'));
      assert.ok(emptyPmHtml.includes('You have no actively assigned projects at this time.'));

      const filteredEmptyHtml = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '1', fullName: 'Owner', role: 'OWNER' },
        csrfToken: 'csrf_123',
        data: createSampleListData({
          projects: [],
          pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
          filters: { search: 'nonexistent', status: 'CANCELLED', stageId: 1 },
        }),
      });
      assert.ok(filteredEmptyHtml.includes('Clear all filters'));
    });

    it('4. Pagination links preserve active filter query parameters', async () => {
      const html = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '1', fullName: 'Owner', role: 'OWNER' },
        csrfToken: 'csrf_123',
        data: createSampleListData({
          filters: { search: 'Sign', status: 'ACTIVE', stageId: 2 },
          pagination: { page: 2, pageSize: 10, totalCount: 25, totalPages: 3 },
        }),
      });
      assert.ok(html.includes('Showing <span class="text-on-surface font-semibold">11–20</span> of <span class="text-on-surface font-semibold">25</span> projects'));
      assert.ok(html.includes('href="/projects?search=Sign&amp;status=ACTIVE&amp;stage=2&amp;page=1"') || html.includes('href="/projects?search=Sign&status=ACTIVE&stage=2&page=1"'));
      assert.ok(html.includes('href="/projects?search=Sign&amp;status=ACTIVE&amp;stage=2&amp;page=3"') || html.includes('href="/projects?search=Sign&status=ACTIVE&stage=2&page=3"'));
    });

    it('5. Includes theme assets, theme toggle, mobile drawer markup, and zero hardcoded emerald classes', async () => {
      const html = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '1', fullName: 'Owner', role: 'OWNER' },
        csrfToken: 'csrf_123',
        data: createSampleListData(),
      });
      assert.ok(html.includes('/css/theme.css'));
      assert.ok(html.includes('/js/theme.js'));
      assert.ok(html.includes('id="theme-toggle"'));
      assert.ok(html.includes('id="sidebarDrawer"'));
      assert.ok(html.includes('-translate-x-full lg:translate-x-0'));
      assert.ok(html.includes('id="mobileDrawerBackdrop"'));
      assert.ok(html.includes('toggleMobileMenu()'));
      assert.ok(!html.includes('emerald-'), 'New project views must use theme tokens instead of hardcoded emerald-*');
    });
  });

  describe('views/projects/detail.ejs', () => {
    it('6. Renders project details, customer card, and history timeline', async () => {
      const html = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_123',
        p: createSampleProjectDetail(),
      });
      assert.ok(html.includes('href="/projects"'));
      assert.ok(html.includes('PRJ-2026-001'));
      assert.ok(html.includes('Dialog 3D Pylon Sign'));
      assert.ok(html.includes('Outdoor illuminated pylon sign'));
      assert.ok(html.includes('Kasun Perera'));
      assert.ok(html.includes('Dialog Axiata PLC'));
      assert.ok(html.includes('signage@dialog.lk'));
      assert.ok(html.includes('Manual Stage Override'));
      assert.ok(html.includes('Priority client schedule'));
      assert.ok(html.includes('/css/theme.css'));
      assert.ok(html.includes('id="sidebarDrawer"'));
    });

    it('7. Renders empty history state and Not Assigned PM fallback', async () => {
      const html = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_123',
        p: createSampleProjectDetail({ assignedPmName: null, history: [] }),
      });
      assert.ok(html.includes('Not Assigned'));
      assert.ok(html.includes('No history events recorded for this project yet.'));
    });

    it('8. HTML-escapes XSS payloads in detail fields and history', async () => {
      const xss = '<img src=x onerror=alert(1)>';
      const html = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_123',
        p: createSampleProjectDetail({
          projectName: xss,
          description: xss,
          customer: { customerId: 1, fullName: xss, email: null, phone: null, address: null },
          history: [{
            historyId: 1,
            changeType: 'MANUAL_STAGE_CHANGE',
            oldProjectStatus: null,
            newProjectStatus: null,
            oldStageName: null,
            newStageName: null,
            isManualChange: true,
            changeReason: xss,
            changedByName: xss,
            changedAt: '2026-11-02T09:30:00Z',
          }],
        }),
      });
      assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
      assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    });
  });

  describe('Dashboard navigation wiring', () => {
    it('9. Owner and PM dashboards wire /projects sidebar and View Details links', () => {
      const ownerRaw = fs.readFileSync(ownerDashboardPath, 'utf8');
      assert.ok(ownerRaw.includes('data-path="projects" href="/projects"'));
      assert.ok(ownerRaw.includes("'projects': '/projects'"), 'Owner IMPLEMENTED_PATHS must include projects');
      assert.ok(ownerRaw.includes('href="/projects/<%= p.projectId %>"'));
      assert.ok(ownerRaw.includes('href="/projects/new" id="btn-new-project"'));
      assert.ok(!ownerRaw.includes('Opening New Project Intake Specification Form'));

      const pmRaw = fs.readFileSync(pmDashboardPath, 'utf8');
      assert.ok(pmRaw.includes('data-path="dashboard" href="/dashboard"'));
      assert.ok(pmRaw.includes('data-path="my-projects" href="/projects"'));
      assert.ok(pmRaw.includes('href="/projects/<%= p.projectId %>"'));
    });
  });

  describe('views/projects/new.ejs', () => {
    it('10. Renders all three registration sections, form POST/CSRF, PM options, and theme/mobile shell', async () => {
      const html = await ejs.renderFile(newTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_123',
        projectManagers: [{ userId: 7, fullName: 'Kasun Perera', email: 'kasun@test.local' }],
        formValues: { customerMode: 'existing' },
        errors: {},
        formError: null,
        duplicateCustomer: null,
      });
      assert.ok(html.includes('New Project Registration'));
      assert.ok(html.includes('method="POST" action="/projects"'));
      assert.ok(html.includes('name="_csrf" value="csrf_123"'));
      assert.ok(html.includes('A. Customer Information'));
      assert.ok(html.includes('Register New Customer'));
      assert.ok(html.includes('Full Name'));
      assert.ok(html.includes('Email'));
      assert.ok(html.includes('Phone'));
      assert.ok(html.includes('Address'));
      assert.ok(html.includes('B. Project Information'));
      assert.ok(html.includes('Automatically generated'));
      assert.ok(html.includes('Project Name'));
      assert.ok(html.includes('Description'));
      assert.ok(html.includes('Project Address'));
      assert.ok(html.includes('Project Location'));
      assert.ok(html.includes('C. Project Assignment'));
      assert.ok(html.includes('Kasun Perera'));
      assert.ok(html.includes('href="/projects"'));
      assert.ok(html.includes('Cancel'));
      assert.ok(html.includes('id="btn-save-project"'));
      assert.ok(!html.includes('UI only – submission not implemented'));
      assert.ok(html.includes('/css/theme.css'));
      assert.ok(html.includes('/js/theme.js'));
      assert.ok(html.includes('id="theme-toggle"'));
      assert.ok(html.includes('id="sidebarDrawer"'));
      assert.ok(!html.includes('emerald-'));
    });
  });

  describe('Project Cancellation UI visibility & dialog', () => {
    it('11. detail.ejs shows Cancel button and dialog only for OWNER + ACTIVE project, and escapes cancelError', async () => {
      const ownerActiveHtml = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_cancel_1',
        p: createSampleProjectDetail({ projectStatus: 'ACTIVE' }),
        cancelError: '<script>alert(1)</script>',
      });
      assert.ok(ownerActiveHtml.includes('id="btn-cancel-project"'));
      assert.ok(ownerActiveHtml.includes('id="cancelProjectDialog"'));
      assert.ok(ownerActiveHtml.includes('action="/projects/1/cancel"'));
      assert.ok(ownerActiveHtml.includes('name="_csrf" value="csrf_cancel_1"'));
      assert.ok(ownerActiveHtml.includes('id="cancelReason"'));
      assert.ok(ownerActiveHtml.includes('maxlength="500"'));
      assert.ok(ownerActiveHtml.includes('id="cancelReasonCount"'));
      assert.ok(ownerActiveHtml.includes('id="cancelDialogAbort"'));
      assert.ok(ownerActiveHtml.includes('id="cancelDialogSubmit"'));
      assert.ok(!ownerActiveHtml.includes('<script>alert(1)</script>'));
      assert.ok(ownerActiveHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

      const ownerCompletedHtml = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_cancel_2',
        p: createSampleProjectDetail({ projectStatus: 'COMPLETED' }),
      });
      assert.ok(!ownerCompletedHtml.includes('id="btn-cancel-project"'));
      assert.ok(!ownerCompletedHtml.includes('id="cancelProjectDialog"'));

      const ownerCancelledHtml = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_cancel_3',
        p: createSampleProjectDetail({ projectStatus: 'CANCELLED' }),
      });
      assert.ok(!ownerCancelledHtml.includes('id="btn-cancel-project"'));
      assert.ok(!ownerCancelledHtml.includes('id="cancelProjectDialog"'));

      const pmActiveHtml = await ejs.renderFile(detailTemplatePath, {
        user: { userId: '2', fullName: 'PM User', role: 'PROJECT_MANAGER' },
        csrfToken: 'csrf_cancel_4',
        p: createSampleProjectDetail({ projectStatus: 'ACTIVE' }),
      });
      assert.ok(!pmActiveHtml.includes('id="btn-cancel-project"'));
      assert.ok(!pmActiveHtml.includes('id="cancelProjectDialog"'));
    });

    it('12. index.ejs shows Cancel button only on ACTIVE rows for OWNER and hides for PM', async () => {
      const ownerHtml = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_idx_1',
        data: createSampleListData(),
      });
      assert.ok(ownerHtml.includes('data-cancel-project-id="1"'));
      assert.ok(!ownerHtml.includes('data-cancel-project-id="2"'));
      assert.ok(ownerHtml.includes('id="cancelProjectDialog"'));
      assert.ok(ownerHtml.includes('name="_csrf" value="csrf_idx_1"'));

      const pmHtml = await ejs.renderFile(indexTemplatePath, {
        user: { userId: '2', fullName: 'PM User', role: 'PROJECT_MANAGER' },
        csrfToken: 'csrf_idx_2',
        data: createSampleListData(),
      });
      assert.ok(!pmHtml.includes('data-cancel-project-id='));
      assert.ok(!pmHtml.includes('id="cancelProjectDialog"'));
    });

    it('13. owner.ejs renders Cancel button only for ACTIVE projects and includes cancel dialog', async () => {
      const ownerDashHtml = await ejs.renderFile(ownerDashboardPath, {
        user: { userId: '1', fullName: 'Owner User', role: 'OWNER' },
        csrfToken: 'csrf_dash_1',
        data: {
          kpis: { activeProjects: 1, completedProjects: 1, cancelledProjects: 0, totalProjects: 2 },
          recentProjects: [
            {
              projectId: 10,
              projectCode: 'SBL-2026-0010',
              projectName: 'Active Sign',
              customerName: 'Cust A',
              stageOrder: 1,
              stageName: 'PROJECT_REGISTRATION',
              projectStatus: 'ACTIVE',
              assignedPmName: null,
              updatedAt: '2026-11-28T10:00:00Z',
            },
            {
              projectId: 11,
              projectCode: 'SBL-2026-0011',
              projectName: 'Done Sign',
              customerName: 'Cust B',
              stageOrder: 8,
              stageName: 'FINAL_PAYMENT_AND_COMPLETION',
              projectStatus: 'COMPLETED',
              assignedPmName: null,
              updatedAt: '2026-11-28T10:00:00Z',
            },
          ],
          stageDistribution: [],
          pendingActions: { pendingSiteVisits: 0, pendingDesigns: 0, pendingInvoices: 0 },
        },
      });
      assert.ok(ownerDashHtml.includes('data-cancel-project-id="10"'));
      assert.ok(!ownerDashHtml.includes('data-cancel-project-id="11"'));
      assert.ok(ownerDashHtml.includes('id="cancelProjectDialog"'));
      assert.ok(ownerDashHtml.includes('name="_csrf" value="csrf_dash_1"'));
    });
  });
});
