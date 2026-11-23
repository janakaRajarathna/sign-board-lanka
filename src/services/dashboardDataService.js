const db = require('../config/database');

/**
 * Retrieves all data required for the Owner Dashboard.
 *
 * Requirements:
 * - Aggregates system-wide project KPIs using project_status (ACTIVE, COMPLETED, CANCELLED).
 * - Excludes inferring completion from stage 8.
 * - Counts pending approvals strictly from budgets with approval_status = 'PENDING'.
 * - Aggregates 8-stage project distribution for ACTIVE projects.
 * - Lists pending budget approval items with customer and cost details.
 * - Retrieves the latest 10 created projects with their latest active PM assignment (deduplicated).
 * - Retrieves the latest 10 project status change activities.
 *
 * @returns {Promise<Object>} Formatted Owner Dashboard data object
 */
async function getOwnerDashboardData() {
  try {
    const kpiQuery = `
      SELECT
        COUNT(*)::int AS total_projects,
        COUNT(*) FILTER (WHERE p.project_status = 'ACTIVE')::int AS active_projects,
        COUNT(*) FILTER (WHERE p.project_status = 'COMPLETED')::int AS completed_projects,
        COUNT(*) FILTER (WHERE p.project_status = 'CANCELLED')::int AS cancelled_projects,
        (SELECT COUNT(*)::int FROM customers) AS total_customers,
        (SELECT COUNT(*)::int FROM budgets WHERE approval_status = 'PENDING') AS pending_approvals_count
      FROM projects p;
    `;

    const stageDistributionQuery = `
      SELECT
        ps.stage_id,
        ps.stage_order,
        ps.stage_name,
        COUNT(p.project_id)::int AS project_count
      FROM project_stages ps
      LEFT JOIN projects p
        ON ps.stage_id = p.current_stage_id
       AND p.project_status = 'ACTIVE'
      GROUP BY ps.stage_id, ps.stage_order, ps.stage_name
      ORDER BY ps.stage_order ASC;
    `;

    const pendingApprovalsQuery = `
      SELECT
        b.budget_id,
        b.project_id,
        p.project_code,
        p.project_name,
        c.full_name AS customer_name,
        b.version_number,
        COALESCE(bi.total_cost, 0)::numeric AS total_cost,
        b.created_at
      FROM budgets b
      JOIN projects p ON b.project_id = p.project_id
      JOIN customers c ON p.customer_id = c.customer_id
      LEFT JOIN LATERAL (
        SELECT SUM(total_cost) AS total_cost
        FROM budget_items
        WHERE budget_id = b.budget_id
      ) bi ON TRUE
      WHERE b.approval_status = 'PENDING'
      ORDER BY b.created_at ASC;
    `;

    const recentProjectsQuery = `
      SELECT
        p.project_id,
        p.project_code,
        p.project_name,
        c.full_name AS customer_name,
        ps.stage_order,
        ps.stage_name,
        p.project_status,
        pm.full_name AS assigned_pm_name,
        p.created_at
      FROM projects p
      JOIN customers c ON p.customer_id = c.customer_id
      JOIN project_stages ps ON p.current_stage_id = ps.stage_id
      LEFT JOIN LATERAL (
        SELECT u.full_name
        FROM project_assignments pa
        JOIN users u ON pa.user_id = u.user_id
        WHERE pa.project_id = p.project_id
          AND pa.ended_at IS NULL
        ORDER BY pa.assigned_at DESC
        LIMIT 1
      ) pm ON TRUE
      ORDER BY p.created_at DESC
      LIMIT 10;
    `;

    const recentActivityQuery = `
      SELECT
        h.history_id,
        h.project_id,
        p.project_code,
        p.project_name,
        h.change_type,
        h.is_manual_change,
        h.change_reason,
        old_ps.stage_name AS old_stage_name,
        new_ps.stage_name AS new_stage_name,
        u.full_name AS changed_by_name,
        h.changed_at
      FROM project_status_history h
      JOIN projects p ON h.project_id = p.project_id
      LEFT JOIN project_stages old_ps ON h.old_stage_id = old_ps.stage_id
      LEFT JOIN project_stages new_ps ON h.new_stage_id = new_ps.stage_id
      JOIN users u ON h.changed_by = u.user_id
      ORDER BY h.changed_at DESC
      LIMIT 10;
    `;

    const [
      kpiResult,
      stageResult,
      approvalsResult,
      projectsResult,
      activityResult,
    ] = await Promise.all([
      db.query(kpiQuery),
      db.query(stageDistributionQuery),
      db.query(pendingApprovalsQuery),
      db.query(recentProjectsQuery),
      db.query(recentActivityQuery),
    ]);

    const kpiRow = kpiResult?.rows?.[0] || {};

    const kpis = {
      totalProjects: Number(kpiRow.total_projects) || 0,
      activeProjects: Number(kpiRow.active_projects) || 0,
      completedProjects: Number(kpiRow.completed_projects) || 0,
      cancelledProjects: Number(kpiRow.cancelled_projects) || 0,
      totalCustomers: Number(kpiRow.total_customers) || 0,
      pendingApprovalsCount: Number(kpiRow.pending_approvals_count) || 0,
    };

    const stageDistribution = (stageResult?.rows || []).map((row) => ({
      stageId: Number(row.stage_id),
      stageOrder: Number(row.stage_order),
      stageName: row.stage_name,
      projectCount: Number(row.project_count) || 0,
    }));

    const pendingApprovals = (approvalsResult?.rows || []).map((row) => ({
      budgetId: Number(row.budget_id),
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      customerName: row.customer_name,
      versionNumber: Number(row.version_number),
      totalCost: Number(row.total_cost) || 0,
      createdAt: row.created_at,
    }));

    const recentProjects = (projectsResult?.rows || []).map((row) => ({
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      customerName: row.customer_name,
      stageOrder: Number(row.stage_order),
      stageName: row.stage_name,
      projectStatus: row.project_status,
      assignedPmName: row.assigned_pm_name || null,
      createdAt: row.created_at,
    }));

    const recentActivity = (activityResult?.rows || []).map((row) => ({
      historyId: Number(row.history_id),
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      changeType: row.change_type,
      isManualChange: Boolean(row.is_manual_change),
      changeReason: row.change_reason || null,
      oldStageName: row.old_stage_name || null,
      newStageName: row.new_stage_name || null,
      changedByName: row.changed_by_name,
      changedAt: row.changed_at,
    }));

    return {
      kpis,
      stageDistribution,
      pendingApprovals,
      recentProjects,
      recentActivity,
    };
  } catch (error) {
    throw new Error('Failed to retrieve owner dashboard data');
  }
}

