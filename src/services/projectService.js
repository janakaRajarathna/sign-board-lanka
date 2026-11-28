'use strict';

const db = require('../config/database');

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;
const VALID_STATUSES = new Set(['ACTIVE', 'COMPLETED', 'CANCELLED']);

/**
 * Validates whether a value is a valid positive integer.
 * Duplicated here so projectService has no cross-service dependency.
 *
 * @param {*} value
 * @returns {number|null}
 */
function parsePositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const num = Number(trimmed);
    return num > 0 && Number.isSafeInteger(num) ? num : null;
  }
  return null;
}

/**
 * Escapes special wildcard characters in a LIKE/ILIKE search string.
 *
 * @param {string} raw
 * @returns {string}
 */
function escapeWildcard(raw) {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Retrieves a paginated, filtered list of projects.
 *
 * Authorization scoping:
 * - OWNER: sees all projects.
 * - PROJECT_MANAGER: sees only projects with an active assignment (ended_at IS NULL).
 *
 * @param {Object} options
 * @param {number|string} options.userId        Authenticated user ID (required)
 * @param {string}        options.role          'OWNER' | 'PROJECT_MANAGER'
 * @param {string}        [options.search]      Search term for project code / name (ILIKE)
 * @param {string}        [options.status]      'ACTIVE' | 'COMPLETED' | 'CANCELLED' | '' (all)
 * @param {number|string} [options.stageId]     Filter by stage ID
 * @param {number|string} [options.page]        1-based page number (default 1)
 * @param {number|string} [options.pageSize]    Items per page (default 10, max 50)
 * @returns {Promise<Object>}
 */
async function listProjects({ userId, role, search, status, stageId, page, pageSize } = {}) {
  const parsedUserId = parsePositiveInteger(userId);
  if (!parsedUserId) {
    throw new Error('Invalid or missing userId');
  }

  // Clamp / default pagination params
  let parsedPage = parsePositiveInteger(page) || 1;
  let parsedPageSize = parsePositiveInteger(pageSize) || DEFAULT_PAGE_SIZE;
  if (parsedPageSize > MAX_PAGE_SIZE) parsedPageSize = MAX_PAGE_SIZE;

  // Validate optional filters
  const cleanStatus = typeof status === 'string' && VALID_STATUSES.has(status.trim())
    ? status.trim()
    : null;
  const parsedStageId = parsePositiveInteger(stageId) || null;
  const cleanSearch = typeof search === 'string' && search.trim().length > 0
    ? search.trim().slice(0, 200)
    : null;

  // Build dynamic WHERE conditions
  const conditions = [];
  const params = [];

  // For PM: mandatory assignment scope
  if (role === 'PROJECT_MANAGER') {
    params.push(parsedUserId); // $1
    conditions.push(
      `EXISTS (
        SELECT 1 FROM public.project_assignments pa
        WHERE pa.project_id = p.project_id
          AND pa.user_id = $${params.length}
          AND pa.ended_at IS NULL
      )`
    );
  }

  if (cleanSearch !== null) {
    const wildcard = `%${escapeWildcard(cleanSearch)}%`;
    params.push(wildcard);
    const idx = params.length;
    conditions.push(
      `(p.project_code ILIKE $${idx} ESCAPE '\\' OR p.project_name ILIKE $${idx} ESCAPE '\\')`
    );
  }

  if (cleanStatus !== null) {
    params.push(cleanStatus);
    conditions.push(`p.project_status = $${params.length}`);
  }

  if (parsedStageId !== null) {
    params.push(parsedStageId);
    conditions.push(`ps.stage_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Base FROM / JOINs (same for OWNER and PM)
  const fromClause = `
    FROM public.projects p
    JOIN public.customers c ON p.customer_id = c.customer_id
    JOIN public.project_stages ps ON p.current_stage_id = ps.stage_id
  `;

  // Count query
  const countSql = `SELECT COUNT(*)::int AS total ${fromClause} ${whereClause}`;

  // Data query — OWNER gets active PM name via LATERAL, PM does not need it
  const pmLateral = role === 'OWNER'
    ? `LEFT JOIN LATERAL (
        SELECT u.full_name
        FROM public.project_assignments pa
        JOIN public.users u ON pa.user_id = u.user_id
        WHERE pa.project_id = p.project_id
          AND pa.ended_at IS NULL
        ORDER BY pa.assigned_at DESC
        LIMIT 1
      ) pm_sub ON TRUE`
    : '';

  const pmNameSelect = role === 'OWNER' ? ', pm_sub.full_name AS assigned_pm_name' : '';

  // Pagination params appended after filter params
  params.push(parsedPageSize); // $N
  const limitIdx = params.length;
  params.push((parsedPage - 1) * parsedPageSize); // $N+1
  const offsetIdx = params.length;

  const dataSql = `
    SELECT
      p.project_id,
      p.project_code,
      p.project_name,
      c.full_name AS customer_name,
      ps.stage_id,
      ps.stage_order,
      ps.stage_name,
      p.project_status,
      p.created_at,
      p.updated_at
      ${pmNameSelect}
    ${fromClause}
    ${pmLateral}
    ${whereClause}
    ORDER BY p.created_at DESC, p.project_id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  // Stages list (all active, for filter dropdown)
  const stagesSql = `
    SELECT stage_id, stage_order, stage_name
    FROM public.project_stages
    WHERE is_active = true
    ORDER BY stage_order ASC
  `;

  const [countResult, initialDataResult, stagesResult] = await Promise.all([
    db.query(countSql, params.slice(0, params.length - 2)), // exclude LIMIT/OFFSET
    db.query(dataSql, params),
    db.query(stagesSql),
  ]);

  const totalCount = countResult?.rows?.[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / parsedPageSize));
  let dataResult = initialDataResult;
  if (parsedPage > totalPages) {
    parsedPage = totalPages;
    if (totalCount > 0) {
      const clampedParams = [...params.slice(0, params.length - 1), (parsedPage - 1) * parsedPageSize];
      dataResult = await db.query(dataSql, clampedParams);
    }
  }

  const projects = (dataResult?.rows || []).map((row) => ({
    projectId: Number(row.project_id),
    projectCode: row.project_code,
    projectName: row.project_name,
    customerName: row.customer_name,
    stageId: Number(row.stage_id),
    stageOrder: Number(row.stage_order),
    stageName: row.stage_name,
    projectStatus: row.project_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    assignedPmName: row.assigned_pm_name || null,
  }));

  const stages = (stagesResult?.rows || []).map((row) => ({
    stageId: Number(row.stage_id),
    stageOrder: Number(row.stage_order),
    stageName: row.stage_name,
  }));

  return {
    projects,
    stages,
    pagination: {
      page: parsedPage,
      pageSize: parsedPageSize,
      totalCount,
      totalPages,
    },
    filters: {
      search: cleanSearch || '',
      status: cleanStatus || '',
      stageId: parsedStageId || '',
    },
  };
}

/**
 * Retrieves full details for a single project by its validated project ID.
 *
 * @param {number|string} projectId  Validated positive integer project ID
 * @returns {Promise<Object|null>}   Project detail object or null if not found
 */
async function getProjectDetails(projectId) {
  const parsedProjectId = parsePositiveInteger(projectId);
  if (!parsedProjectId) {
    return null;
  }

  const projectSql = `
    SELECT
      p.project_id,
      p.project_code,
      p.project_name,
      p.description,
      p.project_address,
      p.project_location,
      p.project_status,
      p.created_at,
      p.updated_at,
      p.completed_at,
      c.customer_id,
      c.full_name AS customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      c.address AS customer_address,
      ps.stage_id,
      ps.stage_order,
      ps.stage_name,
      creator.full_name AS created_by_name,
      pm_sub.full_name AS assigned_pm_name
    FROM public.projects p
    JOIN public.customers c ON p.customer_id = c.customer_id
    JOIN public.project_stages ps ON p.current_stage_id = ps.stage_id
    LEFT JOIN public.users creator ON p.created_by = creator.user_id
    LEFT JOIN LATERAL (
      SELECT u.full_name
      FROM public.project_assignments pa
      JOIN public.users u ON pa.user_id = u.user_id
      WHERE pa.project_id = p.project_id
        AND pa.ended_at IS NULL
      ORDER BY pa.assigned_at DESC
      LIMIT 1
    ) pm_sub ON TRUE
    WHERE p.project_id = $1
  `;

  const historySql = `
    SELECT
      h.history_id,
      h.change_type,
      h.old_project_status,
      h.new_project_status,
      h.is_manual_change,
      h.change_reason,
      h.changed_at,
      old_ps.stage_name AS old_stage_name,
      old_ps.stage_order AS old_stage_order,
      new_ps.stage_name AS new_stage_name,
      new_ps.stage_order AS new_stage_order,
      u.full_name AS changed_by_name
    FROM public.project_status_history h
    LEFT JOIN public.project_stages old_ps ON h.old_stage_id = old_ps.stage_id
    LEFT JOIN public.project_stages new_ps ON h.new_stage_id = new_ps.stage_id
    JOIN public.users u ON h.changed_by = u.user_id
    WHERE h.project_id = $1
    ORDER BY h.changed_at DESC, h.history_id DESC
  `;

  const [projectResult, historyResult] = await Promise.all([
    db.query(projectSql, [parsedProjectId]),
    db.query(historySql, [parsedProjectId]),
  ]);

  const row = projectResult?.rows?.[0];
  if (!row) {
    return null;
  }

  const history = (historyResult?.rows || []).map((h) => ({
    historyId: Number(h.history_id),
    changeType: h.change_type,
    oldProjectStatus: h.old_project_status || null,
    newProjectStatus: h.new_project_status || null,
    oldStageName: h.old_stage_name || null,
    oldStageOrder: h.old_stage_order != null ? Number(h.old_stage_order) : null,
    newStageName: h.new_stage_name || null,
    newStageOrder: h.new_stage_order != null ? Number(h.new_stage_order) : null,
    isManualChange: Boolean(h.is_manual_change),
    changeReason: h.change_reason || null,
    changedByName: h.changed_by_name,
    changedAt: h.changed_at,
  }));

  return {
    projectId: Number(row.project_id),
    projectCode: row.project_code,
    projectName: row.project_name,
    description: row.description || null,
    projectAddress: row.project_address || null,
    projectLocation: row.project_location || null,
    projectStatus: row.project_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    completedAt: row.completed_at || null,
    createdByName: row.created_by_name || null,
    assignedPmName: row.assigned_pm_name || null,
    customer: {
      customerId: Number(row.customer_id),
      fullName: row.customer_name,
      email: row.customer_email || null,
      phone: row.customer_phone || null,
      address: row.customer_address || null,
    },
    stage: {
      stageId: Number(row.stage_id),
      stageOrder: Number(row.stage_order),
      stageName: row.stage_name,
    },
    history,
  };
}

const PROJECT_CODE_LOCK_NAMESPACE = 81;
const MAX_CODE_RETRY_ATTEMPTS = 3;

/**
 * Domain error for project creation validation/conflict failures.
 */
class ProjectCreationError extends Error {
  constructor(message, { statusCode = 400, fieldErrors = {}, duplicateCustomer = null } = {}) {
    super(message);
    this.name = 'ProjectCreationError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.duplicateCustomer = duplicateCustomer;
  }
}

/**
 * Returns the current calendar year in Sri Lanka (Asia/Colombo) as an integer.
 *
 * @param {Date} [now]
 * @returns {number}
 */
function getSriLankaYear(now = new Date()) {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
  }).format(now);
  const year = Number(formatted);
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error('Failed to determine Asia/Colombo calendar year');
  }
  return year;
}

