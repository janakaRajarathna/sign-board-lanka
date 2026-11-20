// Utility: XSS prevention text escaping helper
    function escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Helper: format YYYY-MM-DD into human readable date (e.g. 19 Nov 2026)
    function formatDisplayDate(dateStr) {
      if (!dateStr) return '';
      // Support ISO dates or existing strings
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Helper: compute expiration date given start date (YYYY-MM-DD) and validity days
    function computeExpiryDate(startDateStr, days) {
      const d = new Date(startDateStr);
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + parseInt(days || 30, 10));
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Owner-Approved Budgets Database (Source of Truth)
    // Rule: Accounts users create quotations ONLY from verified Owner-approved budgets
    const approvedBudgetsDatabase = {
      'PRJ-2026-095': {
        name: 'HNB Towers Backlit Monolith Signboard',
        client: 'Hatton National Bank PLC',
        address: '[HNB Towers Head Office Placeholder, Colombo, Sri Lanka]',
        budgetNo: 'BDG-2026-095',
        budgetVer: 'v1.0 (Owner Approved)',
        budgetCost: 1850000,
        scope: 'Design, structural fabrication, foundation anchorage, high-luminance backlit flexface installation, and certified high-rise night-rigging for HNB Towers City Entrance monolith.'
      },
      'PRJ-2026-089': {
        name: 'Dialog Axiata 3D Acrylic Rooftop Pylon',
        client: 'Dialog Axiata PLC',
        address: '[Dialog Corporate Tower Placeholder, Colombo, Sri Lanka]',
        budgetNo: 'BDG-2026-089',
        budgetVer: 'v1.0 (Owner Approved)',
        budgetCost: 2050000,
        scope: 'Galvanized structural steel framework with CNC-cut Dialog corporate red acrylic channel letters and weatherproof illumination fitted for rooftop environment.'
      },
      'PRJ-2026-071': {
        name: 'Singer Mega Colombo Neon & Display Signage',
        client: 'Singer (Sri Lanka) PLC',
        address: '[Singer Mega Complex Placeholder, Colombo, Sri Lanka]',
        budgetNo: 'BDG-2026-071',
        budgetVer: 'v2.0 (Owner Approved)',
        budgetCost: 2180000,
        scope: 'Outdoor custom neon bending with high-efficiency transformers fitted onto black architectural framework according to approved layout DSN-071-v2.'
      },
      'PRJ-2026-101': {
        name: 'Seylan Bank City Branch Wayfinding Totems',
        client: 'Seylan Bank PLC',
        address: '[Seylan Towers Placeholder, Colombo, Sri Lanka]',
        budgetNo: 'BDG-2026-101',
        budgetVer: 'v1.0 (Owner Approved)',
        budgetCost: 1150000,
        scope: 'Brushed 304 grade stainless steel totem cladding with precision laser cut brand typography and internal edge-lit modules.'
      },
      'PRJ-2026-081': {
        name: 'Odel Department Store Grand Canopy Signs',
        client: 'Softlogic Retail Holdings PLC',
        address: '[Odel Flagship Complex Placeholder, Colombo, Sri Lanka]',
        budgetNo: 'BDG-2026-081',
        budgetVer: 'v2.0 (Owner Approved)',
        budgetCost: 920000,
        scope: 'Polished stainless steel built-up letters with architectural halo illumination along the central historical grand canopy.'
      }
    };

    // Quotations Register (State Store) with real ISO dates and validity duration in days
    let quotations = [
      {
        qtnNo: 'QTN-2026-042',
        projectId: 'PRJ-2026-095',
        projectName: 'HNB Towers Backlit Monolith Signboard',
        clientName: 'Hatton National Bank PLC',
        clientAddress: '[HNB Towers Head Office Placeholder, Colombo, Sri Lanka]',
        attention: 'Head of Infrastructure & Facilities',
        linkedBudgetNo: 'BDG-2026-095',
        budgetVer: 'v1.0 (Owner Approved)',
        budgetCost: 1850000,
        qtnVer: 'v1.0',
        sellingPrice: 2150000,
        isoDate: '2026-11-17',
        validityDays: 30,
        status: 'SENT',
        paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
        scope: 'Design, structural fabrication, foundation anchorage, high-luminance backlit flexface installation, and certified high-rise night-rigging for HNB Towers City Entrance monolith.',
        decisionData: null
      },
      {
        qtnNo: 'QTN-2026-039',
        projectId: 'PRJ-2026-089',
        projectName: 'Dialog Axiata 3D Acrylic Rooftop Pylon',
        clientName: 'Dialog Axiata PLC',
        clientAddress: '[Dialog Corporate Tower Placeholder, Colombo, Sri Lanka]',
        attention: 'Manager Commercial Facilities',
        linkedBudgetNo: 'BDG-2026-089',
        budgetVer: 'v1.0 (Owner Approved)',
        budgetCost: 2050000,
        qtnVer: 'v1.0',
        sellingPrice: 2420000,
        isoDate: '2026-11-09',
        validityDays: 30,
        status: 'ACCEPTED',
        paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
        scope: 'Galvanized structural steel framework with CNC-cut Dialog corporate red acrylic channel letters and weatherproof illumination fitted for rooftop environment.',
        advancePaymentLogged: false,
        decisionData: {
          decision: 'ACCEPTED',
          poRef: 'PO-DLG-2026-7819',
          date: '2026-11-12',
          remarks: 'Commercial offer approved by Dialog Group Procurement.'
        }
      },
      {
        qtnNo: 'QTN-2026-031',
        projectId: 'PRJ-2026-071',
        projectName: 'Singer Mega Colombo Neon & Display Signage',
        clientName: 'Singer (Sri Lanka) PLC',
        clientAddress: '[Singer Mega Complex Placeholder, Colombo, Sri Lanka]',
        attention: 'Senior Manager Brand Logistics',
        linkedBudgetNo: 'BDG-2026-071',
        budgetVer: 'v2.0 (Owner Approved)',
        budgetCost: 2180000,
        qtnVer: 'v1.2',
        sellingPrice: 2600000,
        isoDate: '2026-11-02',
        validityDays: 30,
        status: 'ACCEPTED',
        paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
        scope: 'Outdoor custom neon bending with high-efficiency transformers fitted onto black architectural framework according to approved layout DSN-071-v2.',
        advancePaymentLogged: true,
        advancePaymentRef: 'REC-ADV-8821',
        decisionData: {
          decision: 'ACCEPTED',
          poRef: 'SNG-PO-88214',
          date: '2026-11-05',
          remarks: 'Released for fabrication under 30% advance milestone.'
        }
      },
      {
        qtnNo: 'QTN-2026-044',
        projectId: 'PRJ-2026-101',
        projectName: 'Seylan Bank City Branch Wayfinding Totems',
        clientName: 'Seylan Bank PLC',
        clientAddress: '[Seylan Towers Placeholder, Colombo, Sri Lanka]',
        attention: 'Branch Experience Coordinator',
        linkedBudgetNo: 'BDG-2026-101',
        budgetVer: 'v1.0 (Owner Approved)',
        budgetCost: 1150000,
        qtnVer: 'v1.0',
        sellingPrice: 1350000,
        isoDate: '2026-11-18',
        validityDays: 30,
        status: 'DRAFT',
        paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
        scope: 'Brushed 304 grade stainless steel totem cladding with precision laser cut brand typography and internal edge-lit modules.',
        decisionData: null
      },
      {
        qtnNo: 'QTN-2026-045',
        projectId: 'PRJ-2026-081',
        projectName: 'Odel Department Store Grand Canopy Signs',
        clientName: 'Softlogic Retail Holdings PLC',
        clientAddress: '[Odel Flagship Complex Placeholder, Colombo, Sri Lanka]',
        attention: 'Vice President Merchandising Environments',
        linkedBudgetNo: 'BDG-2026-081',
        budgetVer: 'v2.0 (Owner Approved)',
        budgetCost: 920000,
        qtnVer: 'v2.0',
        sellingPrice: 1100000,
        isoDate: '2026-11-18',
        validityDays: 30,
        status: 'DRAFT',
        paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
        scope: 'Polished stainless steel built-up letters with architectural halo illumination along the central historical grand canopy.',
        decisionData: null
      }
    ];

    let currentFilter = 'ALL';
    let editingQuotationNo = null; // null for new, string for editing draft
    let activeDecisionQtnNo = null;
    let activeAdvanceQtnNo = null;

    // Helper: Generate next sequential quotation number
    function getNextSequentialQuotationNo() {
      let maxNum = 0;
      quotations.forEach(q => {
        const match = q.qtnNo.match(/QTN-2026-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const nextNum = maxNum + 1;
      return `QTN-2026-${String(nextNum).padStart(3, '0')}`;
    }

    // Populate Eligible Projects in Modal Dropdown
    function populateEligibleProjectsDropdown() {
      const select = document.getElementById('modalProjectSelect');
      select.innerHTML = '<option value="">-- Choose eligible project --</option>';

      Object.keys(approvedBudgetsDatabase).forEach(projId => {
        const item = approvedBudgetsDatabase[projId];
        const opt = document.createElement('option');
        opt.value = projId;
        opt.textContent = `${projId}: ${item.name} (${item.budgetNo})`;
        select.appendChild(opt);
      });
    }

    // Render Quotations Register Table
    function renderQuotationsTable(list) {
      const tbody = document.getElementById('quotationTableBody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center py-12 text-outline">
              <div class="flex flex-col items-center justify-center space-y-2">
                <span class="material-symbols-outlined text-4xl text-outline-variant">search_off</span>
                <div class="font-mono text-xs uppercase tracking-wider">No commercial quotations match the active criteria</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      list.forEach(q => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-surface-container transition-colors';

        // Status badge
        let statusBadge = '';
        if (q.status === 'DRAFT') {
          statusBadge = '<span class="px-2 py-0.5 rounded bg-surface-container-highest text-secondary font-mono text-[10px] uppercase tracking-wider">DRAFT</span>';
        } else if (q.status === 'SENT') {
          statusBadge = '<span class="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-[10px] uppercase tracking-wider">SENT</span>';
        } else if (q.status === 'ACCEPTED') {
          statusBadge = '<span class="px-2 py-0.5 rounded bg-surface-container-highest text-secondary font-mono text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1"><span class="material-symbols-outlined text-xs">lock</span><span>ACCEPTED</span></span>';
        } else if (q.status === 'REJECTED') {
          statusBadge = '<span class="px-2 py-0.5 rounded bg-error-container/40 text-error font-mono text-[10px] uppercase tracking-wider">REJECTED</span>';
        }

        // Safe calculations with zero protections
        const cost = q.budgetCost || 0;
        const sell = q.sellingPrice || 0;
        const diff = sell - cost;

        let markupPct = '0.0';
        if (cost > 0) {
          markupPct = (((sell - cost) / cost) * 100).toFixed(1);
        }

        let marginPct = '0.0';
        if (sell > 0) {
          marginPct = (((sell - cost) / sell) * 100).toFixed(1);
        }

        // Validity strings
        const validUntilStr = computeExpiryDate(q.isoDate, q.validityDays);

        // Contextual Actions strictly respecting state
        // ACCEPTED: "RECORD ADVANCE PAYMENT" (or "RECORD 30% ADVANCE")
        let actionsHtml = '';
        if (q.status === 'DRAFT') {
          actionsHtml = `
            <button onclick="previewQuotationDoc('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 bg-surface-container hover:bg-surface-bright text-on-surface rounded font-mono text-[11px] uppercase transition-colors" title="View document">Preview</button>
            <button onclick="editDraftQuotation('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 bg-surface-container-high hover:bg-surface-bright text-secondary rounded font-mono text-[11px] uppercase transition-colors">Edit</button>
            <button onclick="dispatchQuotationToClient('${escapeHTML(q.qtnNo)}')" class="px-3 py-1 bg-primary-container hover:bg-secondary-container text-white rounded font-mono text-[11px] uppercase transition-colors">Send</button>
          `;
        } else if (q.status === 'SENT') {
          actionsHtml = `
            <button onclick="previewQuotationDoc('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 bg-surface-container hover:bg-surface-bright text-on-surface rounded font-mono text-[11px] uppercase transition-colors">Preview</button>
            <button onclick="openDecisionModal('${escapeHTML(q.qtnNo)}')" class="px-3 py-1 bg-surface-bright hover:bg-primary-container hover:text-white text-primary rounded font-mono text-[11px] uppercase flex items-center space-x-1 transition-colors">
              <span class="material-symbols-outlined text-xs">gavel</span>
              <span>Record Decision</span>
            </button>
          `;
        } else if (q.status === 'ACCEPTED') {
          // Strictly immutable: Preview and Record 30% Advance Payment
          const isPaid = q.advancePaymentLogged;
          actionsHtml = `
            <button onclick="previewQuotationDoc('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 bg-surface-container hover:bg-surface-bright text-on-surface rounded font-mono text-[11px] uppercase transition-colors">Preview</button>
            <button onclick="openAdvancePaymentModal('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 ${isPaid ? 'bg-surface-container-highest text-secondary border border-secondary/30' : 'bg-primary-container hover:bg-secondary-container text-white'} rounded font-mono text-[11px] uppercase flex items-center space-x-1 transition-colors" title="Post 30% advance deposit to Payment Management. Final invoice issued post-installation.">
              <span class="material-symbols-outlined text-xs">payments</span>
              <span>${isPaid ? 'Advance Recorded' : 'Record 30% Advance'}</span>
            </button>
          `;
        } else if (q.status === 'REJECTED') {
          // Provide ability to spawn a new sequential revision without overwriting rejected original
          actionsHtml = `
            <button onclick="previewQuotationDoc('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 bg-surface-container hover:bg-surface-bright text-on-surface rounded font-mono text-[11px] uppercase transition-colors">Preview</button>
            <button onclick="createRevisedVersion('${escapeHTML(q.qtnNo)}')" class="px-2.5 py-1 bg-surface-bright hover:bg-primary-container hover:text-white text-primary rounded font-mono text-[11px] uppercase flex items-center space-x-1 transition-colors" title="Create a new revision version while preserving this rejected record">
              <span class="material-symbols-outlined text-xs">auto_mode</span>
              <span>Create Revision</span>
            </button>
          `;
        }

        tr.innerHTML = `
          <td class="py-3 px-4 font-mono font-bold text-primary">${escapeHTML(q.qtnNo)}</td>
          <td class="py-3 px-4">
            <div class="font-semibold text-on-surface">${escapeHTML(q.projectName)}</div>
            <div class="text-[11px] text-outline font-mono">${escapeHTML(q.projectId)} &bull; ${escapeHTML(q.clientName)}</div>
          </td>
          <td class="py-3 px-4">
            <div class="font-mono text-secondary font-bold">${escapeHTML(q.linkedBudgetNo)}</div>
            <div class="text-[11px] text-outline">Base Cost: LKR ${cost.toLocaleString()}</div>
          </td>
          <td class="py-3 px-4 text-center font-mono text-on-surface-variant font-bold">${escapeHTML(q.qtnVer)}</td>
          <td class="py-3 px-4 text-right">
            <div class="font-mono font-bold text-on-surface">LKR ${sell.toLocaleString()}</div>
            <div class="text-[10px] font-mono ${diff >= 0 ? 'text-secondary' : 'text-error'}">
              Markup: ${markupPct}% | Margin: ${marginPct}%
            </div>
          </td>
          <td class="py-3 px-4 text-on-surface-variant font-mono text-[11px]">${formatDisplayDate(q.isoDate)}</td>
          <td class="py-3 px-4 font-mono text-[11px]">
            <div class="text-on-surface">${q.validityDays} Days</div>
            <div class="text-[10px] text-outline">Until ${validUntilStr}</div>
          </td>
          <td class="py-3 px-4 text-center">${statusBadge}</td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              ${actionsHtml}
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      });

      document.getElementById('tableRecordSummary').textContent = `Showing ${list.length} of ${quotations.length} commercial proposals`;
    }

    // Dynamic Search & Filtering Engine with Real Date Parsing
    function filterQuotationsTable() {
      const search = (document.getElementById('quotationSearchInput').value || '').toLowerCase().trim();
      const sort = document.getElementById('quotationSortSelect').value;

      let res = quotations.filter(q => {
        const matchStatus = (currentFilter === 'ALL' || q.status === currentFilter);
        const matchSearch = (
          q.qtnNo.toLowerCase().includes(search) ||
          q.projectId.toLowerCase().includes(search) ||
          q.projectName.toLowerCase().includes(search) ||
          q.clientName.toLowerCase().includes(search) ||
          q.linkedBudgetNo.toLowerCase().includes(search)
        );
        return matchStatus && matchSearch;
      });

      // Sort with real date timestamp comparisons
      if (sort === 'newest') {
        res.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
      } else if (sort === 'oldest') {
        res.sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
      } else if (sort === 'amount-desc') {
        res.sort((a, b) => b.sellingPrice - a.sellingPrice);
      } else if (sort === 'amount-asc') {
        res.sort((a, b) => a.sellingPrice - b.sellingPrice);
      } else if (sort === 'qtn-id') {
        res.sort((a, b) => a.qtnNo.localeCompare(b.qtnNo));
      }

      renderQuotationsTable(res);
      updateDynamicKpis();
    }

    function setQuotationFilter(status) {
      currentFilter = status;
      const filterKeys = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

      filterKeys.forEach(k => {
        const btn = document.getElementById(`filterBtn${k}`);
        if (btn) {
          if (k === status) {
            btn.className = 'px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-primary-container text-white rounded transition-colors';
          } else {
            btn.className = 'px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-on-surface-variant hover:text-white rounded transition-colors';
          }
        }
      });

      filterQuotationsTable();
    }

    function updateDynamicKpis() {
      const total = quotations.length;
      const draftList = quotations.filter(q => q.status === 'DRAFT');
      const sentList = quotations.filter(q => q.status === 'SENT');
      const acceptedList = quotations.filter(q => q.status === 'ACCEPTED');
      const rejectedList = quotations.filter(q => q.status === 'REJECTED');

      const totalVal = quotations.reduce((acc, q) => acc + q.sellingPrice, 0);
      const draftVal = draftList.reduce((acc, q) => acc + q.sellingPrice, 0);
      const sentVal = sentList.reduce((acc, q) => acc + q.sellingPrice, 0);
      const acceptedVal = acceptedList.reduce((acc, q) => acc + q.sellingPrice, 0);

      // Total distinct clients across all quotes
      const allClientsSet = new Set(quotations.map(q => q.clientName));

      // Update KPI DOM
      document.getElementById('kpiTotalCount').textContent = `${total} Quotations`;
      document.getElementById('kpiTotalAmount').textContent = `LKR ${totalVal.toLocaleString()} Portfolio`;
      document.getElementById('kpiActiveClientsCount').textContent = `${allClientsSet.size} Clients`;

      document.getElementById('kpiDraftCount').textContent = `${draftList.length} Quotations`;
      document.getElementById('kpiDraftAmount').textContent = `LKR ${draftVal.toLocaleString()}`;

      document.getElementById('kpiSentCount').textContent = `${sentList.length} Quotation${sentList.length === 1 ? '' : 's'}`;
      document.getElementById('kpiSentAmount').textContent = `LKR ${sentVal.toLocaleString()}`;

      document.getElementById('kpiAcceptedCount').textContent = `${acceptedList.length} Quotations`;
      document.getElementById('kpiAcceptedAmount').textContent = `LKR ${acceptedVal.toLocaleString()}`;

      // Update pill counters
      document.getElementById('pillCountAll').textContent = total;
      document.getElementById('pillCountDraft').textContent = draftList.length;
      document.getElementById('pillCountSent').textContent = sentList.length;
      document.getElementById('pillCountAccepted').textContent = acceptedList.length;
      document.getElementById('pillCountRejected').textContent = rejectedList.length;
    }

    // ==================== MODAL 1: CREATE / EDIT LOGIC ====================
    function openCreateQuotationModal() {
      editingQuotationNo = null;
      document.getElementById('modalQuotationHeading').textContent = 'Prepare Commercial Quotation';

      // Clean Reset of all fields
      document.getElementById('modalProjectSelect').disabled = false;
      document.getElementById('modalProjectSelect').value = '';
      document.getElementById('modalClientDisplay').value = '';
      document.getElementById('modalLinkedBudgetNo').textContent = '--';
      document.getElementById('modalBudgetVersion').textContent = '--';
      document.getElementById('modalCostBaseDisplay').textContent = 'LKR 0';
      document.getElementById('calcCostBaseView').textContent = 'LKR 0';

      const nextQtn = getNextSequentialQuotationNo();
      document.getElementById('modalQuoteNumber').value = nextQtn;
      document.getElementById('modalQuoteVer').value = 'v1.0';

      const todayISO = new Date().toISOString().split('T')[0];
      document.getElementById('modalQuoteDate').value = todayISO;
      document.getElementById('modalValidityDaysInput').value = 30;
      updateCalculatedValidityDate();

      document.getElementById('modalAttentionContact').value = '';
      document.getElementById('modalScopeDesc').value = '';
      document.getElementById('modalSellingPriceInput').value = '';

      calculateCommercialMargin();
      document.getElementById('createQuotationModal').classList.remove('hidden');
    }

    function editDraftQuotation(qtnNo) {
      const q = quotations.find(item => item.qtnNo === qtnNo);
      if (!q) return;

      // Strict enforcement: Only DRAFT quotations can be edited
      if (q.status !== 'DRAFT') {
        showToast('Accepted, Sent, and Rejected quotations are locked and protected from direct editing.');
        return;
      }

      editingQuotationNo = q.qtnNo;
      document.getElementById('modalQuotationHeading').textContent = `Edit Draft Quotation: ${q.qtnNo}`;

      // Populate with existing draft data
      document.getElementById('modalProjectSelect').value = q.projectId;
      document.getElementById('modalProjectSelect').disabled = true; // Lock project reference during edit
      document.getElementById('modalClientDisplay').value = q.clientName;
      document.getElementById('modalLinkedBudgetNo').textContent = q.linkedBudgetNo;
      document.getElementById('modalBudgetVersion').textContent = q.budgetVer;
      document.getElementById('modalCostBaseDisplay').textContent = `LKR ${q.budgetCost.toLocaleString()}`;
      document.getElementById('calcCostBaseView').textContent = `LKR ${q.budgetCost.toLocaleString()}`;

      document.getElementById('modalQuoteNumber').value = q.qtnNo;
      document.getElementById('modalQuoteVer').value = q.qtnVer;
      document.getElementById('modalQuoteDate').value = q.isoDate;
      document.getElementById('modalValidityDaysInput').value = q.validityDays || 30;
      updateCalculatedValidityDate();

      document.getElementById('modalAttentionContact').value = q.attention;
      document.getElementById('modalScopeDesc').value = q.scope;
      document.getElementById('modalSellingPriceInput').value = q.sellingPrice;

      calculateCommercialMargin();
      document.getElementById('createQuotationModal').classList.remove('hidden');
    }

    function updateCalculatedValidityDate() {
      const dateVal = document.getElementById('modalQuoteDate').value || new Date().toISOString().split('T')[0];
      const days = parseInt(document.getElementById('modalValidityDaysInput').value || 30, 10);
      const computed = computeExpiryDate(dateVal, days);
      document.getElementById('modalValidUntilDisplay').textContent = `Until: ${computed}`;
    }

    function closeCreateQuotationModal() {
      document.getElementById('createQuotationModal').classList.add('hidden');
      editingQuotationNo = null;
    }

    function onProjectSelectChange() {
      const projId = document.getElementById('modalProjectSelect').value;
      const p = approvedBudgetsDatabase[projId];

      if (p) {
        document.getElementById('modalClientDisplay').value = p.client;
        document.getElementById('modalLinkedBudgetNo').textContent = p.budgetNo;
        document.getElementById('modalBudgetVersion').textContent = p.budgetVer;
        document.getElementById('modalCostBaseDisplay').textContent = `LKR ${p.budgetCost.toLocaleString()}`;
        document.getElementById('calcCostBaseView').textContent = `LKR ${p.budgetCost.toLocaleString()}`;
        document.getElementById('modalScopeDesc').value = p.scope;

        // Sensible default commercial pricing (+15% markup)
        const defaultPrice = Math.round(p.budgetCost * 1.15);
        document.getElementById('modalSellingPriceInput').value = defaultPrice;
        calculateCommercialMargin();
      } else {
        document.getElementById('modalClientDisplay').value = '';
        document.getElementById('modalLinkedBudgetNo').textContent = '--';
        document.getElementById('modalBudgetVersion').textContent = '--';
        document.getElementById('modalCostBaseDisplay').textContent = 'LKR 0';
        document.getElementById('calcCostBaseView').textContent = 'LKR 0';
        document.getElementById('modalScopeDesc').value = '';
        document.getElementById('modalSellingPriceInput').value = '';
        calculateCommercialMargin();
      }
    }

    // Explicit Separation: Markup on Cost vs Gross Profit Margin with Zero Protections
    function calculateCommercialMargin() {
      const projId = document.getElementById('modalProjectSelect').value;
      const p = approvedBudgetsDatabase[projId];
      const cost = p ? p.budgetCost : 0;
      const sellInput = parseFloat(document.getElementById('modalSellingPriceInput').value) || 0;
      const diff = sellInput - cost;

      // Safe calculations with zero protections
      let markupPct = '0.00%';
      if (cost > 0) {
        markupPct = (((sellInput - cost) / cost) * 100).toFixed(2) + '%';
      }

      let marginPct = '0.00%';
      if (sellInput > 0) {
        marginPct = (((sellInput - cost) / sellInput) * 100).toFixed(2) + '%';
      }

      const markupEl = document.getElementById('markupValText');
      const marginEl = document.getElementById('marginValText');
      const diffEl = document.getElementById('diffValText');

      markupEl.textContent = markupPct;
      marginEl.textContent = marginPct;
      diffEl.textContent = `${diff >= 0 ? '+' : ''}LKR ${diff.toLocaleString()}`;

      if (diff < 0) {
        markupEl.className = 'text-error font-bold';
        marginEl.className = 'text-error font-bold';
        diffEl.className = 'text-error font-bold';
      } else {
        markupEl.className = 'text-secondary font-bold';
        marginEl.className = 'text-primary font-bold';
        diffEl.className = 'text-white font-bold';
      }
    }

    function saveQuotationRecord(autoSend) {
      const projId = document.getElementById('modalProjectSelect').value;
      const p = approvedBudgetsDatabase[projId];
      const sellPrice = parseFloat(document.getElementById('modalSellingPriceInput').value) || 0;
      const attention = (document.getElementById('modalAttentionContact').value || '').trim();
      const scope = (document.getElementById('modalScopeDesc').value || '').trim();
      const isoDate = document.getElementById('modalQuoteDate').value || new Date().toISOString().split('T')[0];
      const validityDays = parseInt(document.getElementById('modalValidityDaysInput').value || 30, 10);

      if (!p) {
        showToast('Select an eligible project with an Owner-approved budget.');
        return;
      }
      if (sellPrice <= 0) {
        showToast('Commercial selling price must be greater than zero.');
        return;
      }
      if (!attention) {
        showToast('Client representative name/attention is mandatory.');
        return;
      }
      if (!scope) {
        showToast('Fabrication scope of work description is required.');
        return;
      }
      if (isNaN(validityDays) || validityDays <= 0) {
        showToast('Validity duration must be a positive number of days.');
        return;
      }

      if (editingQuotationNo) {
        // Update draft in place without altering quotation number
        const q = quotations.find(item => item.qtnNo === editingQuotationNo);
        if (q) {
          if (q.status !== 'DRAFT') {
            showToast('Locked quotation cannot be updated.');
            return;
          }
          q.attention = attention;
          q.scope = scope;
          q.sellingPrice = sellPrice;
          q.isoDate = isoDate;
          q.validityDays = validityDays;
          if (autoSend) {
            q.status = 'SENT';
          }
        }
        showToast(autoSend ? `Quotation ${editingQuotationNo} updated and dispatched!` : `Draft quotation ${editingQuotationNo} saved.`);
      } else {
        // Create new sequential quotation
        const newQtnNo = getNextSequentialQuotationNo();
        const newRecord = {
          qtnNo: newQtnNo,
          projectId: projId,
          projectName: p.name,
          clientName: p.client,
          clientAddress: p.address,
          attention: attention,
          linkedBudgetNo: p.budgetNo,
          budgetVer: p.budgetVer,
          budgetCost: p.budgetCost,
          qtnVer: 'v1.0',
          sellingPrice: sellPrice,
          isoDate: isoDate,
          validityDays: validityDays,
          status: autoSend ? 'SENT' : 'DRAFT',
          paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
          scope: scope,
          decisionData: null
        };
        quotations.unshift(newRecord);
        showToast(autoSend ? `Quotation ${newQtnNo} generated and dispatched!` : `Draft quotation ${newQtnNo} created.`);
      }

      closeCreateQuotationModal();
      filterQuotationsTable();
    }

    // PROPER REVISION HISTORY:
    // When revising a rejected quotation, NEVER overwrite or modify the rejected record.
    // Preserve rejected quotations with full audit history and create a new sequential version record!
    function createRevisedVersion(rejectedQtnNo) {
      const orig = quotations.find(item => item.qtnNo === rejectedQtnNo);
      if (!orig) return;

      if (orig.status !== 'REJECTED') {
        showToast('Only rejected quotations can spawn a new revision version.');
        return;
      }

      // Calculate next version number (e.g., v1.0 -> v1.1)
      const currentVerNum = parseFloat(orig.qtnVer.replace('v', '')) || 1.0;
      const nextVer = `v${(currentVerNum + 0.1).toFixed(1)}`;
      const newQtnNo = getNextSequentialQuotationNo();
      const todayISO = new Date().toISOString().split('T')[0];

      // Clone into new standalone revision draft record
      const revisionRecord = {
        qtnNo: newQtnNo,
        projectId: orig.projectId,
        projectName: orig.projectName,
        clientName: orig.clientName,
        clientAddress: orig.clientAddress,
        attention: orig.attention,
        linkedBudgetNo: orig.linkedBudgetNo,
        budgetVer: orig.budgetVer,
        budgetCost: orig.budgetCost,
        qtnVer: nextVer,
        sellingPrice: orig.sellingPrice,
        isoDate: todayISO,
        validityDays: orig.validityDays || 30,
        status: 'DRAFT',
        paymentTerms: '30% Advance on Acceptance; single final invoice upon site installation completion',
        scope: orig.scope,
        revisionOf: orig.qtnNo,
        decisionData: null
      };

      // Insert new revision while leaving the rejected record 100% intact
      quotations.unshift(revisionRecord);
      filterQuotationsTable();
      showToast(`Revision ${newQtnNo} (${nextVer}) created. Original ${orig.qtnNo} preserved for audit.`);

      // Immediately launch draft editor on new revision
      editDraftQuotation(newQtnNo);
    }

    // ==================== MODAL 2: FORMAL CLIENT PREVIEW ====================
    function previewQuotationDoc(qtnNo) {
      const q = quotations.find(item => item.qtnNo === qtnNo);
      if (!q) return;

      const validUntilStr = computeExpiryDate(q.isoDate, q.validityDays);
      const advanceDeposit = Math.round(q.sellingPrice * 0.30);

      document.getElementById('prevQuoteNo').textContent = q.qtnNo;
      document.getElementById('prevQuoteDate').textContent = `Date: ${formatDisplayDate(q.isoDate)}`;
      document.getElementById('prevQuoteVerBadge').textContent = `Version: ${q.qtnVer}`;
      document.getElementById('prevClientName').textContent = q.clientName;
      document.getElementById('prevClientAddress').textContent = q.clientAddress;
      document.getElementById('prevAttention').textContent = `Attn: ${q.attention}`;
      document.getElementById('prevProjectTitle').textContent = q.projectName;
      document.getElementById('prevLinkedProject').textContent = `${q.projectId} (${q.linkedBudgetNo})`;
      document.getElementById('prevValidity').textContent = `Validity: ${q.validityDays} Days (Valid Until: ${validUntilStr})`;
      document.getElementById('prevScopeText').textContent = q.scope;
      document.getElementById('prevTableScopeTitle').textContent = `${q.projectName} - Fabrication Package`;
      document.getElementById('prevTableGrossAmount').textContent = `LKR ${q.sellingPrice.toLocaleString()}`;
      document.getElementById('prevSummarySubtotal').textContent = `LKR ${q.sellingPrice.toLocaleString()}`;
      document.getElementById('prevSummaryTotal').textContent = `LKR ${q.sellingPrice.toLocaleString()}`;
      document.getElementById('prevAdvanceDepositVal').textContent = `LKR ${advanceDeposit.toLocaleString()}`;
      document.getElementById('prevTermsBullet').innerHTML = `Commercial Milestone: <strong class="text-white print-dark-text">30% Advance Deposit (LKR ${advanceDeposit.toLocaleString()})</strong> due on formal Acceptance; recorded under Payment Management.`;
      document.getElementById('prevTermsExpiryNote').textContent = `Quotation Validity: Strictly valid for ${q.validityDays} days until ${validUntilStr}.`;

      // Contextual Action Zone in Preview Footer
      const actionZone = document.getElementById('previewActionZone');
      actionZone.innerHTML = '';

      if (q.status === 'DRAFT') {
        actionZone.innerHTML = `
          <button onclick="closeViewPreviewModal(); dispatchQuotationToClient('${escapeHTML(q.qtnNo)}')" class="px-4 py-1.5 bg-primary-container hover:bg-secondary-container text-white font-mono text-xs uppercase rounded transition-colors">
            Dispatch Quotation
          </button>
        `;
      } else if (q.status === 'SENT') {
        actionZone.innerHTML = `
          <button onclick="closeViewPreviewModal(); openDecisionModal('${escapeHTML(q.qtnNo)}')" class="px-4 py-1.5 bg-primary hover:bg-white text-on-surface-variant hover:text-black font-mono text-xs uppercase font-bold rounded transition-colors flex items-center space-x-1">
            <span class="material-symbols-outlined text-sm">gavel</span>
            <span>Record Client Decision</span>
          </button>
        `;
      } else if (q.status === 'ACCEPTED') {
        actionZone.innerHTML = `
          <button onclick="closeViewPreviewModal(); openAdvancePaymentModal('${escapeHTML(q.qtnNo)}')" class="px-4 py-1.5 bg-primary-container hover:bg-secondary-container text-white font-mono text-xs uppercase rounded transition-colors flex items-center space-x-1">
            <span class="material-symbols-outlined text-sm">payments</span>
            <span>Record 30% Advance</span>
          </button>
        `;
      } else if (q.status === 'REJECTED') {
        actionZone.innerHTML = `
          <button onclick="closeViewPreviewModal(); createRevisedVersion('${escapeHTML(q.qtnNo)}')" class="px-4 py-1.5 bg-surface-bright hover:bg-primary text-white hover:text-black font-mono text-xs uppercase rounded transition-colors flex items-center space-x-1">
            <span class="material-symbols-outlined text-sm">auto_mode</span>
            <span>Spawn Revised Version</span>
          </button>
        `;
      }

      document.getElementById('viewPreviewModal').classList.remove('hidden');
    }

    function closeViewPreviewModal() {
      document.getElementById('viewPreviewModal').classList.add('hidden');
    }

    function triggerClientSidePrint() {
      window.print();
    }

    // ==================== MODAL 3: RECORD CLIENT DECISION ====================
    function openDecisionModal(qtnNo) {
      const q = quotations.find(item => item.qtnNo === qtnNo);
      if (!q) return;

      if (q.status !== 'SENT') {
        showToast('Only quotations in SENT status can receive a client commercial decision.');
        return;
      }

      activeDecisionQtnNo = qtnNo;
      document.getElementById('decisionQuoteRef').textContent = `Quotation Reference: ${qtnNo} (${q.projectName})`;

      // Require explicit selection (do not precheck)
      const radios = document.getElementsByName('clientDecisionRadio');
      radios.forEach(r => r.checked = false);

      document.getElementById('labelDecisionAccept').classList.remove('border-primary', 'bg-surface-bright');
      document.getElementById('labelDecisionReject').classList.remove('border-error', 'bg-surface-bright');

      document.getElementById('decisionPoRef').value = '';
      document.getElementById('decisionDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('decisionRemarks').value = '';

      // Default state: hide conditional until chosen
      document.getElementById('sectionAcceptedDetails').classList.add('hidden');
      document.getElementById('decisionInstructionHint').textContent = 'Please select Accepted or Rejected to specify details.';

      document.getElementById('decisionModal').classList.remove('hidden');
    }

    function closeDecisionModal() {
      document.getElementById('decisionModal').classList.add('hidden');
      activeDecisionQtnNo = null;
    }

    function onDecisionRadioChange() {
      const selected = document.querySelector('input[name="clientDecisionRadio"]:checked');
      if (!selected) return;

      const val = selected.value;
      const acceptSec = document.getElementById('sectionAcceptedDetails');
      const hint = document.getElementById('decisionInstructionHint');
      const remarksLabel = document.getElementById('decisionRemarksLabel');

      if (val === 'ACCEPTED') {
        acceptSec.classList.remove('hidden');
        hint.textContent = 'Client PO or formal corporate approval reference is required.';
        remarksLabel.textContent = 'Deposit / Invoicing Instructions (Optional)';
      } else {
        acceptSec.classList.add('hidden');
        hint.textContent = 'Please provide client rejection reasoning to assist estimation revisions.';
        remarksLabel.textContent = 'Client Rejection Reason & Commercial Feedback *';
      }
    }

    function commitClientDecision() {
      if (!activeDecisionQtnNo) return;
      const q = quotations.find(item => item.qtnNo === activeDecisionQtnNo);
      if (!q) return;

      const selected = document.querySelector('input[name="clientDecisionRadio"]:checked');
      if (!selected) {
        showToast('Please make an explicit choice: Accepted or Rejected.');
        return;
      }

      const decision = selected.value;
      const poRef = document.getElementById('decisionPoRef').value.trim();
      const date = document.getElementById('decisionDate').value.trim();
      const remarks = document.getElementById('decisionRemarks').value.trim();

      if (decision === 'ACCEPTED') {
        if (!poRef) {
          showToast('Client PO Number or official approval reference is mandatory for Acceptance.');
          return;
        }
        if (!date) {
          showToast('Acceptance Date is mandatory.');
          return;
        }

        q.status = 'ACCEPTED';
        q.decisionData = {
          decision: 'ACCEPTED',
          poRef: poRef,
          date: date,
          remarks: remarks
        };

        closeDecisionModal();
        filterQuotationsTable();
        showToast(`Quotation ${q.qtnNo} ACCEPTED with PO ${poRef}. Baseline locked; ready for 30% advance deposit.`);
      } else {
        if (!remarks) {
          showToast('Please record client rejection reasoning.');
          return;
        }

        q.status = 'REJECTED';
        q.decisionData = {
          decision: 'REJECTED',
          poRef: null,
          date: date,
          remarks: remarks
        };

        closeDecisionModal();
        filterQuotationsTable();
        showToast(`Quotation ${q.qtnNo} marked as REJECTED. Preserved for audit.`);
      }
    }

    // ==================== MODAL 4: RECORD 30% ADVANCE PAYMENT ====================
    function openAdvancePaymentModal(qtnNo) {
      const q = quotations.find(item => item.qtnNo === qtnNo);
      if (!q) return;

      if (q.status !== 'ACCEPTED') {
        showToast('Advance payments can only be recorded for Accepted and locked quotations.');
        return;
      }

      activeAdvanceQtnNo = qtnNo;
      const advanceDue = Math.round(q.sellingPrice * 0.30);

      document.getElementById('advanceQuoteRef').textContent = `${q.qtnNo} &bull; ${q.clientName}`;
      document.getElementById('advanceQuoteProject').textContent = q.projectName;
      document.getElementById('advanceQuoteTotal').textContent = `LKR ${q.sellingPrice.toLocaleString()}`;
      document.getElementById('advanceDueAmountDisplay').textContent = `30% Advance: LKR ${advanceDue.toLocaleString()}`;

      document.getElementById('advancePaymentRefInput').value = q.advancePaymentRef || '';
      document.getElementById('advancePaymentDateInput').value = new Date().toISOString().split('T')[0];

      document.getElementById('advancePaymentModal').classList.remove('hidden');
    }

    function closeAdvancePaymentModal() {
      document.getElementById('advancePaymentModal').classList.add('hidden');
      activeAdvanceQtnNo = null;
    }

    function commitAdvancePayment() {
      if (!activeAdvanceQtnNo) return;
      const q = quotations.find(item => item.qtnNo === activeAdvanceQtnNo);
      if (!q) return;

      const ref = document.getElementById('advancePaymentRefInput').value.trim();
      const date = document.getElementById('advancePaymentDateInput').value;

      if (!ref) {
        showToast('Bank or Receipt reference is mandatory.');
        return;
      }

      q.advancePaymentLogged = true;
      q.advancePaymentRef = ref;
      q.advancePaymentDate = date;

      closeAdvancePaymentModal();
      filterQuotationsTable();
      showToast(`30% Advance for ${q.qtnNo} successfully posted to Payment Management! Final invoice held until site completion.`);
    }

    // Dispatch strictly allowed only for DRAFT status quotations
    function dispatchQuotationToClient(qtnNo) {
      const q = quotations.find(item => item.qtnNo === qtnNo);
      if (!q) return;

      if (q.status !== 'DRAFT') {
        showToast('Dispatch is strictly permitted only for DRAFT status quotations.');
        return;
      }

      q.status = 'SENT';
      filterQuotationsTable();
      showToast(`Quotation ${qtnNo} dispatched to ${q.clientName}. Status updated to SENT.`);
    }

    // Mobile Sidebar Drawer
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

    // Toast Feedback
    function showToast(message) {
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      toastMsg.textContent = message;

      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 3600);
    }

    // Accessibility: Global ESC key closes active modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCreateQuotationModal();
        closeViewPreviewModal();
        closeDecisionModal();
        closeAdvancePaymentModal();
      }
    });

    // App Initialization
    window.addEventListener('DOMContentLoaded', () => {
      populateEligibleProjectsDropdown();
      filterQuotationsTable();
    });