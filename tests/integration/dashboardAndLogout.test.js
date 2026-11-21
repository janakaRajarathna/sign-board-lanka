const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const session = require('express-session');

// Paths for mocked modules
const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
const sessionConfigPath = path.resolve(__dirname, '../../src/config/session.js');
const authServicePath = path.resolve(__dirname, '../../src/services/authService.js');
const appPath = path.resolve(__dirname, '../../src/app.js');

// 1. Safeguard: preserve original require.cache entries for teardown restoration
const originalDbCache = require.cache[databaseConfigPath];
const originalSessionCache = require.cache[sessionConfigPath];
const originalAuthServiceCache = require.cache[authServicePath];
const originalAppCache = require.cache[appPath];

let mockDbQueryHandler = async () => ({ rows: [{ '?column?': 1 }] });

require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: async (...args) => mockDbQueryHandler(...args),
  },
};

// 2. Safeguard: mock session configuration to use in-memory store for integration testing
const sessionSecret = 'integration_test_secret_32_bytes_long_12345';
const memorySessionMiddleware = session({
  secret: sessionSecret,
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

// 3. Mock authService to simulate login logic deterministically in integration tests
let mockLoginHandler = async (email, password) => {
  if (email === 'owner@test.local' && password === 'valid_owner_pwd') {
    return { success: true, user: { userId: '1', fullName: 'Owner User', role: 'OWNER' } };
  }
  if (email === 'pm@test.local' && password === 'valid_pm_pwd') {
    return { success: true, user: { userId: '2', fullName: 'Project Manager User', role: 'PROJECT_MANAGER' } };
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

// 4. Load application with mocked dependencies
const app = require('../../src/app');

// Helper to extract session cookie
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

// Helper to extract CSRF token from HTML
function extractCsrfToken(html) {
  if (typeof html !== 'string') {
    return null;
  }
  // Match the CSRF input tag regardless of attribute ordering or quote style
  const inputMatch = html.match(/<input[^>]*name=["']_csrf["'][^>]*>/i);
  if (!inputMatch) {
    return null;
  }
  const valueMatch = inputMatch[0].match(/value=["']([^"']+)["']/i);
  return valueMatch ? valueMatch[1] : null;
}

describe('Stage 5 – Route Registration & Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    // Restore require.cache entries to ensure zero cross-test interference
    if (originalDbCache !== undefined) {
      require.cache[databaseConfigPath] = originalDbCache;
    } else {
      delete require.cache[databaseConfigPath];
    }

    if (originalSessionCache !== undefined) {
      require.cache[sessionConfigPath] = originalSessionCache;
    } else {
      delete require.cache[sessionConfigPath];
    }

    if (originalAuthServiceCache !== undefined) {
      require.cache[authServicePath] = originalAuthServiceCache;
    } else {
      delete require.cache[authServicePath];
    }

    if (originalAppCache !== undefined) {
      require.cache[appPath] = originalAppCache;
    } else {
      delete require.cache[appPath];
    }
  });

  const defaultLoginHandler = async (email, password) => {
    if (email === 'owner@test.local' && password === 'valid_owner_pwd') {
      return { success: true, user: { userId: '1', fullName: 'Owner User', role: 'OWNER' } };
    }
    if (email === 'pm@test.local' && password === 'valid_pm_pwd') {
      return { success: true, user: { userId: '2', fullName: 'Project Manager User', role: 'PROJECT_MANAGER' } };
    }
    if (email === 'accounts@test.local' && password === 'valid_accounts_pwd') {
      return { success: true, user: { userId: '3', fullName: 'Accounts User', role: 'ACCOUNTS' } };
    }
    return { success: false, message: 'Invalid email or password.' };
  };

  beforeEach(() => {
    mockLoginHandler = defaultLoginHandler;
    mockDbQueryHandler = async () => ({ rows: [{ '?column?': 1 }] });
  });

  // Helper to perform full login and return session cookie and csrfToken
  async function performLogin(email, password) {
    // Step 1: GET /login to get initial session and CSRF token
    const getRes = await fetch(`${baseUrl}/login`);
    const getCookie = extractCookie(getRes);
    const getHtml = await getRes.text();
    const csrfToken = extractCsrfToken(getHtml);

    // Step 2: POST /login with credentials and CSRF token
    const postRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: getCookie,
      },
      body: new URLSearchParams({
        email,
        password,
        _csrf: csrfToken,
      }),
    });

    const sessionCookie = extractCookie(postRes) || getCookie;
    return {
      status: postRes.status,
      location: postRes.headers.get('location'),
      cookie: sessionCookie,
    };
  }

  describe('Existing Routes Verification', () => {
    it('13. /health should return 200 with operational status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.deepStrictEqual(json, {
        status: 'ok',
        message: 'Sign Board Lanka ERP is running',
      });
    });

    it('14. /health/db should return 200 when database is healthy', async () => {
      mockDbQueryHandler = async () => ({ rows: [{ '?column?': 1 }] });
      const res = await fetch(`${baseUrl}/health/db`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.deepStrictEqual(json, {
        status: 'ok',
        database: 'connected',
      });
    });

    it('14b. /health/db should return 503 when database is unavailable', async () => {
      mockDbQueryHandler = async () => {
        throw new Error('Connection refused');
      };
      const res = await fetch(`${baseUrl}/health/db`);
      assert.strictEqual(res.status, 503);
      const json = await res.json();
      assert.strictEqual(json.status, 'error');
    });

    it('15. Login routes remain registered and functional', async () => {
      const getRes = await fetch(`${baseUrl}/login`);
      assert.strictEqual(getRes.status, 200);
      const html = await getRes.text();
      assert.ok(html.includes('Sign Board Lanka'), 'Login page contains branding');
      assert.ok(extractCsrfToken(html), 'Login page contains CSRF token');

      // Failed login attempt
      const cookie = extractCookie(getRes);
      const token = extractCsrfToken(html);
      const postRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookie,
        },
        body: new URLSearchParams({
          email: 'wrong@test.local',
          password: 'wrong',
          _csrf: token,
        }),
      });
      assert.strictEqual(postRes.status, 401);
      const postHtml = await postRes.text();
      assert.ok(postHtml.includes('Invalid email or password'));
    });
  });

  describe('Dashboard Access Control & Role-Based Rendering', () => {
    it('1. Unauthenticated GET /dashboard redirects to /login', async () => {
      const res = await fetch(`${baseUrl}/dashboard`, {
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 302);
      assert.strictEqual(res.headers.get('location'), '/login');
    });

    it('2. Authenticated OWNER can access the OWNER dashboard', async () => {
      const login = await performLogin('owner@test.local', 'valid_owner_pwd');
      assert.strictEqual(login.status, 302);
      assert.strictEqual(login.location, '/dashboard');

      const dashRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { Cookie: login.cookie },
      });
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(
        dashRes.headers.get('cache-control'),
        'no-store, no-cache, must-revalidate, private'
      );
      const html = await dashRes.text();
      assert.ok(html.includes('ROLE: OWNER'), 'Owner dashboard rendered');
      assert.ok(html.includes('Owner User'), 'Owner user name rendered');
      assert.ok(html.includes('action="/logout"'), 'Contains logout form');
    });

    it('3. Authenticated PROJECT_MANAGER can access the PM dashboard', async () => {
      const login = await performLogin('pm@test.local', 'valid_pm_pwd');
      assert.strictEqual(login.status, 302);
      assert.strictEqual(login.location, '/dashboard');

      const dashRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { Cookie: login.cookie },
      });
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(
        dashRes.headers.get('cache-control'),
        'no-store, no-cache, must-revalidate, private'
      );
      const html = await dashRes.text();
      assert.ok(html.includes('ROLE: PROJECT_MANAGER'), 'PM dashboard rendered');
      assert.ok(html.includes('Project Manager User'), 'PM user name rendered');
      assert.ok(html.includes('action="/logout"'), 'Contains logout form');
    });

    it('4. Authenticated ACCOUNTS user can access the Accounts dashboard', async () => {
      const login = await performLogin('accounts@test.local', 'valid_accounts_pwd');
      assert.strictEqual(login.status, 302);
      assert.strictEqual(login.location, '/dashboard');

      const dashRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { Cookie: login.cookie },
      });
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(
        dashRes.headers.get('cache-control'),
        'no-store, no-cache, must-revalidate, private'
      );
      const html = await dashRes.text();
      assert.ok(html.includes('Accounts Console'), 'Accounts dashboard rendered');
      assert.ok(html.includes('Accounts User'), 'Accounts user name rendered');
      assert.ok(html.includes('Role: ACCOUNTS'), 'Accounts role rendered');
      assert.ok(html.includes('action="/logout"'), 'Contains logout form');
    });

    it('5. Unsupported or malformed session roles are rejected', async () => {
      // Mock login to return an unsupported role
      mockLoginHandler = async () => ({
        success: true,
        user: { userId: '99', fullName: 'Hacker User', role: 'SUPERUSER' },
      });

      const login = await performLogin('fake@test.local', 'pwd');
      const dashRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { Cookie: login.cookie },
        redirect: 'manual',
      });

      // requireAuth rejects non-whitelisted roles and redirects to /login
      assert.strictEqual(dashRes.status, 302);
      assert.strictEqual(dashRes.headers.get('location'), '/login');
    });

    it('6. User identity and role come only from the server-side session', async () => {
      // Login as ACCOUNTS
      mockLoginHandler = async (email, password) => {
        if (email === 'accounts@test.local') {
          return { success: true, user: { userId: '3', fullName: 'Accounts User', role: 'ACCOUNTS' } };
        }
        return { success: false };
      };

      const login = await performLogin('accounts@test.local', 'valid_accounts_pwd');

      // Attempt to spoof OWNER role via query parameters, headers, and body
      const spoofedRes = await fetch(`${baseUrl}/dashboard?role=OWNER&userId=1`, {
        headers: {
          Cookie: login.cookie,
          'X-Role': 'OWNER',
          'X-User-Id': '1',
        },
      });

      assert.strictEqual(spoofedRes.status, 200);
      const html = await spoofedRes.text();
      // Must render Accounts Console, NOT Owner console
      assert.ok(html.includes('Accounts Console'));
      assert.ok(!html.includes('ROLE: OWNER'));
      assert.ok(html.includes('Role: ACCOUNTS'));
    });
  });

  describe('Logout & Session Invalidation', () => {
    it('7. POST /logout without a valid CSRF token is rejected with 403', async () => {
      const login = await performLogin('owner@test.local', 'valid_owner_pwd');

      const logoutRes = await fetch(`${baseUrl}/logout`, {
        method: 'POST',
        headers: {
          Cookie: login.cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Omit CSRF token
        body: new URLSearchParams({}),
      });

      assert.strictEqual(logoutRes.status, 403);
    });

    it('8. POST /logout with an invalid CSRF token is rejected with 403', async () => {
      const login = await performLogin('owner@test.local', 'valid_owner_pwd');

      const logoutRes = await fetch(`${baseUrl}/logout`, {
        method: 'POST',
        headers: {
          Cookie: login.cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          _csrf: 'invalid_csrf_token_value_000000000000000000000000000000000000000000000',
        }),
      });

      assert.strictEqual(logoutRes.status, 403);
    });

    it('9, 10, 11, 12. Valid authenticated logout destroys session, clears cookie, redirects to /login, and prevents replay', async () => {
      // Login as OWNER
      const login = await performLogin('owner@test.local', 'valid_owner_pwd');

      // Retrieve valid CSRF token from rendered dashboard
      const dashRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { Cookie: login.cookie },
      });
      assert.strictEqual(dashRes.status, 200);
      const dashHtml = await dashRes.text();
      const csrfToken = extractCsrfToken(dashHtml);
      assert.ok(csrfToken, 'CSRF token extracted from dashboard logout form');

      // 9 & 11: POST /logout with valid session and CSRF token
      const logoutRes = await fetch(`${baseUrl}/logout`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Cookie: login.cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          _csrf: csrfToken,
        }),
      });

      // 11: Redirects to /login
      assert.strictEqual(logoutRes.status, 302);
      assert.strictEqual(logoutRes.headers.get('location'), '/login');

      // 10: Session cookie is cleared
      const rawCookies = typeof logoutRes.headers.getSetCookie === 'function'
        ? logoutRes.headers.getSetCookie()
        : [];
      const setCookie = rawCookies.find((c) => c.startsWith('connect.sid='));
      assert.ok(setCookie, 'Set-Cookie header for connect.sid must be present on logout');

      // Verify empty value and expired timestamp or Max-Age<=0
      const isValueEmpty = /^connect\.sid=(?:;|"";|''|\s*(?:;|$))/.test(setCookie);
      assert.strictEqual(isValueEmpty, true, 'connect.sid value must be empty when cleared');

      const expiresMatch = setCookie.match(/expires=([^;]+)/i);
      const maxAgeMatch = setCookie.match(/max-age=([^;]+)/i);

      let isExpired = false;
      if (expiresMatch) {
        const expiresDate = new Date(expiresMatch[1]);
        isExpired = !Number.isNaN(expiresDate.getTime()) && expiresDate.getTime() <= Date.now();
      }
      if (maxAgeMatch) {
        const maxAge = Number(maxAgeMatch[1]);
        if (Number.isFinite(maxAge) && maxAge <= 0) {
          isExpired = true;
        }
      }

      assert.strictEqual(
        isExpired,
        true,
        'Cleared cookie must specify an expiration in the past or Max-Age<=0'
      );

      // 12: Reusing the old session after logout does not restore authentication
      const reuseRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { Cookie: login.cookie },
        redirect: 'manual',
      });
      assert.strictEqual(reuseRes.status, 302);
      assert.strictEqual(reuseRes.headers.get('location'), '/login');
    });
  });
});
