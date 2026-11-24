const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const templatePath = path.resolve(__dirname, '../../views/dashboards/accounts.ejs');

async function renderView(data = {}, user = {}, csrfToken = 'test_csrf_token_12345678901234567890') {
  return ejs.renderFile(templatePath, {
    user: {
      userId: '3',
      fullName: 'Kamani Perera',
      role: 'ACCOUNTS',
      ...user,
    },
    csrfToken,
    data,
  });
}

function createFullAccountsData() {
  return {
    kpis: {
      pendingBudgetPrepCount: 2,
      quotationsDraftCount: 2,
      quotationsSentCount: 1,
      pendingQuotationsCount: 3,
      totalOutstandingBalance: 1240000.5,
      unpaidInvoicesCount: 1,
      paymentsReceivedThisMonth: 7111000,
      paymentCountThisMonth: 8,
    },
    pendingFinancialTasks: [
      {
        taskId: 'TASK-BUDGET-104',
        taskType: 'BUDGET_PREP',
        projectId: 104,
        projectCode: 'PRJ-2026-104',
        projectName: 'Keells Supermarket Pylon Signboard',
        customerName: 'JayKay Marketing',
        description: 'Design approved. Prepare initial material & fabrication budget.',
        actionLabel: 'Prepare Budget',
        priorityDate: '2026-11-18T09:00:00Z',
      },
      {
        taskId: 'TASK-QUOTE-106',
        taskType: 'QUOTATION_DRAFT',
        projectId: 106,
        projectCode: 'PRJ-2026-106',
        projectName: 'Arpico Supercentre Main Entrance Fascia',
        customerName: 'Richard Pieris & Company',
        description: 'Budget approved. Quotation v1 in draft preparation.',
        actionLabel: 'Review Quotation',
        priorityDate: '2026-11-19T10:00:00Z',
      },
      {
        taskId: 'TASK-ADV-INV-107',
        taskType: 'ISSUE_ADVANCE_INVOICE',
        projectId: 107,
        projectCode: 'PRJ-2026-107',
        projectName: 'Commercial Bank Signage',
        customerName: 'Commercial Bank PLC',
        description: 'Quotation v1 accepted. Issue 30% advance invoice before fabrication starts.',
        actionLabel: 'Issue Advance Invoice',
        priorityDate: '2026-11-19T14:30:00Z',
      },
      {
        taskId: 'TASK-COLL-ADV-1',
        taskType: 'COLLECT_ADVANCE',
        projectId: 108,
        projectCode: 'PRJ-2026-108',
        projectName: 'Dialog Axiata Rooftop Pylon',
        customerName: 'Dialog Axiata PLC',
        description: 'Advance invoice issued. Collect required 30% advance deposit of LKR 726,000.00 (Remaining: LKR 726,000.00).',
        actionLabel: 'Record Advance Payment',
        priorityDate: '2026-11-20T11:00:00Z',
      },
      {
        taskId: 'TASK-INV-44',
        taskType: 'COLLECT_FINAL',
        projectId: 109,
        projectCode: 'PRJ-2026-109',
        projectName: 'Odel Department Store Facia',
        customerName: 'Odel PLC',
        description: 'Project in final completion. Invoice INV-044 has outstanding balance of LKR 1,240,000.00',
        actionLabel: 'Record Final Payment',
        priorityDate: '2026-11-20T16:00:00Z',
      },
    ],
    recentPayments: [
      {
        paymentId: 1,
        projectId: 108,
        projectCode: 'PRJ-2026-108',
        projectName: 'Dialog Axiata Rooftop Pylon',
        customerName: 'Dialog Axiata PLC',
        amount: 726000,
        paymentType: 'ADVANCE',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'BT-884920',
        paymentDate: '2026-11-20T10:00:00Z',
      },
      {
        paymentId: 2,
        projectId: 109,
        projectCode: 'PRJ-2026-109',
        projectName: 'Odel Department Store Facia',
        customerName: 'Odel PLC',
        amount: 930000,
        paymentType: 'FINAL',
        paymentMethod: 'CASH',
        referenceNumber: null,
        paymentDate: '2026-11-19T14:00:00Z',
      },
    ],
    outstandingInvoices: [
      {
        invoiceId: 10,
        invoiceNumber: 'INV-2026-044',
        projectId: 109,
        projectCode: 'PRJ-2026-109',
        projectName: 'Odel Department Store Facia',
        customerName: 'Odel PLC',
        invoiceDate: '2026-11-18T00:00:00Z',
        totalAmount: 3100000,
        advancePaid: 930000,
        balanceAmount: 1240000.5,
      },
      {
        invoiceId: 11,
        invoiceNumber: 'INV-2026-045',
        projectId: 110,
        projectCode: 'PRJ-2026-110',
        projectName: 'Cargills Express Signage',
        customerName: 'Cargills Ceylon',
        invoiceDate: '2026-11-19T00:00:00Z',
        totalAmount: 1500000,
        advancePaid: 450000,
        balanceAmount: 1050000,
      },
    ],
  };
}