/**
 * Validates whether a value is a valid positive integer.
 *
 * @param {*} value
 * @returns {number|null} Valid integer or null
 */
function parsePositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
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
 * Retrieves all data required for the Project Manager (PM) Dashboard.
 *
 * Requirements:
 * - Scoped strictly to projects actively assigned to pmUserId (ended_at IS NULL).
 * - Only includes ACTIVE projects (project_status = 'ACTIVE').
 * - Prevents duplicate projects if multiple active assignments exist.
 * - Computes KPIs:
 *   - myActiveProjectsCount: distinct active assigned projects.
 *   - pendingSiteVisitsCount: Stage 2 without site_visits.
 *   - pendingDesignWorkCount: Stage 3 without approved design_version (approval_status = 'APPROVED').
 *   - pendingQualityChecksCount: Stage 6 without PASS quality check (result = 'PASS').
 *   - upcomingInstallationsCount: Stage 7 with no installation or INCOMPLETE installation.
 *   - requiresAttentionCount: distinct projects across site visit, design, and QC blockers (no double-counting).
 * - Stage distribution: all 8 stages including 0 counts.
 * - Action items: blockers categorized with stable types and meaningful descriptions.
 * - Assigned projects: distinct active projects with customer name and stage info.
 * - Recent quality checks: latest 10 inspections for assigned projects with inspector name.
 *
 * @param {number|string} pmUserId Authenticated PM user ID
 * @returns {Promise<Object>} Formatted PM Dashboard data object
 */
