'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const session = require('express-session');

const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
const sessionConfigPath = path.resolve(__dirname, '../../src/config/session.js');
const authServicePath = path.resolve(__dirname, '../../src/services/authService.js');
const appPath = path.resolve(__dirname, '../../src/app.js');

const originalDbCache = require.cache[databaseConfigPath];
const originalSessionCache = require.cache[sessionConfigPath];
const originalAuthServiceCache = require.cache[authServicePath];
const originalAppCache = require.cache[appPath];

let mockDbQueryHandler = async () => ({ rows: [] });
let mockDbConnectHandler = async () => ({
  query: async (...args) => mockDbQueryHandler(...args),
  release: () => {},
});

require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: async (...args) => mockDbQueryHandler(...args),
    connect: async (...args) => mockDbConnectHandler(...args),
  },
};

const memorySessionMiddleware = session({
  secret: 'projects_integration_test_secret_32_bytes_long',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 30 * 60 * 1000,
  },
});

require.cache[sessionConfigPath] = {
  id: sessionConfigPath,
  filename: sessionConfigPath,
  loaded: true,
  exports: memorySessionMiddleware,
};

const mockLoginHandler = async (email, password) => {
  if (email === 'owner@test.local' && password === 'valid_owner_pwd') {
    return { success: true, user: { userId: '1', fullName: 'Owner User', role: 'OWNER' } };
  }
  if (email === 'pm@test.local' && password === 'valid_pm_pwd') {
    return { success: true, user: { userId: '2', fullName: 'PM User', role: 'PROJECT_MANAGER' } };
  }
  if (email === 'accounts@test.local' && password === 'valid_accounts_pwd') {
    return { success: true, user: { userId: '3', fullName: 'Accounts User', role: 'ACCOUNTS' } };
  }
  return { success: false, message: 'Invalid email or password.' };
};

require.cache[authServicePath] = {
  id: authServicePath,
  filename: authServicePath,
  loaded: true,
  exports: {
    login: async (email, password) => mockLoginHandler(email, password),
  },
};

const app = require('../../src/app');

function extractCookie(res) {
  let setCookieHeader;
  if (typeof res.headers.getSetCookie === 'function') {
    const cookies = res.headers.getSetCookie();
    setCookieHeader = cookies.find((c) => c.startsWith('connect.sid='));
  }
  if (!setCookieHeader) {
    setCookieHeader = res.headers.get('set-cookie');
  }
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/connect\.sid=[^;]+/);
  return match ? match[0] : null;
}

