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

require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: async (...args) => mockDbQueryHandler(...args),
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
});