async function getPmDashboardData(pmUserId) {
  const parsedPmUserId = parsePositiveInteger(pmUserId);
  if (!parsedPmUserId) {
    throw new Error('Invalid or missing pmUserId');
  }

  try {
    const kpiQuery = `
      WITH assigned_active AS (
        SELECT p.project_id, p.current_stage_id, ps.stage_order
        FROM projects p
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        WHERE p.project_status = 'ACTIVE'
          AND EXISTS (
            SELECT 1 FROM project_assignments pa
            WHERE pa.project_id = p.project_id
              AND pa.user_id = $1
              AND pa.ended_at IS NULL
          )
      ),
      pending_site_visits AS (
        SELECT project_id
        FROM assigned_active
        WHERE stage_order = 2
          AND NOT EXISTS (
            SELECT 1 FROM site_visits sv WHERE sv.project_id = assigned_active.project_id
          )
      ),
      pending_designs AS (
        SELECT project_id
        FROM assigned_active
        WHERE stage_order = 3
          AND NOT EXISTS (
            SELECT 1 FROM design_versions dv
            WHERE dv.project_id = assigned_active.project_id
              AND dv.approval_status = 'APPROVED'
          )
      ),
      pending_qc AS (
        SELECT project_id
        FROM assigned_active
        WHERE stage_order = 6
          AND NOT EXISTS (
            SELECT 1 FROM quality_checks qc
            WHERE qc.project_id = assigned_active.project_id
              AND qc.result = 'PASS'
          )
      ),
      upcoming_installations AS (
        SELECT project_id
        FROM assigned_active
        WHERE stage_order = 7
          AND (
            NOT EXISTS (SELECT 1 FROM installations i WHERE i.project_id = assigned_active.project_id)
            OR EXISTS (SELECT 1 FROM installations i WHERE i.project_id = assigned_active.project_id AND i.installation_status = 'INCOMPLETE')
          )
      )
      SELECT
        (SELECT COUNT(*)::int FROM assigned_active) AS my_active_projects_count,
        (
          SELECT COUNT(DISTINCT project_id)::int
          FROM (
            SELECT project_id FROM pending_site_visits
            UNION
            SELECT project_id FROM pending_designs
            UNION
            SELECT project_id FROM pending_qc
          ) blockers
        ) AS requires_attention_count,
        (SELECT COUNT(*)::int FROM pending_site_visits) AS pending_site_visits_count,
        (SELECT COUNT(*)::int FROM pending_designs) AS pending_design_work_count,
        (SELECT COUNT(*)::int FROM pending_qc) AS pending_quality_checks_count,
        (SELECT COUNT(*)::int FROM upcoming_installations) AS upcoming_installations_count;
    `;

    const stageDistributionQuery = `
      SELECT
        ps.stage_id,
        ps.stage_order,
        ps.stage_name,
        COUNT(p.project_id)::int AS project_count
      FROM project_stages ps
      LEFT JOIN projects p
        ON ps.stage_id = p.current_stage_id
       AND p.project_status = 'ACTIVE'
       AND EXISTS (
         SELECT 1 FROM project_assignments pa
         WHERE pa.project_id = p.project_id
           AND pa.user_id = $1
           AND pa.ended_at IS NULL
       )
      GROUP BY ps.stage_id, ps.stage_order, ps.stage_name
      ORDER BY ps.stage_order ASC;
    `;

    const actionItemsQuery = `
      WITH assigned_active AS (
        SELECT p.project_id, p.project_code, p.project_name, ps.stage_order, ps.stage_name
        FROM projects p
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        WHERE p.project_status = 'ACTIVE'
          AND EXISTS (
            SELECT 1 FROM project_assignments pa
            WHERE pa.project_id = p.project_id
              AND pa.user_id = $1
              AND pa.ended_at IS NULL
          )
      )
      (
        SELECT
          'SITE_VISIT' AS type,
          a.project_id,
          a.project_code,
          a.project_name,
          'Site measurement and requirements gathering pending.' AS description,
          a.stage_name,
          a.stage_order
        FROM assigned_active a
        WHERE a.stage_order = 2
          AND NOT EXISTS (
            SELECT 1 FROM site_visits sv WHERE sv.project_id = a.project_id
          )
      )
      UNION ALL
      (
        SELECT
          'DESIGN_WORK' AS type,
          a.project_id,
          a.project_code,
          a.project_name,
          'Client design approval pending.' AS description,
          a.stage_name,
          a.stage_order
        FROM assigned_active a
        WHERE a.stage_order = 3
          AND NOT EXISTS (
            SELECT 1 FROM design_versions dv
            WHERE dv.project_id = a.project_id
              AND dv.approval_status = 'APPROVED'
          )
      )
      UNION ALL
      (
        SELECT
          'QUALITY_CHECK' AS type,
          a.project_id,
          a.project_code,
          a.project_name,
          'Final production quality inspection pending.' AS description,
          a.stage_name,
          a.stage_order
        FROM assigned_active a
        WHERE a.stage_order = 6
          AND NOT EXISTS (
            SELECT 1 FROM quality_checks qc
            WHERE qc.project_id = a.project_id
              AND qc.result = 'PASS'
          )
      )
      UNION ALL
      (
        SELECT
          'INSTALLATION' AS type,
          a.project_id,
          a.project_code,
          a.project_name,
          'On-site installation and completion verification pending.' AS description,
          a.stage_name,
          a.stage_order
        FROM assigned_active a
        WHERE a.stage_order = 7
          AND (
            NOT EXISTS (SELECT 1 FROM installations i WHERE i.project_id = a.project_id)
            OR EXISTS (SELECT 1 FROM installations i WHERE i.project_id = a.project_id AND i.installation_status = 'INCOMPLETE')
          )
      )
      ORDER BY stage_order ASC, project_id ASC;
    `;

    const assignedProjectsQuery = `
      SELECT
        p.project_id,
        p.project_code,
        p.project_name,
        c.full_name AS customer_name,
        ps.stage_order,
        ps.stage_name,
        p.project_status,
        pa.assigned_at
      FROM projects p
      JOIN customers c ON p.customer_id = c.customer_id
      JOIN project_stages ps ON p.current_stage_id = ps.stage_id
      JOIN LATERAL (
        SELECT pa.assigned_at
        FROM project_assignments pa
        WHERE pa.project_id = p.project_id
          AND pa.user_id = $1
          AND pa.ended_at IS NULL
        ORDER BY pa.assigned_at DESC
        LIMIT 1
      ) pa ON TRUE
      WHERE p.project_status = 'ACTIVE'
      ORDER BY pa.assigned_at DESC, p.project_id DESC;
    `;

    const recentQualityChecksQuery = `
      SELECT
        qc.quality_check_id,
        qc.project_id,
        p.project_code,
        p.project_name,
        qc.result,
        qc.remarks,
        qc.check_date,
        inspector.full_name AS inspector_name
      FROM quality_checks qc
      JOIN projects p ON qc.project_id = p.project_id
      JOIN users inspector ON qc.checked_by = inspector.user_id
      WHERE EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = p.project_id
          AND pa.user_id = $1
          AND pa.ended_at IS NULL
      )
      ORDER BY qc.check_date DESC, qc.quality_check_id DESC
      LIMIT 10;
    `;

    const [
      kpiResult,
      stageResult,
      actionItemsResult,
      projectsResult,
      qcResult,
    ] = await Promise.all([
      db.query(kpiQuery, [parsedPmUserId]),
      db.query(stageDistributionQuery, [parsedPmUserId]),
      db.query(actionItemsQuery, [parsedPmUserId]),
      db.query(assignedProjectsQuery, [parsedPmUserId]),
      db.query(recentQualityChecksQuery, [parsedPmUserId]),
    ]);

    const kpiRow = kpiResult?.rows?.[0] || {};

    const kpis = {
      myActiveProjectsCount: Number(kpiRow.my_active_projects_count) || 0,
      requiresAttentionCount: Number(kpiRow.requires_attention_count) || 0,
      pendingSiteVisitsCount: Number(kpiRow.pending_site_visits_count) || 0,
      pendingDesignWorkCount: Number(kpiRow.pending_design_work_count) || 0,
      pendingQualityChecksCount: Number(kpiRow.pending_quality_checks_count) || 0,
      upcomingInstallationsCount: Number(kpiRow.upcoming_installations_count) || 0,
    };

    const stageDistribution = (stageResult?.rows || []).map((row) => ({
      stageId: Number(row.stage_id),
      stageOrder: Number(row.stage_order),
      stageName: row.stage_name,
      projectCount: Number(row.project_count) || 0,
    }));

    const actionItems = (actionItemsResult?.rows || []).map((row) => ({
      type: row.type,
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      description: row.description,
      stageName: row.stage_name,
    }));

    const assignedProjects = (projectsResult?.rows || []).map((row) => ({
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      customerName: row.customer_name,
      stageOrder: Number(row.stage_order),
      stageName: row.stage_name,
      projectStatus: row.project_status,
      assignedAt: row.assigned_at,
    }));

    const recentQualityChecks = (qcResult?.rows || []).map((row) => ({
      qualityCheckId: Number(row.quality_check_id),
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      result: row.result,
      remarks: row.remarks || null,
      checkDate: row.check_date,
      inspectorName: row.inspector_name,
    }));

    return {
      kpis,
      stageDistribution,
      actionItems,
      assignedProjects,
      recentQualityChecks,
    };
  } catch (error) {
    if (error.message === 'Invalid or missing pmUserId') {
      throw error;
    }
    throw new Error('Failed to retrieve PM dashboard data');
  }
}