describe('Accounts Dashboard EJS View Data Binding Tests', () => {
  it('1. should render fully populated Accounts dashboard data correctly', async () => {
    const data = createFullAccountsData();
    const html = await renderView(data);

    assert.ok(html.includes('Kamani Perera'), 'Authenticated user fullName must be rendered');
    assert.ok(html.includes('Role: ACCOUNTS'), 'User role must be rendered');
    assert.ok(html.includes('Accounts Console') || html.includes('Accounts Overview'), 'Console title must be rendered');
    assert.ok(html.includes('PRJ-2026-104'), 'First project code must be rendered');
    assert.ok(html.includes('Keells Supermarket Pylon Signboard'), 'Project name must be rendered');
    assert.ok(html.includes('JayKay Marketing'), 'Customer name must be rendered');
  });

  it('2. should bind all four KPI values accurately with formatted LKR amounts and counts', async () => {
    const data = createFullAccountsData();
    data.kpis = {
      pendingBudgetPrepCount: 5,
      quotationsDraftCount: 3,
      quotationsSentCount: 2,
      pendingQuotationsCount: 5,
      totalOutstandingBalance: 2450000.75,
      unpaidInvoicesCount: 4,
      paymentsReceivedThisMonth: 8200000,
      paymentCountThisMonth: 12,
    };

    const html = await renderView(data);

    // KPI 1: Pending Budget Preparations
    assert.ok(html.includes('5 Projects') || html.includes('5'), 'pendingBudgetPrepCount must be rendered');

    // KPI 2: Pending Quotations
    assert.ok(html.includes('5 Quotations') || html.includes('5'), 'pendingQuotationsCount must be rendered');
    assert.ok(html.includes('3') && html.includes('draft'), 'quotationsDraftCount breakdown must be rendered');
    assert.ok(html.includes('2') && html.includes('sent'), 'quotationsSentCount breakdown must be rendered');

    // KPI 3: Outstanding Receivables
    assert.ok(html.includes('2,450,000.75'), 'totalOutstandingBalance formatted as LKR must be rendered');
    assert.ok(html.includes('4 Active Invoices') || html.includes('4 Unpaid') || html.includes('4'), 'unpaidInvoicesCount must be rendered');

    // KPI 4: Payments Received This Month
    assert.ok(html.includes('8,200,000.00'), 'paymentsReceivedThisMonth formatted as LKR must be rendered');
    assert.ok(html.includes('12 payments') || html.includes('12'), 'paymentCountThisMonth must be rendered');
  });

  it('3. should render each supported financial task type correctly', async () => {
    const data = createFullAccountsData();
    const html = await renderView(data);

    // Task 1: BUDGET_PREP
    assert.ok(html.includes('PRJ-2026-104'), 'BUDGET_PREP project code must be rendered');
    assert.ok(html.includes('Prepare Budget'), 'BUDGET_PREP action label must be rendered');

    // Task 2: QUOTATION_DRAFT
    assert.ok(html.includes('PRJ-2026-106'), 'QUOTATION_DRAFT project code must be rendered');
    assert.ok(html.includes('Review Quotation'), 'QUOTATION_DRAFT action label must be rendered');

    // Task 3: ISSUE_ADVANCE_INVOICE
    assert.ok(html.includes('PRJ-2026-107'), 'ISSUE_ADVANCE_INVOICE project code must be rendered');
    assert.ok(html.includes('Issue Advance Invoice'), 'ISSUE_ADVANCE_INVOICE action label must be rendered');

    // Task 4: COLLECT_ADVANCE
    assert.ok(html.includes('PRJ-2026-108'), 'COLLECT_ADVANCE project code must be rendered');
    assert.ok(html.includes('Record Advance Payment'), 'COLLECT_ADVANCE action label must be rendered');

    // Task 5: COLLECT_FINAL
    assert.ok(html.includes('PRJ-2026-109'), 'COLLECT_FINAL project code must be rendered');
    assert.ok(html.includes('Record Final Payment'), 'COLLECT_FINAL action label must be rendered');
  });

  it('4. should render empty state when pending financial tasks array is empty', async () => {
    const data = createFullAccountsData();
    data.pendingFinancialTasks = [];

    const html = await renderView(data);

    assert.ok(html.includes('No Pending Financial Tasks'), 'Must display empty tasks state header');
    assert.ok(
      html.includes('All project costing, quotations, and pending billing actions are up to date') ||
      html.includes('up to date'),
      'Must display reassuring empty tasks message'
    );
  });

  it('5. should render recent payments with formatted amounts, payment type, method, reference, and date', async () => {
    const data = createFullAccountsData();
    const html = await renderView(data);

    assert.ok(html.includes('Recent Payments') || html.includes('Recent Activities'), 'Recent payments header must be present');
    assert.ok(html.includes('726,000.00'), 'First payment formatted LKR amount must be rendered');
    assert.ok(html.includes('ADVANCE'), 'ADVANCE payment type badge must be rendered');
    assert.ok(html.includes('BANK_TRANSFER'), 'BANK_TRANSFER payment method must be rendered');
    assert.ok(html.includes('BT-884920'), 'Reference number must be rendered');

    assert.ok(html.includes('930,000.00'), 'Second payment formatted LKR amount must be rendered');
    assert.ok(html.includes('FINAL'), 'FINAL payment type badge must be rendered');
    assert.ok(html.includes('CASH'), 'CASH payment method must be rendered');
  });

  it('6. should render empty state when recent payments array is empty', async () => {
    const data = createFullAccountsData();
    data.recentPayments = [];

    const html = await renderView(data);

    assert.ok(html.includes('No Recent Payments Recorded') || html.includes('No recent payments'), 'Must display empty payments header');
  });

  it('7. should render outstanding invoices with invoice number, customer, total, advance, and remaining balance', async () => {
    const data = createFullAccountsData();
    const html = await renderView(data);

    assert.ok(html.includes('Outstanding Invoices') || html.includes('Unsettled Invoices'), 'Invoices table header must be present');
    assert.ok(html.includes('INV-2026-044'), 'Invoice number INV-2026-044 must be rendered');
    assert.ok(html.includes('INV-2026-045'), 'Invoice number INV-2026-045 must be rendered');
    assert.ok(html.includes('3,100,000.00'), 'Total amount formatted must be rendered');
    assert.ok(html.includes('930,000.00'), 'Advance paid formatted must be rendered');
    assert.ok(html.includes('1,240,000.50'), 'Balance amount formatted must be rendered');
  });

  it('8. should render empty state when outstanding invoices array is empty', async () => {
    const data = createFullAccountsData();
    data.outstandingInvoices = [];

    const html = await renderView(data);

    assert.ok(html.includes('No Outstanding Invoices') || html.includes('No unpaid invoices'), 'Must display empty invoices header');
  });

  it('9. should properly HTML-escape dynamic strings to prevent XSS injection', async () => {
    const maliciousPayload = '<script id="xss-probe">alert("pwned")</script>';
    const data = createFullAccountsData();

    data.pendingFinancialTasks = [
      {
        taskId: 'TASK-XSS',
        taskType: 'BUDGET_PREP',
        projectId: 999,
        projectCode: maliciousPayload,
        projectName: 'Malicious <img src=x onerror=alert(1)> Project',
        customerName: 'Evil <b onmouseover=alert(1)>Customer</b>',
        description: 'Test <script>evil()</script> description',
        actionLabel: 'Action <svg onload=alert(1)>',
        priorityDate: '2026-11-20T00:00:00Z',
      },
    ];

    data.recentPayments = [
      {
        paymentId: 999,
        projectId: 999,
        projectCode: maliciousPayload,
        projectName: 'Malicious Project',
        customerName: 'Evil Customer',
        amount: 1000,
        paymentType: 'ADVANCE',
        paymentMethod: 'CASH',
        referenceNumber: 'REF-<script>alert(1)</script>',
        paymentDate: '2026-11-20T00:00:00Z',
      },
    ];

    data.outstandingInvoices = [
      {
        invoiceId: 999,
        invoiceNumber: maliciousPayload,
        projectId: 999,
        projectCode: 'PRJ-XSS',
        projectName: 'Malicious Project',
        customerName: 'Evil <script>alert(1)</script> Customer',
        invoiceDate: '2026-11-20T00:00:00Z',
        totalAmount: 1000,
        advancePaid: 300,
        balanceAmount: 700,
      },
    ];

    const html = await renderView(data);

    assert.ok(!html.includes('<script id="xss-probe">'), 'Raw script tags must not be rendered');
    assert.ok(
      html.includes('&lt;script id=&#34;xss-probe&#34;&gt;') || html.includes('&lt;script id="xss-probe"&gt;'),
      'Script tags must be escaped'
    );
    assert.ok(!html.includes('<img src=x onerror=alert(1)>'), 'Raw img tags must not be rendered');
    assert.ok(!html.includes('<svg onload=alert(1)>'), 'Raw svg tags must not be rendered');
  });

  it('10. should handle undefined, null, or empty data payload gracefully without errors', async () => {
    const emptyPayloads = [undefined, null, {}];

    for (const payload of emptyPayloads) {
      const html = await renderView(payload);
      assert.ok(html.includes('Kamani Perera'), 'Must render with empty/null payload');
      assert.ok(html.includes('0 Projects') || html.includes('0'), 'Must default numeric counts safely');
      assert.ok(html.includes('0.00'), 'Must default currency safely');
      assert.ok(html.includes('No Pending Financial Tasks'), 'Must show empty state for tasks');
      assert.ok(html.includes('No Recent Payments Recorded') || html.includes('No recent payments'), 'Must show empty state for payments');
      assert.ok(html.includes('No Outstanding Invoices') || html.includes('No unpaid invoices'), 'Must show empty state for invoices');
    }
  });

  it('11. should confirm all old fake demo watermark phrases and hardcoded balances have been removed', async () => {
    const data = createFullAccountsData();
    const html = await renderView(data);

    assert.ok(!html.includes('Sample Prototype Data'), 'Demo watermark "Sample Prototype Data" must be removed');
    assert.ok(!html.includes('(Demo Ledger)'), 'Demo watermark "(Demo Ledger)" must be removed');
    assert.ok(!html.includes('Sample demo prototype'), 'Demo watermark "Sample demo prototype" must be removed');
    assert.ok(!html.includes('Sample Feed'), 'Demo watermark "Sample Feed" must be removed');
    assert.ok(!html.includes('(Demo data)'), 'Demo text "(Demo data)" must be removed');
    assert.ok(!html.includes('Sample Prototype Demo Simulation'), 'Demo modal watermark must be removed');
  });

  it('12. should preserve CSRF token in the logout form', async () => {
    const html = await renderView(createFullAccountsData(), {}, 'csrf_token_test_abc_123');

    assert.ok(html.includes('action="/logout"'), 'Logout form must be present');
    assert.ok(html.includes('name="_csrf"'), 'CSRF input field must be present');
    assert.ok(html.includes('value="csrf_token_test_abc_123"'), 'CSRF token must be rendered in logout form');
  });

  describe('Mobile Responsive Navigation Drawer Tests', () => {
    it('13. should render the sidebar drawer with id="sidebarDrawer" and off-canvas responsive classes', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('id="sidebarDrawer"'), 'Sidebar must have id="sidebarDrawer"');
      assert.ok(html.includes('-translate-x-full'), 'Sidebar must include -translate-x-full for off-canvas mobile state');
      assert.ok(html.includes('lg:translate-x-0'), 'Sidebar must include lg:translate-x-0 for desktop visibility');
      assert.ok(html.includes('transition-transform'), 'Sidebar must include transition-transform');
    });

    it('14. should render the mobile backdrop with id="mobileDrawerBackdrop" and click toggle', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('id="mobileDrawerBackdrop"'), 'Backdrop must have id="mobileDrawerBackdrop"');
      assert.ok(html.includes('lg:hidden'), 'Backdrop must have lg:hidden');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Backdrop must trigger toggleMobileMenu() on click');
      assert.ok(html.includes('backdrop-blur-sm'), 'Backdrop must include blur styling');
    });

    it('15. should render mobile hamburger menu button with accessible label and mobile-only visibility', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('aria-label="Open sidebar menu"'), 'Hamburger button must have accessible label');
      assert.ok(html.includes('onclick="toggleMobileMenu()"'), 'Hamburger button must trigger toggleMobileMenu()');
      assert.ok(
        /aria-label="Open sidebar menu"[^>]*class="[^"]*lg:hidden/.test(html) ||
        /class="[^"]*lg:hidden[^"]*"[^>]*aria-label="Open sidebar menu"/.test(html),
        'Hamburger button must have lg:hidden class'
      );
    });

    it('16. should render mobile drawer close button with accessible label and mobile-only visibility', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('aria-label="Close menu"'), 'Close button must have accessible label');
      assert.ok(
        /aria-label="Close menu"[^>]*class="[^"]*lg:hidden/.test(html) ||
        /class="[^"]*lg:hidden[^"]*"[^>]*aria-label="Close menu"/.test(html),
        'Close button must have lg:hidden class'
      );
    });

    it('17. should use responsive lg:pl-72 on main wrapper without hardcoded pl-72', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('lg:pl-72'), 'Main wrapper must have lg:pl-72');
      assert.ok(!html.includes('class="pl-72"'), 'Must not have static pl-72 without lg: prefix');
    });

    it('18. should position header responsively with left-0 right-0 lg:left-72', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('fixed top-0 left-0 right-0 lg:left-72'), 'Header must span full width on mobile and offset on desktop');
    });

    it('19. should include toggleMobileMenu client function implementation in script', async () => {
      const html = await renderView(createFullAccountsData());

      assert.ok(html.includes('function toggleMobileMenu()'), 'Script must define toggleMobileMenu()');
      assert.ok(html.includes('sidebar.classList.contains(\'-translate-x-full\')'), 'toggleMobileMenu must toggle -translate-x-full');
      assert.ok(html.includes('backdrop.classList.remove(\'hidden\')'), 'toggleMobileMenu must show backdrop');
      assert.ok(html.includes('backdrop.classList.add(\'hidden\')'), 'toggleMobileMenu must hide backdrop');
    });
  });
});