/**
 * Searches active customers by email or address (case-insensitive).
 * Requires at least 2 non-whitespace characters.
 *
 * @param {string} query
 * @param {number} [limit=15]
 * @returns {Promise<Array<Object>>}
 */
async function searchActiveCustomers(query, limit = 15) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed.length < 2) {
    return [];
  }

  const parsedLimit = Math.min(parsePositiveInteger(limit) || 15, 25);
  const pattern = `%${escapeWildcard(trimmed.slice(0, 200))}%`;

  const sql = `
    SELECT customer_id, full_name, email, phone, address
    FROM public.customers
    WHERE is_active = true
      AND (email ILIKE $1 ESCAPE '\\' OR address ILIKE $1 ESCAPE '\\')
    ORDER BY full_name ASC, customer_id ASC
    LIMIT $2
  `;

  const result = await db.query(sql, [pattern, parsedLimit]);
  return (result?.rows || []).map((row) => ({
    customerId: Number(row.customer_id),
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
  }));
}

/**
 * Lists all active users with the PROJECT_MANAGER role.
 *
 * @returns {Promise<Array<Object>>}
 */
async function listActiveProjectManagers() {
  const sql = `
    SELECT u.user_id, u.full_name, u.email
    FROM public.users u
    JOIN public.roles r ON r.role_id = u.role_id
    WHERE r.role_name = 'PROJECT_MANAGER'
      AND u.is_active = true
    ORDER BY u.full_name ASC, u.user_id ASC
  `;

  const result = await db.query(sql);
  return (result?.rows || []).map((row) => ({
    userId: Number(row.user_id),
    fullName: row.full_name,
    email: row.email,
  }));
}