/**
 * Retrieves all data required for the Accounts Dashboard.
 *
 * Requirements:
 * - Computes KPIs:
 *   - pendingBudgetPrepCount: active Stage 4 projects without a budget.
 *   - quotationsDraftCount: quotations in DRAFT status.
 *   - quotationsSentCount: quotations in SENT status.
 *   - pendingQuotationsCount: DRAFT + SENT quotations.
 *   - totalOutstandingBalance: sum of balance_amount across invoices with balance_amount > 0.
 *   - unpaidInvoicesCount: count of invoices with balance_amount > 0.
 *   - paymentsReceivedThisMonth: sum of payments in current calendar month (Asia/Colombo timezone).
 *   - paymentCountThisMonth: count of payments in current calendar month (Asia/Colombo timezone).
 * - Identifies actionable financial tasks:
 *   - BUDGET_PREP: Active Stage 4 project without a budget.
 *   - QUOTATION_DRAFT: Active Stage 4 project with DRAFT quotation (latest version only).
 *   - ISSUE_ADVANCE_INVOICE: Active Stage 5 project with ACCEPTED quotation and no invoice.
 *   - COLLECT_ADVANCE: Active Stage 5 project with invoice and advance paid < 30% of tax-inclusive total.
 *   - COLLECT_FINAL: Active Stage 8 project with invoice balance > 0.
 * - Retrieves the latest 10 recent payments.
 * - Retrieves the latest 10 outstanding invoices.
 *
 * @returns {Promise<Object>} Formatted Accounts Dashboard data object
 */