function extractCsrfToken(html) {
  if (typeof html !== 'string') return null;
  const inputMatch = html.match(/<input[^>]*name=["']_csrf["'][^>]*>/i);
  if (!inputMatch) return null;
  const valueMatch = inputMatch[0].match(/value=["']([^"']+)["']/i);
  return valueMatch ? valueMatch[1] : null;
}

describe('Step 9.8.6 – Projects Routes Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (originalDbCache !== undefined) require.cache[databaseConfigPath] = originalDbCache;
    else delete require.cache[databaseConfigPath];

    if (originalSessionCache !== undefined) require.cache[sessionConfigPath] = originalSessionCache;
    else delete require.cache[sessionConfigPath];

    if (originalAuthServiceCache !== undefined) require.cache[authServicePath] = originalAuthServiceCache;
    else delete require.cache[authServicePath];

    if (originalAppCache !== undefined) require.cache[appPath] = originalAppCache;
    else delete require.cache[appPath];
  });

  beforeEach(() => {
    mockDbQueryHandler = async () => ({ rows: [] });
  });

  async function performLogin(email, password) {
    const getRes = await fetch(`${baseUrl}/login`);
    const getCookie = extractCookie(getRes);
    const getHtml = await getRes.text();
    const csrfToken = extractCsrfToken(getHtml);

    const postRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: getCookie,
      },
      body: new URLSearchParams({ email, password, _csrf: csrfToken }),
    });

    return {
      status: postRes.status,
      cookie: extractCookie(postRes) || getCookie,
    };
  }

  function setupMockProjectDb({ pmAssignedProjectIds = [1], existingProjectIds = [1] } = {}) {
    const recordedQueries = [];
    mockDbQueryHandler = async (sql, params = []) => {
      recordedQueries.push({ sql, params });

      // requireProjectAccess assignment check
      if (sql.includes('FROM public.project_assignments') && sql.includes('WHERE project_id = $1')) {
        const [projId, userId] = params;
        if (Number(userId) === 2 && pmAssignedProjectIds.includes(Number(projId))) {
          return { rows: [{ '?column?': 1 }] };
        }
        return { rows: [] };
      }

      // listProjects count query
      if (sql.includes('SELECT COUNT(*)::int AS total')) {
        return { rows: [{ total: 1 }] };
      }

      // listProjects stages query
      if (sql.includes('FROM public.project_stages')) {
        return {
          rows: [
            { stage_id: 1, stage_order: 1, stage_name: 'PROJECT_REGISTRATION' },
            { stage_id: 2, stage_order: 2, stage_name: 'REQUIREMENTS_GATHERING' },
          ],
        };
      }

      // listProjects data query
      if (sql.includes('FROM public.projects p') && sql.includes('OFFSET')) {
        return {
          rows: [{
            project_id: 1,
            project_code: 'PRJ-2026-001',
            project_name: 'Colombo City Pylon',
            customer_name: 'Dialog Axiata PLC',
            stage_id: 2,
            stage_order: 2,
            stage_name: 'REQUIREMENTS_GATHERING',
            project_status: 'ACTIVE',
            created_at: new Date('2026-11-01T10:00:00Z'),
            updated_at: new Date('2026-11-10T10:00:00Z'),
            assigned_pm_name: 'PM User',
          }],
        };
      }

      // getProjectDetails project query
      if (sql.includes('WHERE p.project_id = $1') && sql.includes('FROM public.projects p')) {
        const projId = Number(params[0]);
        if (!existingProjectIds.includes(projId)) {
          return { rows: [] };
        }
        return {
          rows: [{
            project_id: projId,
            project_code: `PRJ-2026-00${projId}`,
            project_name: 'Colombo City Pylon',
            description: 'LED pylon sign',
            project_address: '45 Galle Rd',
            project_location: 'Colombo 03',
            project_status: 'ACTIVE',
            created_at: new Date('2026-11-01T10:00:00Z'),
            updated_at: null,
            completed_at: null,
            customer_id: 10,
            customer_name: 'Dialog Axiata PLC',
            customer_email: 'signage@dialog.lk',
            customer_phone: '0112345678',
            customer_address: '475 Union Place',
            stage_id: 2,
            stage_order: 2,
            stage_name: 'REQUIREMENTS_GATHERING',
            created_by_name: 'Owner User',
            assigned_pm_name: 'PM User',
          }],
        };
      }

      // getProjectDetails history query
      if (sql.includes('FROM public.project_status_history h')) {
        return {
          rows: [{
            history_id: 10,
            change_type: 'STAGE_CHANGE',
            old_project_status: 'ACTIVE',
            new_project_status: 'ACTIVE',
            is_manual_change: false,
            change_reason: null,
            changed_at: new Date('2026-11-02T09:00:00Z'),
            old_stage_name: 'PROJECT_REGISTRATION',
            old_stage_order: 1,
            new_stage_name: 'REQUIREMENTS_GATHERING',
            new_stage_order: 2,
            changed_by_name: 'Owner User',
          }],
        };
      }

      return { rows: [] };
    };
    return recordedQueries;
  }

  it('1. Unauthenticated GET /projects redirects to /login', async () => {
    const res = await fetch(`${baseUrl}/projects`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/login');
  });

  it('2. Unauthenticated GET /projects/1 redirects to /login', async () => {
    const res = await fetch(`${baseUrl}/projects/1`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/login');
  });

  it('3. ACCOUNTS user gets 403 on GET /projects', async () => {
    const login = await performLogin('accounts@test.local', 'valid_accounts_pwd');
    const res = await fetch(`${baseUrl}/projects`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 403);
  });

  it('4. ACCOUNTS user gets 403 on GET /projects/1', async () => {
    const login = await performLogin('accounts@test.local', 'valid_accounts_pwd');
    const res = await fetch(`${baseUrl}/projects/1`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 403);
  });

  it('5. OWNER gets 200 on GET /projects with all-projects scope', async () => {
    const recorded = setupMockProjectDb();
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const res = await fetch(`${baseUrl}/projects`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('All Projects'));
    assert.ok(html.includes('PRJ-2026-001'));
    assert.ok(html.includes('Colombo City Pylon'));
    const countQuery = recorded.find((q) => q.sql.includes('SELECT COUNT(*)::int AS total'));
    assert.ok(countQuery && !countQuery.sql.includes('pa.user_id'));
  });

  it('6. PROJECT_MANAGER gets 200 on GET /projects with active-assignment SQL scope', async () => {
    const recorded = setupMockProjectDb();
    const login = await performLogin('pm@test.local', 'valid_pm_pwd');
    const res = await fetch(`${baseUrl}/projects`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('My Projects'));
    assert.ok(html.includes('PRJ-2026-001'));
    const countQuery = recorded.find((q) => q.sql.includes('SELECT COUNT(*)::int AS total'));
    assert.ok(countQuery && countQuery.sql.includes('pa.user_id') && countQuery.sql.includes('ended_at IS NULL'));
    assert.strictEqual(countQuery.params[0], 2);
  });

  it('7. OWNER gets 200 on GET /projects/1 with details and history', async () => {
    setupMockProjectDb({ existingProjectIds: [1] });
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const res = await fetch(`${baseUrl}/projects/1`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('PRJ-2026-001'));
    assert.ok(html.includes('Colombo City Pylon'));
    assert.ok(html.includes('Dialog Axiata PLC'));
    assert.ok(html.includes('Stage Transition'));
  });

  it('8. OWNER gets 404 on GET /projects/999 for non-existent project', async () => {
    setupMockProjectDb({ existingProjectIds: [1] });
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const res = await fetch(`${baseUrl}/projects/999`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 404);
  });

  it('9. PROJECT_MANAGER gets 200 on GET /projects/1 when actively assigned', async () => {
    setupMockProjectDb({ pmAssignedProjectIds: [1], existingProjectIds: [1] });
    const login = await performLogin('pm@test.local', 'valid_pm_pwd');
    const res = await fetch(`${baseUrl}/projects/1`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('PRJ-2026-001'));
  });

  it('10. PROJECT_MANAGER gets 403 on GET /projects/2 when unassigned or assignment ended', async () => {
    setupMockProjectDb({ pmAssignedProjectIds: [1], existingProjectIds: [1, 2] });
    const login = await performLogin('pm@test.local', 'valid_pm_pwd');
    const res = await fetch(`${baseUrl}/projects/2`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 403);
    const body = await res.text();
    assert.ok(!body.includes('Colombo City Pylon'));
  });

  it('11. Invalid projectId (abc, 0) returns 400 Bad Request', async () => {
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const resAlpha = await fetch(`${baseUrl}/projects/abc`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(resAlpha.status, 400);
    const resZero = await fetch(`${baseUrl}/projects/0`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(resZero.status, 400);
  });

  it('12. Filter query parameters are forwarded and reflected in rendered /projects HTML', async () => {
    const recorded = setupMockProjectDb();
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const res = await fetch(`${baseUrl}/projects?search=Pylon&status=ACTIVE&stage=2&page=1`, {
      headers: { Cookie: login.cookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('value="Pylon"'));
    const countQuery = recorded.find((q) => q.sql.includes('SELECT COUNT(*)::int AS total'));
    assert.ok(countQuery.params.includes('%Pylon%'));
    assert.ok(countQuery.params.includes('ACTIVE'));
    assert.ok(countQuery.params.includes(2));
  });

  it('13. Unauthenticated GET /projects/new redirects to /login', async () => {
    const res = await fetch(`${baseUrl}/projects/new`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/login');
  });

  it('14. OWNER gets 200 on GET /projects/new without hitting /projects/:projectId', async () => {
    mockDbQueryHandler = async (sql) => {
      if (sql.includes("r.role_name = 'PROJECT_MANAGER'")) {
        return { rows: [{ user_id: 2, full_name: 'PM User', email: 'pm@test.local' }] };
      }
      return { rows: [] };
    };
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const res = await fetch(`${baseUrl}/projects/new`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('New Project Registration'));
    assert.ok(html.includes('A. Customer Information'));
    assert.ok(html.includes('B. Project Information'));
    assert.ok(html.includes('C. Project Assignment'));
    assert.ok(html.includes('PM User'));
    assert.ok(!html.includes('UI only – submission not implemented'));
  });

  it('15. PROJECT_MANAGER gets 403 on GET /projects/new', async () => {
    const login = await performLogin('pm@test.local', 'valid_pm_pwd');
    const res = await fetch(`${baseUrl}/projects/new`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 403);
  });

  it('16. ACCOUNTS gets 403 on GET /projects/new', async () => {
    const login = await performLogin('accounts@test.local', 'valid_accounts_pwd');
    const res = await fetch(`${baseUrl}/projects/new`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 403);
  });

  it('17. Customer search & PM list endpoints enforce OWNER-only access', async () => {
    const pmLogin = await performLogin('pm@test.local', 'valid_pm_pwd');
    const accLogin = await performLogin('accounts@test.local', 'valid_accounts_pwd');

    const pmCust = await fetch(`${baseUrl}/projects/customers/search?q=colombo`, { headers: { Cookie: pmLogin.cookie } });
    assert.strictEqual(pmCust.status, 403);

    const accCust = await fetch(`${baseUrl}/projects/customers/search?q=colombo`, { headers: { Cookie: accLogin.cookie } });
    assert.strictEqual(accCust.status, 403);

    const pmMgrs = await fetch(`${baseUrl}/projects/managers`, { headers: { Cookie: pmLogin.cookie } });
    assert.strictEqual(pmMgrs.status, 403);
  });

  it('18. OWNER can search active customers via GET /projects/customers/search', async () => {
    mockDbQueryHandler = async (sql) => {
      if (sql.includes('FROM public.customers')) {
        return {
          rows: [{
            customer_id: 7,
            full_name: 'Dialog Axiata PLC',
            email: 'signage@dialog.lk',
            phone: '+94112345678',
            address: '475 Union Place, Colombo 02',
          }],
        };
      }
      return { rows: [] };
    };
    const login = await performLogin('owner@test.local', 'valid_owner_pwd');
    const res = await fetch(`${baseUrl}/projects/customers/search?q=dialog`, { headers: { Cookie: login.cookie } });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.customers.length, 1);
    assert.strictEqual(data.customers[0].customerId, 7);
  });

  it('19. POST /projects enforces CSRF and OWNER role', async () => {
    const pmLogin = await performLogin('pm@test.local', 'valid_pm_pwd');
    const pmRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        Cookie: pmLogin.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ _csrf: pmLogin.csrfToken, customerMode: 'existing', customerId: '1' }).toString(),
    });
    assert.strictEqual(pmRes.status, 403);

    const ownerLogin = await performLogin('owner@test.local', 'valid_owner_pwd');
    const noCsrfRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        Cookie: ownerLogin.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ customerMode: 'existing', customerId: '1' }).toString(),
    });
    assert.strictEqual(noCsrfRes.status, 403);
  });

  it('20. OWNER POST /projects creates project in transaction and redirects to /projects/:projectId', async () => {
    const recordedInserts = [];
    mockDbConnectHandler = async () => ({
      query: async (sql, params) => {
        if (sql.includes('FROM public.customers')) return { rows: [{ customer_id: 7, is_active: true }] };
        if (sql.includes('MAX(')) return { rows: [{ max_seq: 1 }] };
        if (sql.includes('INSERT INTO public.projects')) {
          recordedInserts.push({ sql, params });
          return { rows: [{ project_id: 88 }] };
        }
        return { rows: [] };
      },
      release: () => {},
    });

    mockDbQueryHandler = async (sql) => {
      if (sql.includes('FROM public.projects p') && sql.includes('WHERE p.project_id = $1')) {
        return {
          rows: [{
            project_id: 88,
            project_code: 'SBL-2026-0002',
            project_name: 'Created Pylon Sign',
            description: 'Test Desc',
            project_address: '475 Union Place',
            project_location: 'Colombo 02',
            project_status: 'ACTIVE',
            created_at: new Date('2026-11-28T06:00:00Z'),
            updated_at: null,
            completed_at: null,
            customer_id: 7,
            customer_name: 'Dialog Axiata PLC',
            customer_email: 'signage@dialog.lk',
            customer_phone: '+94112345678',
            customer_address: '475 Union Place, Colombo 02',
            stage_id: 1,
            stage_order: 1,
            stage_name: 'PROJECT_REGISTRATION',
            created_by_name: 'Owner User',
            assigned_pm_name: null,
          }],
        };
      }
      return { rows: [] };
    };

    const ownerLogin = await performLogin('owner@test.local', 'valid_owner_pwd');
    const newPageRes = await fetch(`${baseUrl}/projects/new`, { headers: { Cookie: ownerLogin.cookie } });
    const postLoginCsrf = extractCsrfToken(await newPageRes.text());

    const postRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Cookie: ownerLogin.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        _csrf: postLoginCsrf,
        customerMode: 'existing',
        customerId: '7',
        projectName: 'Created Pylon Sign',
        projectAddress: '475 Union Place',
        projectLocation: 'Colombo 02',
        description: 'Test Desc',
        projectManagerId: '',
        createdBy: '999',
        projectCode: 'FAKE-001',
      }).toString(),
    });

    assert.strictEqual(postRes.status, 302);
    assert.strictEqual(postRes.headers.get('location'), '/projects/88');
    assert.strictEqual(recordedInserts[0].params[6], 1, 'created_by must come from session userId (1)');

    const detailRes = await fetch(`${baseUrl}/projects/88`, { headers: { Cookie: ownerLogin.cookie } });
    assert.strictEqual(detailRes.status, 200);
    const detailHtml = await detailRes.text();
    assert.ok(detailHtml.includes('SBL-2026-0002'));
    assert.ok(detailHtml.includes('Created Pylon Sign'));
    assert.ok(detailHtml.includes('Dialog Axiata PLC'));
    assert.ok(detailHtml.includes('Not Assigned'));
  });

  it('21. POST /projects/:projectId/cancel enforces auth, OWNER role, CSRF, and valid projectId', async () => {
    // Unauthenticated without CSRF -> 403
    const unauthNoCsrf = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'Test' }).toString(),
    });
    assert.strictEqual(unauthNoCsrf.status, 403);

    // Unauthenticated with login page CSRF -> 302 redirect to /login
    const loginPage = await fetch(`${baseUrl}/login`);
    const loginCookie = loginPage.headers.get('set-cookie').split(';')[0];
    const loginCsrf = extractCsrfToken(await loginPage.text());
    const unauthWithCsrf = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      redirect: 'manual',
      headers: { Cookie: loginCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: loginCsrf, reason: 'Test' }).toString(),
    });
    assert.strictEqual(unauthWithCsrf.status, 302);
    assert.strictEqual(unauthWithCsrf.headers.get('location'), '/login');

    // PM gets 403 even with valid CSRF
    const pmLogin = await performLogin('pm@test.local', 'valid_pm_pwd');
    const pmRes = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      headers: { Cookie: pmLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: pmLogin.csrfToken, reason: 'PM attempt' }).toString(),
    });
    assert.strictEqual(pmRes.status, 403);

    // ACCOUNTS gets 403 even with valid CSRF
    const accLogin = await performLogin('accounts@test.local', 'valid_accounts_pwd');
    const accRes = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      headers: { Cookie: accLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: accLogin.csrfToken, reason: 'Accounts attempt' }).toString(),
    });
    assert.strictEqual(accRes.status, 403);

    // OWNER without CSRF gets 403
    const ownerLogin = await performLogin('owner@test.local', 'valid_owner_pwd');
    const ownerPage = await fetch(`${baseUrl}/projects`, { headers: { Cookie: ownerLogin.cookie } });
    const ownerCsrf = extractCsrfToken(await ownerPage.text());

    const noCsrfRes = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      headers: { Cookie: ownerLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'Missing CSRF' }).toString(),
    });
    assert.strictEqual(noCsrfRes.status, 403);

    // OWNER with invalid projectId gets 400
    const badAlpha = await fetch(`${baseUrl}/projects/abc/cancel`, {
      method: 'POST',
      headers: { Cookie: ownerLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: ownerCsrf, reason: 'Bad ID' }).toString(),
    });
    assert.strictEqual(badAlpha.status, 400);

    const badZero = await fetch(`${baseUrl}/projects/0/cancel`, {
      method: 'POST',
      headers: { Cookie: ownerLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: ownerCsrf, reason: 'Zero ID' }).toString(),
    });
    assert.strictEqual(badZero.status, 400);
  });

  it('22. OWNER POST /projects/:projectId/cancel succeeds in transaction and redirects to /projects/:projectId', async () => {
    const txCalls = [];
    mockDbConnectHandler = async () => ({
      query: async (sql, params) => {
        txCalls.push({ sql: sql.trim(), params });
        return { rows: [], rowCount: 1 };
      },
      release: () => {},
    });

    const ownerLogin = await performLogin('owner@test.local', 'valid_owner_pwd');
    const ownerPage = await fetch(`${baseUrl}/projects`, { headers: { Cookie: ownerLogin.cookie } });
    const ownerCsrf = extractCsrfToken(await ownerPage.text());

    const res = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      redirect: 'manual',
      headers: { Cookie: ownerLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: ownerCsrf, reason: 'Client withdrew order' }).toString(),
    });

    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/projects/1');
    assert.ok(txCalls.some((c) => c.sql.includes('SELECT change_project_status($1, $2, \'CANCELLED\', $3)')));
    assert.ok(txCalls.some((c) => c.sql.includes('UPDATE public.project_assignments')));
    assert.ok(txCalls.some((c) => c.sql === 'COMMIT'));
  });

  it('23. OWNER POST /projects/:projectId/cancel returns 400 on empty reason and 409 on non-ACTIVE project', async () => {
    setupMockProjectDb({ existingProjectIds: [1] });
    const ownerLogin = await performLogin('owner@test.local', 'valid_owner_pwd');
    const ownerPage = await fetch(`${baseUrl}/projects/1`, { headers: { Cookie: ownerLogin.cookie } });
    const ownerCsrf = extractCsrfToken(await ownerPage.text());

    // Empty reason -> 400 with rendered error banner
    const emptyRes = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      headers: { Cookie: ownerLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: ownerCsrf, reason: '   ' }).toString(),
    });
    assert.strictEqual(emptyRes.status, 400);
    const emptyHtml = await emptyRes.text();
    assert.ok(emptyHtml.includes('A cancellation reason is required.'));

    // Non-ACTIVE project -> 409
    mockDbConnectHandler = async () => ({
      query: async (sql) => {
        if (sql.includes('SELECT change_project_status')) {
          throw new Error('This project status transition is not allowed');
        }
        return { rows: [] };
      },
      release: () => {},
    });

    const conflictRes = await fetch(`${baseUrl}/projects/1/cancel`, {
      method: 'POST',
      headers: { Cookie: ownerLogin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: ownerCsrf, reason: 'Valid reason' }).toString(),
    });
    assert.strictEqual(conflictRes.status, 409);
    const conflictHtml = await conflictRes.text();
    assert.ok(conflictHtml.includes('Only active projects can be cancelled.'));
  });
});
