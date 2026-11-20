// State management for sample/demo budgets
    let currentStatusFilter = 'ALL';
    let editingBudgetId = null;

    // Default sample budgets aligned with Sign Board Lanka ERP state
    let budgets = [
      {
        budgetNo: 'BDG-2026-104',
        projectId: 'PRJ-2026-104',
        projectName: 'Keells Supermarket Pylon Signboard',
        clientName: 'JayKay Marketing Services (Pvt) Ltd',
        designVersion: 'DSN-104-v2 (Approved)',
        budgetVersion: 'v1.0',
        totalAmount: 2280000,
        createdDate: '18 Nov 2026',
        status: 'DRAFT',
        preparedBy: 'Finance Officer (Accounts Desk)',
        submittedDate: null,
        approvalDetails: null,
        notes: 'Includes high-grade outdoor anti-rust powder coating and LED power modules for 24/7 illumination.',
        items: [
          { desc: 'Structural GI Box Bar Framework (100x50mm)', category: 'Materials', qty: 24, unit: 'Lengths', unitCost: 18500, total: 444000 },
          { desc: 'Outdoor 3mm Aluminium Composite Cladding (Keells Green)', category: 'Materials', qty: 32, unit: 'Sheets', unitCost: 14500, total: 464000 },
          { desc: 'IP67 Samsung LED Backlit Modules & Meanwell Drivers', category: 'Materials', qty: 140, unit: 'Sets', unitCost: 3200, total: 448000 },
          { desc: 'Framework TIG Welding, CNC Routing & Assembly Labour', category: 'Labour', qty: 85, unit: 'Hours', unitCost: 3500, total: 297500 },
          { desc: 'Boom Truck Crane Transportation to Wattala Site', category: 'Transportation', qty: 2, unit: 'Trips', unitCost: 65000, total: 130000 },
          { desc: 'On-site Concrete Footing Anchor & Rigging Labour', category: 'Installation', qty: 45, unit: 'Hours', unitCost: 3800, total: 171000 },
          { desc: 'Hardware, Fasteners, Structural Sealant & Primer', category: 'Other Costs', qty: 1, unit: 'Lot', unitCost: 325500, total: 325500 }
        ],
        versionHistory: []
      },
      {
        budgetNo: 'BDG-2026-106',
        projectId: 'PRJ-2026-106',
        projectName: 'Arpico Supercentre Main Entrance Fascia',
        clientName: 'Richard Pieris & Company PLC',
        designVersion: 'DSN-106-v1 (Approved)',
        budgetVersion: 'v1.0',
        totalAmount: 1480000,
        createdDate: '17 Nov 2026',
        status: 'DRAFT',
        preparedBy: 'Finance Officer (Accounts Desk)',
        submittedDate: null,
        approvalDetails: null,
        notes: 'Custom 3D acrylic letters with internal illumination for front canopy fascia.',
        items: [
          { desc: '3D Cast Acrylic Face (Red & White Arpico Specs)', category: 'Materials', qty: 18, unit: 'Sheets', unitCost: 22000, total: 396000 },
          { desc: 'Internal LED Strips & Waterproof Transformers', category: 'Materials', qty: 75, unit: 'Metres', unitCost: 4200, total: 315000 },
          { desc: 'Precision Laser Cutting & Edge Polishing Labour', category: 'Labour', qty: 60, unit: 'Hours', unitCost: 4000, total: 240000 },
          { desc: 'Site Scaffolding & Night Installation Labour', category: 'Installation', qty: 40, unit: 'Hours', unitCost: 4500, total: 180000 },
          { desc: 'Flatbed Lorry Delivery to Hyde Park Corner', category: 'Transportation', qty: 1, unit: 'Trip', unitCost: 45000, total: 45000 },
          { desc: 'Weatherproof Silicone, Wiring & Fasteners Lot', category: 'Other Costs', qty: 1, unit: 'Lot', unitCost: 304000, total: 304000 }
        ],
        versionHistory: []
      },
      {
        budgetNo: 'BDG-2026-101',
        projectId: 'PRJ-2026-101',
        projectName: 'Seylan Bank City Branch Wayfinding Totems',
        clientName: 'Seylan Bank PLC',
        designVersion: 'DSN-101-v3 (Approved)',
        budgetVersion: 'v1.0',
        totalAmount: 1150000,
        createdDate: '16 Nov 2026',
        status: 'PENDING APPROVAL',
        preparedBy: 'Finance Officer (Accounts Desk)',
        submittedDate: '16 Nov 2026, 04:30 PM',
        approvalDetails: null,
        notes: 'Submitted for Owner sign-off. Material costs verified against steel supplier quotation.',
        items: [
          { desc: 'Brushed Stainless Steel 304 Grade Totem Cladding', category: 'Materials', qty: 12, unit: 'Sheets', unitCost: 38000, total: 456000 },
          { desc: 'Vinyl Graphics & Protective Polycarbonate Overlays', category: 'Materials', qty: 6, unit: 'Sets', unitCost: 24000, total: 144000 },
          { desc: 'Metal Fabrication & Precision Deburring Labour', category: 'Labour', qty: 50, unit: 'Hours', unitCost: 3600, total: 180000 },
          { desc: 'Installation & Floor Anchoring at Kollupitiya', category: 'Installation', qty: 30, unit: 'Hours', unitCost: 4200, total: 126000 },
          { desc: 'Delivery via Dedicated Transport Vehicle', category: 'Transportation', qty: 1, unit: 'Trip', unitCost: 40000, total: 40000 },
          { desc: 'Electrical Connectors, Earthing & Base Plates', category: 'Other Costs', qty: 1, unit: 'Lot', unitCost: 204000, total: 204000 }
        ],
        versionHistory: []
      },
      {
        budgetNo: 'BDG-2026-095',
        projectId: 'PRJ-2026-095',
        projectName: 'HNB Towers Backlit Monolith',
        clientName: 'Hatton National Bank PLC',
        designVersion: 'DSN-095-v2 (Approved)',
        budgetVersion: 'v1.0',
        totalAmount: 1850000,
        createdDate: '12 Nov 2026',
        status: 'APPROVED',
        preparedBy: 'Finance Officer (Accounts Desk)',
        submittedDate: '13 Nov 2026, 11:00 AM',
        approvalDetails: {
          approvedBy: 'Priyantha De Silva (Owner)',
          approvalDate: '17 Nov 2026, 04:30 PM',
          notes: 'Approved without amendments. Proceed directly to Quotation preparation.'
        },
        notes: 'Approved budget. Corresponding Quotation Q-2026-081 created for LKR 2,150,000.',
        items: [
          { desc: 'Structural RHS Steel Column Frames (Grade A)', category: 'Materials', qty: 18, unit: 'Lengths', unitCost: 28000, total: 504000 },
          { desc: 'UV Resistant Backlit Flexface & Tensioners', category: 'Materials', qty: 1, unit: 'Lot', unitCost: 380000, total: 380000 },
          { desc: 'Osram Optotronic LED Drivers & Signage Modules', category: 'Materials', qty: 80, unit: 'Sets', unitCost: 4500, total: 360000 },
          { desc: 'Heavy Engineering Fabrication & Rigging Labour', category: 'Labour', qty: 70, unit: 'Hours', unitCost: 4200, total: 294000 },
          { desc: 'Transport with Police Escort Permit for Night Moves', category: 'Transportation', qty: 1, unit: 'Trip', unitCost: 85000, total: 85000 },
          { desc: 'Site Rigging & Mobile Crane Installation', category: 'Installation', qty: 1, unit: 'Lot', unitCost: 150000, total: 150000 },
          { desc: 'Anchor Bolts, Foundation Ties & Misc Hardware', category: 'Other Costs', qty: 1, unit: 'Lot', unitCost: 77000, total: 77000 }
        ],
        versionHistory: []
      },
      {
        budgetNo: 'BDG-2026-089',
        projectId: 'PRJ-2026-089',
        projectName: 'Dialog Axiata 3D Acrylic Rooftop Pylon',
        clientName: 'Dialog Axiata PLC',
        designVersion: 'DSN-089-v1 (Approved)',
        budgetVersion: 'v1.0',
        totalAmount: 2050000,
        createdDate: '05 Nov 2026',
        status: 'APPROVED',
        preparedBy: 'Finance Officer (Accounts Desk)',
        submittedDate: '06 Nov 2026, 02:15 PM',
        approvalDetails: {
          approvedBy: 'Priyantha De Silva (Owner)',
          approvalDate: '08 Nov 2026, 09:30 AM',
          notes: 'Costing authorized. Advance received 30% on client acceptance.'
        },
        notes: 'Quotation Q-2026-075 accepted at LKR 2,420,000 with 30% advance recorded.',
        items: [
          { desc: 'Heavy Galvanized Structural Steel Trusses', category: 'Materials', qty: 30, unit: 'Lengths', unitCost: 26000, total: 780000 },
          { desc: 'Custom CNC Cut Acrylic Letters with Dialog Brand Red', category: 'Materials', qty: 1, unit: 'Lot', unitCost: 450000, total: 450000 },
          { desc: 'High Luminance Waterproof LED Sign Systems', category: 'Materials', qty: 100, unit: 'Sets', unitCost: 3500, total: 350000 },
          { desc: 'Structural Engineering & Welding Labour', category: 'Labour', qty: 65, unit: 'Hours', unitCost: 4000, total: 260000 },
          { desc: 'Rooftop Winch Transport & Night Highway Delivery', category: 'Transportation', qty: 1, unit: 'Trip', unitCost: 75000, total: 75000 },
          { desc: 'Rooftop Rigging & Certified Safety Net Installation', category: 'Installation', qty: 1, unit: 'Lot', unitCost: 135000, total: 135000 }
        ],
        versionHistory: []
      }
    ];

    // Eligible projects map for new budget preparation
    const eligibleProjects = {
      'PRJ-2026-104': {
        name: 'Keells Supermarket Pylon Signboard',
        client: 'JayKay Marketing Services (Pvt) Ltd',
        designVersion: 'DSN-104-v2 (Approved by Client)',
        defaultNotes: 'Initial budget drafted for Keells Supermarket Wattala site.'
      },
      'PRJ-2026-106': {
        name: 'Arpico Supercentre Main Entrance Fascia',
        client: 'Richard Pieris & Company PLC',
        designVersion: 'DSN-106-v1 (Approved by Client)',
        defaultNotes: 'Entrance fascia costing aligned with Arpico corporate architectural guidelines.'
      },
      'PRJ-2026-110': {
        name: 'John Keells Wayfinding Signs',
        client: 'John Keells Holdings PLC',
        designVersion: 'DSN-110-v1 (Approved by Client)',
        defaultNotes: 'Wayfinding monoliths and directional signage for Cinnamon Life precinct.'
      }
    };

    // Render Table
    function renderBudgetsTable(budgetList) {
      const tbody = document.getElementById('budgetTableBody');
      tbody.innerHTML = '';

      if (budgetList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-8 text-slate-500">
              <div class="flex flex-col items-center justify-center space-y-2">
                <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div class="text-xs font-medium">No budgets match your current filter or search criteria</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      budgetList.forEach(b => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-[#18233c] transition-colors';

        // Badge styling based on status
        let statusBadge = '';
        if (b.status === 'DRAFT') {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/40 text-amber-300 border border-amber-600/30">DRAFT</span>';
        } else if (b.status === 'PENDING APPROVAL') {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/30">PENDING APPROVAL</span>';
        } else if (b.status === 'APPROVED') {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-600/30">APPROVED</span>';
        } else if (b.status === 'REJECTED') {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950/40 text-rose-300 border border-rose-600/30">REJECTED</span>';
        }

        // Action buttons based on status
        let actionButtons = `
          <button onclick="viewBudgetDetails('${b.budgetNo}')" class="px-2.5 py-1 rounded bg-[#0b1326] hover:bg-[#1f2b45] text-slate-300 hover:text-white border border-[#1f2b45] font-medium transition-colors">
            View
          </button>
        `;

        if (b.status === 'DRAFT') {
          actionButtons = `
            <button onclick="viewBudgetDetails('${b.budgetNo}')" class="px-2 py-1 rounded bg-[#0b1326] hover:bg-[#1f2b45] text-slate-300 hover:text-white border border-[#1f2b45] font-medium transition-colors">
              View
            </button>
            <button onclick="editDraftBudget('${b.budgetNo}')" class="px-2 py-1 rounded bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-600/30 font-medium transition-colors">
              Edit
            </button>
            <button onclick="submitForOwnerApproval('${b.budgetNo}')" class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors">
              Submit
            </button>
          `;
        } else if (b.status === 'APPROVED') {
          actionButtons = `
            <button onclick="viewBudgetDetails('${b.budgetNo}')" class="px-2.5 py-1 rounded bg-[#0b1326] hover:bg-[#1f2b45] text-slate-300 hover:text-white border border-[#1f2b45] font-medium transition-colors">
              View
            </button>
            <span class="text-[10px] text-emerald-400 font-mono px-1 flex items-center space-x-1" title="Approved budgets are immutable">
              <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <span>Locked</span>
            </span>
          `;
        } else if (b.status === 'REJECTED') {
          actionButtons = `
            <button onclick="viewBudgetDetails('${b.budgetNo}')" class="px-2 py-1 rounded bg-[#0b1326] hover:bg-[#1f2b45] text-slate-300 hover:text-white border border-[#1f2b45] font-medium transition-colors">
              View
            </button>
            <button onclick="createNewVersionFromRejected('${b.budgetNo}')" class="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-600/30 font-medium transition-colors">
              New Ver
            </button>
          `;
        }

        tr.innerHTML = `
          <td class="py-3.5 px-4 font-mono font-semibold text-blue-400">${b.budgetNo}</td>
          <td class="py-3.5 px-4">
            <div class="font-medium text-white">${b.projectName}</div>
            <div class="text-[10px] text-slate-400 font-mono">${b.projectId} &bull; ${b.clientName}</div>
          </td>
          <td class="py-3.5 px-4 font-mono text-[11px] text-slate-300">${b.designVersion}</td>
          <td class="py-3.5 px-4 font-mono text-slate-300">${b.budgetVersion}</td>
          <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
            LKR ${b.totalAmount.toLocaleString()}
          </td>
          <td class="py-3.5 px-4 text-slate-400 text-[11px]">${b.createdDate}</td>
          <td class="py-3.5 px-4 text-center">${statusBadge}</td>
          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              ${actionButtons}
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      });
    }

    // Filter and search handling
    function filterBudgets() {
      const searchStr = document.getElementById('globalSearchInput').value.toLowerCase().trim();
      const sortBy = document.getElementById('sortBySelect').value;

      let filtered = budgets.filter(b => {
        const matchesStatus = (currentStatusFilter === 'ALL' || b.status === currentStatusFilter);
        const matchesSearch = (
          b.budgetNo.toLowerCase().includes(searchStr) ||
          b.projectId.toLowerCase().includes(searchStr) ||
          b.projectName.toLowerCase().includes(searchStr) ||
          b.clientName.toLowerCase().includes(searchStr)
        );
        return matchesStatus && matchesSearch;
      });

      // Sorting
      if (sortBy === 'date-desc') {
        // preserve current array order (newest first)
      } else if (sortBy === 'amount-desc') {
        filtered.sort((a, b) => b.totalAmount - a.totalAmount);
      } else if (sortBy === 'amount-asc') {
        filtered.sort((a, b) => a.totalAmount - b.totalAmount);
      } else if (sortBy === 'id-asc') {
        filtered.sort((a, b) => a.budgetNo.localeCompare(b.budgetNo));
      }

      renderBudgetsTable(filtered);
      updateKpis();

      document.getElementById('tableFilterCount').textContent = `Showing ${filtered.length} of ${budgets.length} budgets`;
    }

    function setStatusFilter(status) {
      currentStatusFilter = status;
      const buttons = ['ALL', 'DRAFT', 'PENDING APPROVAL', 'APPROVED'];

      buttons.forEach(st => {
        const key = st === 'PENDING APPROVAL' ? 'PENDING' : st;
        const btn = document.getElementById(`filterBtn${key}`);
        if (btn) {
          if (st === status) {
            btn.className = 'px-3 py-1.5 rounded-md font-medium text-white bg-blue-700 shadow transition-colors';
          } else {
            btn.className = 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-white transition-colors';
          }
        }
      });

      filterBudgets();
    }

    function updateKpis() {
      const total = budgets.length;
      const draft = budgets.filter(b => b.status === 'DRAFT').length;
      const pending = budgets.filter(b => b.status === 'PENDING APPROVAL').length;
      const approved = budgets.filter(b => b.status === 'APPROVED').length;

      document.getElementById('kpiTotalBudgets').textContent = `${total} Budgets`;
      document.getElementById('kpiDraftBudgets').textContent = `${draft} Budgets`;
      document.getElementById('kpiPendingBudgets').textContent = `${pending} Budget${pending === 1 ? '' : 's'}`;
      document.getElementById('kpiApprovedBudgets').textContent = `${approved} Budgets`;

      document.getElementById('countAll').textContent = total;
      document.getElementById('countDraft').textContent = draft;
      document.getElementById('countPending').textContent = pending;
      document.getElementById('countApproved').textContent = approved;
    }

    // View Modal
    function viewBudgetDetails(budgetNo) {
      const b = budgets.find(item => item.budgetNo === budgetNo);
      if (!b) return;

      document.getElementById('viewModalTitle').textContent = `Budget ${b.budgetNo}`;
      document.getElementById('viewModalSubtitle').textContent = `${b.projectName} (${b.clientName})`;

      // Status Badge
      const badge = document.getElementById('viewModalStatusBadge');
      if (b.status === 'DRAFT') {
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/40 text-amber-300 border border-amber-600/30';
        badge.textContent = 'DRAFT (EDITABLE)';
      } else if (b.status === 'PENDING APPROVAL') {
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/30';
        badge.textContent = 'PENDING OWNER APPROVAL';
      } else if (b.status === 'APPROVED') {
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-600/30';
        badge.textContent = 'APPROVED & IMMUTABLE';
      } else if (b.status === 'REJECTED') {
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950/40 text-rose-300 border border-rose-600/30';
        badge.textContent = 'REJECTED BY OWNER';
      }

      // Fields
      document.getElementById('viewFieldProject').textContent = b.projectName;
      document.getElementById('viewFieldClient').textContent = `${b.projectId} - ${b.clientName}`;
      document.getElementById('viewFieldDesignVer').textContent = b.designVersion;
      document.getElementById('viewFieldBudgetVer').textContent = b.budgetVersion;
      document.getElementById('viewFieldDate').textContent = `Created: ${b.createdDate}`;
      document.getElementById('viewFieldPreparedBy').textContent = b.preparedBy;
      document.getElementById('viewNotes').textContent = b.notes || 'No special costing notes recorded.';

      // Approval Workflow Panel
      const panel = document.getElementById('viewApprovalPanel');
      if (b.status === 'APPROVED' && b.approvalDetails) {
        panel.className = 'p-4 rounded-lg border border-emerald-600/40 bg-emerald-950/20 text-slate-200';
        panel.innerHTML = `
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span class="font-bold text-emerald-300 text-xs uppercase tracking-wider">Owner Approval Verified</span>
                <span class="text-[10px] font-mono text-emerald-400">Immutable State</span>
              </div>
              <div class="text-xs text-slate-300">
                Authorized By: <strong class="text-white">${b.approvalDetails.approvedBy}</strong> on ${b.approvalDetails.approvalDate}
              </div>
              <div class="text-[11px] text-slate-400 italic">
                "${b.approvalDetails.notes}"
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] bg-emerald-900/60 text-emerald-200 px-2.5 py-1 rounded border border-emerald-500/30 font-mono">
                Locked &amp; Read-Only
              </span>
            </div>
          </div>
        `;
      } else if (b.status === 'PENDING APPROVAL') {
        panel.className = 'p-4 rounded-lg border border-blue-500/40 bg-blue-950/20 text-slate-200';
        panel.innerHTML = `
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span class="font-bold text-blue-300 text-xs uppercase tracking-wider">Awaiting Owner Approval</span>
              </div>
              <div class="text-xs text-slate-300">
                Submitted by Accounts on: <strong>${b.submittedDate || '16 Nov 2026, 04:30 PM'}</strong>
              </div>
              <div class="text-[11px] text-slate-400">
                Only the Owner can authorize this budget. Accounts users cannot approve their own costings.
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] bg-blue-900/40 text-blue-200 px-2.5 py-1 rounded border border-blue-500/30 font-mono">
                Owner Review Queue
              </span>
            </div>
          </div>
        `;
      } else if (b.status === 'REJECTED' && b.approvalDetails) {
        panel.className = 'p-4 rounded-lg border border-rose-500/40 bg-rose-950/20 text-slate-200';
        panel.innerHTML = `
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                <span class="font-bold text-rose-300 text-xs uppercase tracking-wider">Budget Rejected by Owner</span>
              </div>
              <div class="text-xs text-slate-300">
                Reviewed By: <strong class="text-white">${b.approvalDetails.rejectedBy || 'Owner'}</strong> on ${b.approvalDetails.rejectedDate}
              </div>
              <div class="text-[11px] text-rose-300 font-medium">
                Reason: "${b.approvalDetails.rejectionReason}"
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] bg-rose-900/40 text-rose-200 px-2.5 py-1 rounded border border-rose-500/30 font-mono">
                Revision Required
              </span>
            </div>
          </div>
        `;
      } else {
        panel.className = 'p-3 rounded-lg border border-amber-600/30 bg-amber-950/20 text-slate-300';
        panel.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span class="font-bold text-amber-300 text-xs uppercase tracking-wider">Draft Stage</span>
              <span class="text-slate-400 text-xs">&mdash; Editable by Accounts desk before formal submission.</span>
            </div>
            <span class="text-[10px] bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
              Not yet submitted
            </span>
          </div>
        `;
      }

      // Budget Items Table
      const itemsBody = document.getElementById('viewItemsTableBody');
      itemsBody.innerHTML = '';
      document.getElementById('viewItemsCount').textContent = `${b.items.length} items listed`;

      let subtotal = 0;
      b.items.forEach((item, index) => {
        subtotal += item.total;
        const row = document.createElement('tr');
        row.className = 'hover:bg-[#18233c]/60';
        row.innerHTML = `
          <td class="py-2.5 px-3 font-mono text-slate-400">${index + 1}</td>
          <td class="py-2.5 px-3 font-medium text-white">${item.desc}</td>
          <td class="py-2.5 px-3 text-[11px] text-blue-300">${item.category}</td>
          <td class="py-2.5 px-3 text-right font-mono text-slate-200">${item.qty}</td>
          <td class="py-2.5 px-3 text-[11px] text-slate-400">${item.unit}</td>
          <td class="py-2.5 px-3 text-right font-mono text-slate-300">${item.unitCost.toLocaleString()}</td>
          <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-100">${item.total.toLocaleString()}</td>
        `;
        itemsBody.appendChild(row);
      });

      document.getElementById('viewSubtotal').textContent = `LKR ${subtotal.toLocaleString()}`;
      document.getElementById('viewGrandTotal').textContent = `LKR ${subtotal.toLocaleString()}`;

      // Version History Section
      const versionSection = document.getElementById('viewVersionHistorySection');
      const versionList = document.getElementById('viewVersionHistoryList');
      if (b.versionHistory && b.versionHistory.length > 0) {
        versionSection.classList.remove('hidden');
        versionList.innerHTML = '';
        b.versionHistory.forEach(v => {
          const item = document.createElement('div');
          item.className = 'flex items-center justify-between text-xs py-1.5 border-b border-[#1f2b45] text-slate-400';
          item.innerHTML = `
            <span>Version: <strong class="text-white">${v.ver}</strong> (${v.date}) &mdash; ${v.note}</span>
            <span class="font-mono text-slate-300">LKR ${v.total.toLocaleString()}</span>
          `;
          versionList.appendChild(item);
        });
      } else {
        versionSection.classList.add('hidden');
      }

      // Footer Action Buttons
      const actionsDiv = document.getElementById('viewModalActionButtons');
      actionsDiv.innerHTML = '';

      if (b.status === 'DRAFT') {
        actionsDiv.innerHTML = `
          <button onclick="closeViewBudgetModal(); editDraftBudget('${b.budgetNo}')" class="px-3.5 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-600/40 text-xs font-semibold transition-colors">
            Edit Draft
          </button>
          <button onclick="closeViewBudgetModal(); submitForOwnerApproval('${b.budgetNo}')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors">
            Submit for Owner Approval
          </button>
        `;
      } else if (b.status === 'APPROVED') {
        actionsDiv.innerHTML = `
          <button onclick="createQuotationFromApprovedBudget('${b.budgetNo}')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>Proceed to Create Quotation</span>
          </button>
        `;
      } else if (b.status === 'REJECTED') {
        actionsDiv.innerHTML = `
          <button onclick="closeViewBudgetModal(); createNewVersionFromRejected('${b.budgetNo}')" class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors">
            Create New Budget Version
          </button>
        `;
      }

      document.getElementById('viewBudgetModal').classList.remove('hidden');
    }

    function closeViewBudgetModal() {
      document.getElementById('viewBudgetModal').classList.add('hidden');
    }

    // Create / Edit Modal logic
    function openCreateBudgetModal() {
      editingBudgetId = null;
      document.getElementById('formModalTitle').textContent = 'Prepare New Project Budget';
      document.getElementById('formProjectSelect').disabled = false;
      document.getElementById('formProjectSelect').value = '';
      document.getElementById('formDesignVersion').value = '';
      document.getElementById('formDesignSignoffNotice').classList.add('hidden');
      document.getElementById('formBudgetVersion').value = 'v1.0';
      document.getElementById('formNotes').value = '';

      // Initialize with 3 clean rows
      const tbody = document.getElementById('formItemsTableBody');
      tbody.innerHTML = '';
      addBudgetItemRow('Structural Steel Hollow Section', 'Materials', 10, 'Lengths', 18500);
      addBudgetItemRow('Fabrication & TIG Welding Labour', 'Labour', 35, 'Hours', 3500);
      addBudgetItemRow('Transport to Site Location', 'Transportation', 1, 'Trip', 45000);

      recalculateFormTotals();
      document.getElementById('createBudgetModal').classList.remove('hidden');
    }

    function editDraftBudget(budgetNo) {
      const b = budgets.find(item => item.budgetNo === budgetNo);
      if (!b || b.status !== 'DRAFT') {
        showToast('Only DRAFT budgets can be edited.');
        return;
      }

      editingBudgetId = budgetNo;
      document.getElementById('formModalTitle').textContent = `Edit Draft Budget: ${b.budgetNo}`;
      document.getElementById('formProjectSelect').value = b.projectId;
      document.getElementById('formProjectSelect').disabled = true; // Lock project in edit mode
      document.getElementById('formDesignVersion').value = b.designVersion;
      document.getElementById('formDesignSignoffNotice').classList.remove('hidden');
      document.getElementById('formBudgetVersion').value = b.budgetVersion;
      document.getElementById('formNotes').value = b.notes || '';

      const tbody = document.getElementById('formItemsTableBody');
      tbody.innerHTML = '';
      b.items.forEach(item => {
        addBudgetItemRow(item.desc, item.category, item.qty, item.unit, item.unitCost);
      });

      recalculateFormTotals();
      document.getElementById('createBudgetModal').classList.remove('hidden');
    }

    function closeCreateBudgetModal() {
      document.getElementById('createBudgetModal').classList.add('hidden');
    }

    function onProjectSelectChange() {
      const projId = document.getElementById('formProjectSelect').value;
      const designInput = document.getElementById('formDesignVersion');
      const notice = document.getElementById('formDesignSignoffNotice');

      if (projId && eligibleProjects[projId]) {
        designInput.value = eligibleProjects[projId].designVersion;
        notice.classList.remove('hidden');
      } else {
        designInput.value = '';
        notice.classList.add('hidden');
      }
    }

    function addBudgetItemRow(desc = '', category = 'Materials', qty = 1, unit = 'Units', unitCost = 0) {
      const tbody = document.getElementById('formItemsTableBody');
      const tr = document.createElement('tr');
      tr.className = 'item-row hover:bg-[#131b2e] transition-colors';

      tr.innerHTML = `
        <td class="py-2 px-2.5">
          <input type="text" class="row-desc w-full bg-[#131b2e] border border-[#1f2b45] text-xs text-white rounded p-1.5 focus:outline-none focus:border-blue-500" value="${desc}" placeholder="Item description...">
        </td>
        <td class="py-2 px-2.5">
          <select class="row-cat w-full bg-[#131b2e] border border-[#1f2b45] text-xs text-slate-200 rounded p-1.5 focus:outline-none focus:border-blue-500">
            <option value="Materials" ${category === 'Materials' ? 'selected' : ''}>Materials</option>
            <option value="Labour" ${category === 'Labour' ? 'selected' : ''}>Labour</option>
            <option value="Transportation" ${category === 'Transportation' ? 'selected' : ''}>Transportation</option>
            <option value="Installation" ${category === 'Installation' ? 'selected' : ''}>Installation</option>
            <option value="Other Costs" ${category === 'Other Costs' ? 'selected' : ''}>Other Costs</option>
          </select>
        </td>
        <td class="py-2 px-2.5">
          <input type="number" min="1" step="1" oninput="recalculateFormTotals()" class="row-qty w-full bg-[#131b2e] border border-[#1f2b45] text-xs font-mono text-right text-white rounded p-1.5 focus:outline-none focus:border-blue-500" value="${qty}">
        </td>
        <td class="py-2 px-2.5">
          <input type="text" class="row-unit w-full bg-[#131b2e] border border-[#1f2b45] text-xs text-slate-300 rounded p-1.5 focus:outline-none focus:border-blue-500" value="${unit}" placeholder="Lengths, Sheets, etc.">
        </td>
        <td class="py-2 px-2.5">
          <input type="number" min="0" step="100" oninput="recalculateFormTotals()" class="row-cost w-full bg-[#131b2e] border border-[#1f2b45] text-xs font-mono text-right text-white rounded p-1.5 focus:outline-none focus:border-blue-500" value="${unitCost}">
        </td>
        <td class="py-2 px-2.5 text-right font-mono font-bold text-slate-200 row-total">
          LKR 0
        </td>
        <td class="py-2 px-2.5 text-center">
          <button type="button" onclick="removeBudgetItemRow(this)" class="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/20" title="Remove Item">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
      recalculateFormTotals();
    }

    function removeBudgetItemRow(btn) {
      const row = btn.closest('tr');
      const tbody = document.getElementById('formItemsTableBody');
      if (tbody.querySelectorAll('tr').length <= 1) {
        showToast('At least one budget costing item is required.');
        return;
      }
      row.remove();
      recalculateFormTotals();
    }

    function recalculateFormTotals() {
      const rows = document.querySelectorAll('#formItemsTableBody .item-row');
      let grandTotal = 0;

      rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        const unitCost = parseFloat(row.querySelector('.row-cost').value) || 0;
        const total = qty * unitCost;
        row.querySelector('.row-total').textContent = `LKR ${total.toLocaleString()}`;
        grandTotal += total;
      });

      document.getElementById('formSubtotalDisplay').textContent = `LKR ${grandTotal.toLocaleString()}`;
      document.getElementById('formGrandTotalDisplay').textContent = `LKR ${grandTotal.toLocaleString()}`;
    }

    // Save budget (Draft or Submit for Owner Approval)
    function saveBudget(submitForApproval) {
      const projId = document.getElementById('formProjectSelect').value;
      const designVer = document.getElementById('formDesignVersion').value;
      const notes = document.getElementById('formNotes').value.trim();

      if (!projId) {
        showToast('Please select a project with an approved design version.');
        return;
      }
      if (!designVer) {
        showToast('Budget must be linked to an approved design version.');
        return;
      }

      // Collect items
      const rows = document.querySelectorAll('#formItemsTableBody .item-row');
      const items = [];
      let total = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const desc = row.querySelector('.row-desc').value.trim();
        const cat = row.querySelector('.row-cat').value;
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        const unit = row.querySelector('.row-unit').value.trim() || 'Units';
        const unitCost = parseFloat(row.querySelector('.row-cost').value) || 0;

        if (!desc) {
          showToast(`Please enter a description for item row #${i + 1}`);
          return;
        }
        if (qty <= 0 || unitCost <= 0) {
          showToast(`Please enter valid quantity and unit cost for item row #${i + 1}`);
          return;
        }

        const itemTotal = qty * unitCost;
        total += itemTotal;
        items.push({
          desc: desc,
          category: cat,
          qty: qty,
          unit: unit,
          unitCost: unitCost,
          total: itemTotal
        });
      }

      if (items.length === 0) {
        showToast('Please add at least one budget item.');
        return;
      }

      const projMeta = eligibleProjects[projId] || { name: 'Custom Project', client: 'Corporate Client' };

      if (editingBudgetId) {
        // Update existing draft
        const b = budgets.find(item => item.budgetNo === editingBudgetId);
        if (b) {
          b.items = items;
          b.totalAmount = total;
          b.notes = notes;
          if (submitForApproval) {
            b.status = 'PENDING APPROVAL';
            b.submittedDate = '19 Nov 2026, 03:00 PM';
          }
        }
        showToast(submitForApproval ? `Budget ${editingBudgetId} submitted for Owner approval!` : `Draft budget ${editingBudgetId} updated successfully.`);
      } else {
        // Create new
        const newBudgetNum = `BDG-2026-${String(Math.floor(Math.random() * 80) + 120).padStart(3, '0')}`;
        const newBudget = {
          budgetNo: newBudgetNum,
          projectId: projId,
          projectName: projMeta.name,
          clientName: projMeta.client,
          designVersion: designVer,
          budgetVersion: 'v1.0',
          totalAmount: total,
          createdDate: '19 Nov 2026',
          status: submitForApproval ? 'PENDING APPROVAL' : 'DRAFT',
          preparedBy: 'Finance Officer (Accounts Desk)',
          submittedDate: submitForApproval ? '19 Nov 2026, 03:00 PM' : null,
          approvalDetails: null,
          notes: notes,
          items: items,
          versionHistory: []
        };

        budgets.unshift(newBudget);
        showToast(submitForApproval ? `New budget ${newBudgetNum} created & submitted for Owner approval!` : `New draft budget ${newBudgetNum} saved.`);
      }

      closeCreateBudgetModal();
      filterBudgets();
    }

    // Submit draft budget for Owner approval
    function submitForOwnerApproval(budgetNo) {
      const b = budgets.find(item => item.budgetNo === budgetNo);
      if (!b) return;

      b.status = 'PENDING APPROVAL';
      b.submittedDate = '19 Nov 2026, 03:30 PM';
      showToast(`Budget ${b.budgetNo} has been submitted for Owner approval.`);
      filterBudgets();
    }

    // Create new version from rejected
    function createNewVersionFromRejected(budgetNo) {
      const b = budgets.find(item => item.budgetNo === budgetNo);
      if (!b) return;

      // Create new version v1.1
      const newVersionNum = 'v1.1';
      b.versionHistory.push({
        ver: b.budgetVersion,
        date: b.createdDate,
        total: b.totalAmount,
        note: `Rejected by Owner: "${b.approvalDetails ? b.approvalDetails.rejectionReason : 'Needs revision'}"`
      });

      b.budgetVersion = newVersionNum;
      b.status = 'DRAFT';
      b.createdDate = '19 Nov 2026';
      b.submittedDate = null;
      b.approvalDetails = null;

      showToast(`New budget version ${newVersionNum} created for ${b.budgetNo}. You may now edit costings.`);
      filterBudgets();
      editDraftBudget(b.budgetNo);
    }

    // Quotation redirection simulation
    function createQuotationFromApprovedBudget(budgetNo) {
      closeViewBudgetModal();
      showToast(`Proceeding to Quotation Management: Pre-populating quotation with approved budget ${budgetNo}.`);
    }

    // Mobile Sidebar Drawer Toggle
    function toggleMobileSidebar() {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('mobileBackdrop');
      const isClosed = sidebar.classList.contains('-translate-x-full');

      if (isClosed) {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
      } else {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      }
    }

    // Toast feedback notification
    function showToast(message) {
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      toastMsg.textContent = message;

      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 3400);
    }

    // Initialize on load
    window.addEventListener('DOMContentLoaded', () => {
      filterBudgets();
    });
