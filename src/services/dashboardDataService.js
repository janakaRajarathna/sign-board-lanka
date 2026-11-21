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

module.exports = {
  getOwnerDashboardData,
};