/**
 * Generates the next sequential SBL-YYYY-NNNN code within an active transaction
 * using a transaction-scoped PostgreSQL advisory lock keyed by the year.
 *
 * @param {Object} client
 * @param {number} year
 * @returns {Promise<string>}
 */
async function generateNextProjectCode(client, year) {
  await client.query('SELECT pg_advisory_xact_lock($1, $2)', [PROJECT_CODE_LOCK_NAMESPACE, year]);

  const prefix = `SBL-${year}-`;
  const matchPattern = `^SBL-${year}-\\d+$`;
  const extractPattern = `^SBL-${year}-(\\d+)$`;

  const maxResult = await client.query(
    `SELECT COALESCE(
       MAX(
         CASE
           WHEN project_code ~ $1 THEN SUBSTRING(project_code FROM $2)::int
           ELSE 0
         END
       ),
       0
     ) AS max_seq
     FROM public.projects
     WHERE project_code LIKE $3`,
    [matchPattern, extractPattern, `${prefix}%`]
  );

  const maxSeq = Number(maxResult?.rows?.[0]?.max_seq || 0);
  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Resolves an existing active customer or inserts a new customer inside a transaction.
 *
 * @param {Object} client
 * @param {Object} input
 * @returns {Promise<number>}
 */
async function resolveCustomerInTransaction(client, input) {
  if (input.customerMode === 'existing') {
    const existingRes = await client.query(
      `SELECT customer_id, is_active
       FROM public.customers
       WHERE customer_id = $1`,
      [input.customerId]
    );
    const existing = existingRes?.rows?.[0];
    if (!existing || !existing.is_active) {
      throw new ProjectCreationError('Selected customer was not found or is inactive.', {
        statusCode: 400,
        fieldErrors: { customerId: 'Selected customer was not found or is inactive.' },
      });
    }
    return Number(existing.customer_id);
  }

  const nc = input.newCustomer;
  const dupRes = await client.query(
    `SELECT customer_id, full_name, email, phone, address, is_active
     FROM public.customers
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [nc.email]
  );
  const dup = dupRes?.rows?.[0];
  if (dup) {
    if (dup.is_active) {
      throw new ProjectCreationError(
        'A customer with this email already exists. Select the existing customer instead.',
        {
          statusCode: 409,
          fieldErrors: { customerEmail: 'A customer with this email already exists.' },
          duplicateCustomer: {
            customerId: Number(dup.customer_id),
            fullName: dup.full_name,
            email: dup.email,
            phone: dup.phone,
            address: dup.address,
          },
        }
      );
    }
    throw new ProjectCreationError(
      'A customer with this email already exists and is inactive.',
      {
        statusCode: 409,
        fieldErrors: { customerEmail: 'A customer with this email already exists and is inactive.' },
      }
    );
  }

  const insertCustomerRes = await client.query(
    `INSERT INTO public.customers (full_name, email, phone, address)
     VALUES ($1, $2, $3, $4)
     RETURNING customer_id`,
    [nc.fullName, nc.email, nc.phone, nc.address]
  );
  return Number(insertCustomerRes.rows[0].customer_id);
}

/**
 * Validates that the selected Project Manager exists, is active, and holds PROJECT_MANAGER role.
 *
 * @param {Object} client
 * @param {number} projectManagerId
 * @returns {Promise<number>}
 */
async function validateProjectManagerInTransaction(client, projectManagerId) {
  const pmRes = await client.query(
    `SELECT u.user_id, u.is_active, r.role_name
     FROM public.users u
     JOIN public.roles r ON r.role_id = u.role_id
     WHERE u.user_id = $1`,
    [projectManagerId]
  );
  const pm = pmRes?.rows?.[0];
  if (!pm) {
    throw new ProjectCreationError('Selected Project Manager was not found.', {
      statusCode: 400,
      fieldErrors: { projectManagerId: 'Selected Project Manager was not found.' },
    });
  }
  if (!pm.is_active) {
    throw new ProjectCreationError('Selected Project Manager is inactive.', {
      statusCode: 400,
      fieldErrors: { projectManagerId: 'Selected Project Manager is inactive.' },
    });
  }
  if (pm.role_name !== 'PROJECT_MANAGER') {
    throw new ProjectCreationError('Selected user does not have the PROJECT_MANAGER role.', {
      statusCode: 400,
      fieldErrors: { projectManagerId: 'Only active Project Managers can be assigned.' },
    });
  }
  return Number(pm.user_id);
}

/**
 * Creates a customer (if new), project, and optional PM assignment atomically
 * within a single PostgreSQL transaction.
 *
 * @param {Object} input        Validated input from projectValidator.validateCreateProjectInput
 * @param {number|string} ownerUserId  Authenticated OWNER user ID from session
 * @returns {Promise<{ projectId: number, projectCode: string, customerId: number }>}
 */
async function createProject(input, ownerUserId) {
  const parsedOwnerId = parsePositiveInteger(ownerUserId);
  if (!parsedOwnerId) {
    throw new Error('Invalid or missing owner userId');
  }

  for (let attempt = 1; attempt <= MAX_CODE_RETRY_ATTEMPTS; attempt++) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const customerId = await resolveCustomerInTransaction(client, input);

      let validPmId = null;
      if (input.projectManagerId !== null && input.projectManagerId !== undefined) {
        validPmId = await validateProjectManagerInTransaction(client, input.projectManagerId);
      }

      const year = getSriLankaYear();
      const projectCode = await generateNextProjectCode(client, year);

      // current_stage_id (1) and project_status ('ACTIVE') use DB defaults,
      // matching signboard_app's column-level INSERT grants on public.projects.
      const insertProjectRes = await client.query(
        `INSERT INTO public.projects (
           customer_id,
           project_code,
           project_name,
           description,
           project_address,
           project_location,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING project_id`,
        [
          customerId,
          projectCode,
          input.projectName,
          input.description,
          input.projectAddress,
          input.projectLocation,
          parsedOwnerId,
        ]
      );

      const projectId = Number(insertProjectRes.rows[0].project_id);

      if (validPmId !== null) {
        await client.query(
          `INSERT INTO public.project_assignments (project_id, user_id, assigned_by)
           VALUES ($1, $2, $3)`,
          [projectId, validPmId, parsedOwnerId]
        );
      }

      await client.query('COMMIT');
      return { projectId, projectCode, customerId };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback failure so original error propagates
      }

      if (err instanceof ProjectCreationError) {
        throw err;
      }

      if (err && err.code === '23505') {
        if (err.constraint === 'projects_code_unique' && attempt < MAX_CODE_RETRY_ATTEMPTS) {
          continue;
        }
        if (err.constraint === 'customers_email_unique') {
          throw new ProjectCreationError(
            'A customer with this email already exists. Select the existing customer instead.',
            {
              statusCode: 409,
              fieldErrors: { customerEmail: 'A customer with this email already exists.' },
            }
          );
        }
      }

      if (err && (err.code === '22001' || err.code === '23503' || err.code === '23514')) {
        throw new ProjectCreationError('Submitted project data violates field constraints.', {
          statusCode: 400,
        });
      }

      throw err;
    } finally {
      client.release();
    }
  }

  throw new ProjectCreationError('Unable to generate a unique project code. Please try again.', {
    statusCode: 409,
  });
}

/**
 * Domain error for project cancellation failures.
 */
class ProjectCancellationError extends Error {
  constructor(message, { statusCode = 400 } = {}) {
    super(message);
    this.name = 'ProjectCancellationError';
    this.statusCode = statusCode;
  }
}

/**
 * Maps a known PostgreSQL exception message from change_project_status()
 * to a ProjectCancellationError with the appropriate HTTP status code.
 *
 * @param {Error} err
 * @returns {ProjectCancellationError|null}
 */
function mapCancellationDbError(err) {
  const msg = err && typeof err.message === 'string' ? err.message : '';
  if (msg.includes('Project not found')) {
    return new ProjectCancellationError('Project not found.', { statusCode: 404 });
  }
  if (msg.includes('project status transition is not allowed') || msg.includes('transition is not allowed')) {
    return new ProjectCancellationError(
      'This project cannot be cancelled. Only active projects can be cancelled.',
      { statusCode: 409 }
    );
  }
  if (msg.includes('Only an OWNER can change this project status')) {
    return new ProjectCancellationError('Only an OWNER can cancel a project.', { statusCode: 403 });
  }
  if (msg.includes('Invalid or inactive user')) {
    return new ProjectCancellationError('User account is invalid or inactive.', { statusCode: 403 });
  }
  if (msg.includes('A reason is required')) {
    return new ProjectCancellationError('A cancellation reason is required.', { statusCode: 400 });
  }
  return null;
}

/**
 * Cancels an ACTIVE project by calling the SECURITY DEFINER function
 * `change_project_status` and ending any active PM assignment, all in a
 * single PostgreSQL transaction.
 *
 * @param {number|string} projectId     Validated positive integer project ID
 * @param {number|string} ownerUserId   Authenticated OWNER user ID from session
 * @param {string}        reason        Cancellation reason (non-empty, max 500 chars)
 * @returns {Promise<{ projectId: number }>}
 * @throws {ProjectCancellationError}  For domain errors (not found, wrong status, etc.)
 */
async function cancelProject(projectId, ownerUserId, reason) {
  const parsedProjectId = parsePositiveInteger(projectId);
  if (!parsedProjectId) {
    throw new ProjectCancellationError('Invalid project ID.', { statusCode: 400 });
  }

  const parsedOwnerId = parsePositiveInteger(ownerUserId);
  if (!parsedOwnerId) {
    throw new ProjectCancellationError('Invalid owner user ID.', { statusCode: 400 });
  }

  const cleanReason = typeof reason === 'string' ? reason.trim() : '';
  if (!cleanReason) {
    throw new ProjectCancellationError('A cancellation reason is required.', { statusCode: 400 });
  }
  if (cleanReason.length > 500) {
    throw new ProjectCancellationError('Cancellation reason must not exceed 500 characters.', { statusCode: 400 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // change_project_status is SECURITY DEFINER — it handles:
    //   1. Row-level FOR UPDATE lock on the project
    //   2. Status-transition validation (ACTIVE→CANCELLED only)
    //   3. OWNER-only enforcement
    //   4. INSERT into project_status_history (with reason)
    //   5. set_config('app.status_history_id', ...) to arm the trigger
    //   6. UPDATE projects SET project_status = 'CANCELLED'
    await client.query(
      `SELECT change_project_status($1, $2, 'CANCELLED', $3)`,
      [parsedProjectId, parsedOwnerId, cleanReason]
    );

    // End active PM assignment (if any). Zero rows affected is safe.
    await client.query(
      `UPDATE public.project_assignments
       SET ended_at = CURRENT_TIMESTAMP
       WHERE project_id = $1
         AND ended_at IS NULL`,
      [parsedProjectId]
    );

    await client.query('COMMIT');
    return { projectId: parsedProjectId };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }

    if (err instanceof ProjectCancellationError) {
      throw err;
    }

    const mapped = mapCancellationDbError(err);
    if (mapped) throw mapped;

    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listProjects,
  getProjectDetails,
  parsePositiveInteger,
  getSriLankaYear,
  searchActiveCustomers,
  listActiveProjectManagers,
  createProject,
  ProjectCreationError,
  cancelProject,
  ProjectCancellationError,
};
