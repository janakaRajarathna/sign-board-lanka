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

module.exports = { listProjects, getProjectDetails, parsePositiveInteger };