async function getAccountsDashboardData() {
  try {
    const kpiQuery = `
      SELECT
        (
          SELECT COUNT(p.project_id)::int
          FROM projects p
          JOIN project_stages ps ON p.current_stage_id = ps.stage_id
          WHERE p.project_status = 'ACTIVE'
            AND ps.stage_order = 4
            AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.project_id = p.project_id)
        ) AS pending_budget_prep_count,

        (SELECT COUNT(*)::int FROM quotations WHERE quotation_status = 'DRAFT') AS quotations_draft_count,
        (SELECT COUNT(*)::int FROM quotations WHERE quotation_status = 'SENT') AS quotations_sent_count,
        (SELECT COUNT(*)::int FROM quotations WHERE quotation_status IN ('DRAFT', 'SENT')) AS pending_quotations_count,

        (
          SELECT COALESCE(SUM(balance_amount), 0)::numeric
          FROM invoices
          WHERE balance_amount > 0
        ) AS total_outstanding_balance,
        (
          SELECT COUNT(*)::int
          FROM invoices
          WHERE balance_amount > 0
        ) AS unpaid_invoices_count,

        (
          SELECT COALESCE(SUM(amount), 0)::numeric
          FROM payments
          WHERE payment_date >= (date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo') AT TIME ZONE 'Asia/Colombo')
            AND payment_date < ((date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo') + INTERVAL '1 month') AT TIME ZONE 'Asia/Colombo')
        ) AS payments_received_this_month,
        (
          SELECT COUNT(*)::int
          FROM payments
          WHERE payment_date >= (date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo') AT TIME ZONE 'Asia/Colombo')
            AND payment_date < ((date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo') + INTERVAL '1 month') AT TIME ZONE 'Asia/Colombo')
        ) AS payment_count_this_month;
    `;

    const pendingFinancialTasksQuery = `
      (
        SELECT
          'TASK-BUDGET-' || p.project_id AS task_id,
          'BUDGET_PREP' AS task_type,
          p.project_id,
          p.project_code,
          p.project_name,
          c.full_name AS customer_name,
          'Design approved. Prepare initial material & fabrication budget.' AS description,
          'Prepare Budget' AS action_label,
          p.created_at AS priority_date
        FROM projects p
        JOIN customers c ON p.customer_id = c.customer_id
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        WHERE p.project_status = 'ACTIVE'
          AND ps.stage_order = 4
          AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.project_id = p.project_id)
      )
      UNION ALL
      (
        SELECT
          'TASK-QUOTE-' || q.quotation_id AS task_id,
          'QUOTATION_DRAFT' AS task_type,
          p.project_id,
          p.project_code,
          p.project_name,
          c.full_name AS customer_name,
          'Budget approved. Quotation v' || q.version_number || ' in draft preparation.' AS description,
          'Review Quotation' AS action_label,
          q.created_at AS priority_date
        FROM projects p
        JOIN customers c ON p.customer_id = c.customer_id
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        JOIN LATERAL (
          SELECT q_sub.quotation_id, q_sub.version_number, q_sub.created_at
          FROM quotations q_sub
          WHERE q_sub.project_id = p.project_id
            AND q_sub.quotation_status = 'DRAFT'
          ORDER BY q_sub.version_number DESC
          LIMIT 1
        ) q ON TRUE
        WHERE p.project_status = 'ACTIVE'
          AND ps.stage_order = 4
      )
      UNION ALL
      (
        SELECT
          'TASK-ADV-INV-' || p.project_id AS task_id,
          'ISSUE_ADVANCE_INVOICE' AS task_type,
          p.project_id,
          p.project_code,
          p.project_name,
          c.full_name AS customer_name,
          'Quotation v' || q.version_number || ' accepted. Issue 30% advance invoice before fabrication starts.' AS description,
          'Issue Advance Invoice' AS action_label,
          COALESCE(q.accepted_at, q.created_at) AS priority_date
        FROM projects p
        JOIN customers c ON p.customer_id = c.customer_id
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        JOIN LATERAL (
          SELECT q_sub.quotation_id, q_sub.version_number, q_sub.accepted_at, q_sub.created_at
          FROM quotations q_sub
          WHERE q_sub.project_id = p.project_id
            AND q_sub.quotation_status = 'ACCEPTED'
          ORDER BY q_sub.version_number DESC
          LIMIT 1
        ) q ON TRUE
        WHERE p.project_status = 'ACTIVE'
          AND ps.stage_order = 5
          AND NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.project_id = p.project_id)
      )
      UNION ALL
      (
        SELECT
          'TASK-COLL-ADV-' || inv.invoice_id AS task_id,
          'COLLECT_ADVANCE' AS task_type,
          p.project_id,
          p.project_code,
          p.project_name,
          c.full_name AS customer_name,
          'Advance invoice issued. Collect required 30% advance deposit of LKR ' ||
            TO_CHAR(ROUND(0.30 * inv.total_amount, 2), 'FM999,999,999.00') ||
            ' (Remaining: LKR ' ||
            TO_CHAR(
              ROUND(0.30 * inv.total_amount, 2) - COALESCE(adv_pay.total_advance_paid, 0),
              'FM999,999,999.00'
            ) || ').' AS description,
          'Record Advance Payment' AS action_label,
          inv.invoice_date::timestamp with time zone AS priority_date
        FROM invoices inv
        JOIN projects p ON inv.project_id = p.project_id
        JOIN customers c ON p.customer_id = c.customer_id
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(pay.amount), 0) AS total_advance_paid
          FROM payments pay
          WHERE pay.project_id = p.project_id
            AND pay.payment_type = 'ADVANCE'
        ) adv_pay ON TRUE
        WHERE p.project_status = 'ACTIVE'
          AND ps.stage_order = 5
          AND COALESCE(adv_pay.total_advance_paid, 0) < ROUND(0.30 * inv.total_amount, 2)
      )
      UNION ALL
      (
        SELECT
          'TASK-INV-' || inv.invoice_id AS task_id,
          'COLLECT_FINAL' AS task_type,
          p.project_id,
          p.project_code,
          p.project_name,
          c.full_name AS customer_name,
          'Project in final completion. Invoice ' || inv.invoice_number || ' has outstanding balance of LKR ' ||
            TO_CHAR(inv.balance_amount, 'FM999,999,999.00') AS description,
          'Record Final Payment' AS action_label,
          inv.invoice_date::timestamp with time zone AS priority_date
        FROM invoices inv
        JOIN projects p ON inv.project_id = p.project_id
        JOIN customers c ON p.customer_id = c.customer_id
        JOIN project_stages ps ON p.current_stage_id = ps.stage_id
        WHERE p.project_status = 'ACTIVE'
          AND ps.stage_order = 8
          AND inv.balance_amount > 0
      )
      ORDER BY priority_date DESC
      LIMIT 10;
    `;

    const recentPaymentsQuery = `
      SELECT
        pay.payment_id,
        pay.project_id,
        p.project_code,
        p.project_name,
        c.full_name AS customer_name,
        pay.amount,
        pay.payment_type,
        pay.payment_method,
        pay.reference_number,
        pay.payment_date
      FROM payments pay
      JOIN projects p ON pay.project_id = p.project_id
      JOIN customers c ON p.customer_id = c.customer_id
      ORDER BY pay.payment_date DESC, pay.payment_id DESC
      LIMIT 10;
    `;

    const outstandingInvoicesQuery = `
      SELECT
        inv.invoice_id,
        inv.invoice_number,
        inv.project_id,
        p.project_code,
        p.project_name,
        c.full_name AS customer_name,
        inv.invoice_date,
        inv.total_amount,
        inv.advance_paid,
        inv.balance_amount
      FROM invoices inv
      JOIN projects p ON inv.project_id = p.project_id
      JOIN customers c ON p.customer_id = c.customer_id
      WHERE inv.balance_amount > 0
      ORDER BY inv.invoice_date DESC, inv.invoice_id DESC
      LIMIT 10;
    `;

    const [
      kpiResult,
      tasksResult,
      paymentsResult,
      invoicesResult,
    ] = await Promise.all([
      db.query(kpiQuery),
      db.query(pendingFinancialTasksQuery),
      db.query(recentPaymentsQuery),
      db.query(outstandingInvoicesQuery),
    ]);

    const kpiRow = kpiResult?.rows?.[0] || {};

    const kpis = {
      pendingBudgetPrepCount: Number(kpiRow.pending_budget_prep_count) || 0,
      quotationsDraftCount: Number(kpiRow.quotations_draft_count) || 0,
      quotationsSentCount: Number(kpiRow.quotations_sent_count) || 0,
      pendingQuotationsCount: Number(kpiRow.pending_quotations_count) || 0,
      totalOutstandingBalance: Number(kpiRow.total_outstanding_balance) || 0,
      unpaidInvoicesCount: Number(kpiRow.unpaid_invoices_count) || 0,
      paymentsReceivedThisMonth: Number(kpiRow.payments_received_this_month) || 0,
      paymentCountThisMonth: Number(kpiRow.payment_count_this_month) || 0,
    };

    const pendingFinancialTasks = (tasksResult?.rows || []).map((row) => ({
      taskId: row.task_id,
      taskType: row.task_type,
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      customerName: row.customer_name,
      description: row.description,
      actionLabel: row.action_label,
      priorityDate: row.priority_date,
    }));

    const recentPayments = (paymentsResult?.rows || []).map((row) => ({
      paymentId: Number(row.payment_id),
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      customerName: row.customer_name,
      amount: Number(row.amount) || 0,
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      referenceNumber: row.reference_number || null,
      paymentDate: row.payment_date,
    }));

    const outstandingInvoices = (invoicesResult?.rows || []).map((row) => ({
      invoiceId: Number(row.invoice_id),
      invoiceNumber: row.invoice_number,
      projectId: Number(row.project_id),
      projectCode: row.project_code,
      projectName: row.project_name,
      customerName: row.customer_name,
      invoiceDate: row.invoice_date,
      totalAmount: Number(row.total_amount) || 0,
      advancePaid: Number(row.advance_paid) || 0,
      balanceAmount: Number(row.balance_amount) || 0,
    }));

    return {
      kpis,
      pendingFinancialTasks,
      recentPayments,
      outstandingInvoices,
    };
  } catch (error) {
    throw new Error('Failed to retrieve accounts dashboard data');
  }
}

module.exports = {
  getOwnerDashboardData,
  getPmDashboardData,
  getAccountsDashboardData,
};
