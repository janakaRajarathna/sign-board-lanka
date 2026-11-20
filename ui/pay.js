/**
     * Sign Board Lanka ERP - Payment Management Interactive Engine (payment.js)
     * Strict adherence to business rules:
     * 1. 30% advance deposit baseline calculated from accepted quotation amount.
     * 2. Advance can be collected prior to invoice issuance (no advance invoice).
     * 3. Final payments require an issued final invoice; no overpayment permitted.
     * 4. Multi-payment history per project, real-time filtering, search, pagination.
     * 5. Robust Sri Lanka date handling (Asia/Colombo) using Intl.DateTimeFormat.
     */

    // --- 1. CONSISTENT SRI LANKAN (Asia/Colombo) DATE HANDLING UTILITIES ---
    const SL_TIMEZONE = 'Asia/Colombo';

    // Formatter returning year, month, day in Asia/Colombo timezone
    const colomboDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: SL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Formatter for month & year label representation
    const colomboMonthFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: SL_TIMEZONE,
      month: 'long',
      year: 'numeric'
    });

    /**
     * Returns an ISO date string (YYYY-MM-DD) for a given Date or current time in Asia/Colombo.
     */
    function getColomboDateString(date = new Date()) {
      return colomboDateFormatter.format(date);
    }

    /**
     * Deconstructs current Asia/Colombo calendar state into year, month (1-12), day.
     */
    function getColomboCalendarParts(date = new Date()) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: SL_TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).formatToParts(date);

      const map = {};
      parts.forEach(p => { map[p.type] = p.value; });
      return {
        year: parseInt(map.year, 10),
        month: parseInt(map.month, 10), // 1-12
        day: parseInt(map.day, 10)
      };
    }

    /**
     * Calculates an ISO date string offset by a specific number of calendar days in Asia/Colombo.
     */
    function getColomboOffsetDateString(dayOffset) {
      const cal = getColomboCalendarParts();
      // Use UTC construct with extracted Colombo calendar components to safely calculate day offsets
      const baseUtc = Date.UTC(cal.year, cal.month - 1, cal.day + dayOffset);
      return getColomboDateString(new Date(baseUtc));
    }

    // Calculated Dynamic Anchor Dates in Asia/Colombo
    const todayStr = getColomboDateString();
    const sevenDaysAgoStr = getColomboOffsetDateString(-7);
    const twoDaysAgo = getColomboOffsetDateString(-2);
    const fourDaysAgo = getColomboOffsetDateString(-4);
    const sixDaysAgo = getColomboOffsetDateString(-6);

    // Dynamic month prefixes for filtering
    const currentColomboParts = getColomboCalendarParts();
    const thisMonthPrefix = `${currentColomboParts.year}-${String(currentColomboParts.month).padStart(2, '0')}`;

    // Previous month calculation
    const prevMonthDate = new Date(Date.UTC(currentColomboParts.year, currentColomboParts.month - 2, 1));
    const prevMonthParts = getColomboCalendarParts(prevMonthDate);
    const prevMonthPrefix = `${prevMonthParts.year}-${String(prevMonthParts.month).padStart(2, '0')}`;

    // --- 2. COMMERCIAL PROJECTS MASTER REGISTRY (Exact Financial Consistency) ---
    // Rule: Final invoice amount equals quotation amount unless scope variation is locked.
    // Here all quotations and final invoices have consistent, matched ledger values.
    const commercialProjects = [
      {
        projectId: "PRJ-2026-089",
        projectName: "Dialog Axiata 3D Acrylic Rooftop Pylon",
        customer: "Dialog Axiata PLC",
        acceptedQuotationNo: "QTN-2026-039",
        acceptedQuotationAmount: 2420000,
        finalInvoiceNo: "INV-2026-018",
        invoiceAmount: 2420000,
        isInvoiceIssued: true
      },
      {
        projectId: "PRJ-2026-071",
        projectName: "Singer Mega Colombo Neon & Fascia Displays",
        customer: "Singer (Sri Lanka) PLC",
        acceptedQuotationNo: "QTN-2026-031",
        acceptedQuotationAmount: 2600000,
        finalInvoiceNo: null,
        invoiceAmount: 0,
        isInvoiceIssued: false
      },
      {
        projectId: "PRJ-2026-074",
        projectName: "Keells Supermarket Facade ACP Signage",
        customer: "JayKay Marketing Services (Pvt) Ltd",
        acceptedQuotationNo: "QTN-2026-025",
        acceptedQuotationAmount: 1800000,
        finalInvoiceNo: "INV-2026-017",
        invoiceAmount: 1800000,
        isInvoiceIssued: true
      },
      {
        projectId: "PRJ-2026-068",
        projectName: "Commercial Bank Wayfinding Signage & Branch Totems",
        customer: "Commercial Bank of Ceylon PLC",
        acceptedQuotationNo: "QTN-2026-022",
        acceptedQuotationAmount: 2350000,
        finalInvoiceNo: "INV-2026-016",
        invoiceAmount: 2350000,
        isInvoiceIssued: true
      },
      {
        projectId: "PRJ-2026-052",
        projectName: "Odel Mall Atrium Suspended Architectural Sign",
        customer: "Softlogic Retail Holdings PLC",
        acceptedQuotationNo: "QTN-2026-019",
        acceptedQuotationAmount: 1250000,
        finalInvoiceNo: "INV-2026-015",
        invoiceAmount: 1250000,
        isInvoiceIssued: true
      },
      {
        projectId: "PRJ-2026-095",
        projectName: "HNB Towers Backlit Monolith",
        customer: "Hatton National Bank PLC",
        acceptedQuotationNo: "QTN-2026-042",
        acceptedQuotationAmount: 2150000,
        finalInvoiceNo: null,
        invoiceAmount: 0,
        isInvoiceIssued: false
      }
    ];

    // --- 3. PAYMENT RECORDS INITIAL DATASET ---
    // Financial consistency breakdown:
    // PRJ-2026-089: Quotation 2,420,000 | 30% Advance = 726,000 | Final Invoice = 2,420,000 | Final Payment = 1,694,000 (Total Paid = 2,420,000, Bal = 0)
    // PRJ-2026-071: Quotation 2,600,000 | 30% Advance = 780,000 | In-progress (no invoice issued yet)
    // PRJ-2026-074: Quotation 1,800,000 | 30% Advance = 540,000 | Final Invoice = 1,800,000 | Final Payment = 1,260,000 (Total Paid = 1,800,000, Bal = 0)
    // PRJ-2026-068: Quotation 2,350,000 | 30% Advance = 705,000 | Final Invoice = 2,350,000 | Final Payment = 1,645,000 (Total Paid = 2,350,000, Bal = 0)
    // Evidence files set to null; recordedBy set to null (frontend prototype boundary)
    let paymentRecords = [
      {
        paymentId: "DEMO-PAY-006",
        projectId: "PRJ-2026-089",
        projectName: "Dialog Axiata 3D Acrylic Rooftop Pylon",
        customer: "Dialog Axiata PLC",
        paymentType: "FINAL",
        paymentDate: todayStr,
        paymentMethod: "BANK TRANSFER",
        amount: 1694000, // 2,420,000 - 726,000 = 1,694,000
        referenceNo: "SLIP-DIA-2026-8812",
        evidenceFile: null,
        recordedBy: null,
        createdDate: todayStr + " 10:45 AM"
      },
      {
        paymentId: "DEMO-PAY-005",
        projectId: "PRJ-2026-089",
        projectName: "Dialog Axiata 3D Acrylic Rooftop Pylon",
        customer: "Dialog Axiata PLC",
        paymentType: "ADVANCE",
        paymentDate: twoDaysAgo,
        paymentMethod: "BANK TRANSFER",
        amount: 726000, // Exactly 30% of 2,420,000
        referenceNo: "TXN-DIA-99412",
        evidenceFile: null,
        recordedBy: null,
        createdDate: twoDaysAgo + " 02:15 PM"
      },
      {
        paymentId: "DEMO-PAY-004",
        projectId: "PRJ-2026-071",
        projectName: "Singer Mega Colombo Neon & Fascia Displays",
        customer: "Singer (Sri Lanka) PLC",
        paymentType: "ADVANCE",
        paymentDate: fourDaysAgo,
        paymentMethod: "BANK TRANSFER",
        amount: 780000, // Exactly 30% of 2,600,000
        referenceNo: "SNG-TRF-00941",
        evidenceFile: null,
        recordedBy: null,
        createdDate: fourDaysAgo + " 11:30 AM"
      },
      {
        paymentId: "DEMO-PAY-003",
        projectId: "PRJ-2026-074",
        projectName: "Keells Supermarket Facade ACP Signage",
        customer: "JayKay Marketing Services (Pvt) Ltd",
        paymentType: "FINAL",
        paymentDate: sixDaysAgo,
        paymentMethod: "CASH",
        amount: 1260000, // 1,800,000 - 540,000 = 1,260,000
        referenceNo: "RCP-KLS-4421",
        evidenceFile: null,
        recordedBy: null,
        createdDate: sixDaysAgo + " 04:00 PM"
      },
      {
        paymentId: "DEMO-PAY-002",
        projectId: "PRJ-2026-074",
        projectName: "Keells Supermarket Facade ACP Signage",
        customer: "JayKay Marketing Services (Pvt) Ltd",
        paymentType: "ADVANCE",
        paymentDate: getColomboOffsetDateString(-14),
        paymentMethod: "BANK TRANSFER",
        amount: 540000, // Exactly 30% of 1,800,000
        referenceNo: "JK-ONLINE-9921",
        evidenceFile: null,
        recordedBy: null,
        createdDate: getColomboOffsetDateString(-14) + " 09:20 AM"
      },
      {
        paymentId: "DEMO-PAY-001",
        projectId: "PRJ-2026-068",
        projectName: "Commercial Bank Wayfinding Signage & Branch Totems",
        customer: "Commercial Bank of Ceylon PLC",
        paymentType: "FINAL",
        paymentDate: getColomboOffsetDateString(-18),
        paymentMethod: "BANK TRANSFER",
        amount: 1645000, // 2,350,000 - 705,000 = 1,645,000
        referenceNo: "COMB-EFT-7712",
        evidenceFile: null,
        recordedBy: null,
        createdDate: getColomboOffsetDateString(-18) + " 03:40 PM"
      }
    ];

    // --- 4. STATE & PAGINATION VARIABLES ---
    let currentPage = 1;
    const recordsPerPage = 6;
    let filteredRecords = [...paymentRecords];
    let isAmountManuallyEdited = false;

    // --- 5. FORMATTING UTILITIES ---
    function formatLKR(amount) {
      return "LKR " + Number(amount || 0).toLocaleString("en-LK");
    }

    function escapeHTML(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function showToast(title, message, isSuccess = true) {
      const toast = document.getElementById("toastNotification");
      const toastTitle = document.getElementById("toastTitle");
      const toastMessage = document.getElementById("toastMessage");
      const iconContainer = document.getElementById("toastIconContainer");

      if (!toast || !toastTitle || !toastMessage || !iconContainer) return;

      toastTitle.textContent = title;
      toastMessage.textContent = message;

      if (isSuccess) {
        iconContainer.className = "p-1 rounded bg-blue-900/40 text-blue-400 mt-0.5 flex-shrink-0";
        iconContainer.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
      } else {
        iconContainer.className = "p-1 rounded bg-rose-900/40 text-rose-400 mt-0.5 flex-shrink-0";
        iconContainer.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      }

      toast.classList.remove("translate-y-24", "opacity-0");
      setTimeout(() => {
        toast.classList.add("translate-y-24", "opacity-0");
      }, 4200);
    }

    // --- 6. LEDGER & CALCULATIONS HELPER ---
    function getProjectFinancialLedger(projectId) {
      const proj = commercialProjects.find(p => p.projectId === projectId);
      if (!proj) return null;

      const projectPmts = paymentRecords.filter(p => p.projectId === projectId);

      const advancePaid = projectPmts
        .filter(p => p.paymentType === "ADVANCE")
        .reduce((sum, p) => sum + p.amount, 0);

      const finalPaid = projectPmts
        .filter(p => p.paymentType === "FINAL")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPaid = advancePaid + finalPaid;

      // Advance calculation: 30% baseline from accepted quotation amount
      const requiredAdvance = Math.round(proj.acceptedQuotationAmount * 0.30);
      const remainingAdvance = Math.max(0, requiredAdvance - advancePaid);

      // Final invoice calculation
      const invoiceTotal = proj.isInvoiceIssued ? proj.invoiceAmount : 0;
      const outstandingInvoiceBalance = Math.max(0, invoiceTotal - totalPaid);

      return {
        ...proj,
        requiredAdvance,
        advancePaid,
        remainingAdvance,
        invoiceTotal,
        finalPaid,
        totalPaid,
        outstandingInvoiceBalance,
        paymentsCount: projectPmts.length
      };
    }

    // --- 7. SUMMARY CARDS ENGINE ---
    function updateSummaryCards() {
      const totalSum = paymentRecords.reduce((sum, p) => sum + p.amount, 0);
      const advanceSum = paymentRecords
        .filter(p => p.paymentType === "ADVANCE")
        .reduce((sum, p) => sum + p.amount, 0);
      const finalSum = paymentRecords
        .filter(p => p.paymentType === "FINAL")
        .reduce((sum, p) => sum + p.amount, 0);

      // Recent 7 days in Asia/Colombo: from sevenDaysAgoStr up to todayStr (strictly excluding future dates > todayStr)
      const currentToday = getColomboDateString();
      const currentSevenDaysAgo = getColomboOffsetDateString(-7);

      const recentSum = paymentRecords
        .filter(p => p.paymentDate >= currentSevenDaysAgo && p.paymentDate <= currentToday)
        .reduce((sum, p) => sum + p.amount, 0);

      document.getElementById("cardTotalPaymentsAmount").textContent = formatLKR(totalSum);
      document.getElementById("cardTotalPaymentsCount").innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"></span>${paymentRecords.length} Payments Recorded`;

      document.getElementById("cardAdvancePaymentsAmount").textContent = formatLKR(advanceSum);
      const advCount = paymentRecords.filter(p => p.paymentType === "ADVANCE").length;
      document.getElementById("cardAdvancePaymentsCount").innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>${advCount} Advance Payments`;

      document.getElementById("cardFinalPaymentsAmount").textContent = formatLKR(finalSum);
      const finCount = paymentRecords.filter(p => p.paymentType === "FINAL").length;
      document.getElementById("cardFinalPaymentsCount").innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>${finCount} Final Payments`;

      document.getElementById("cardRecentPaymentsAmount").textContent = formatLKR(recentSum);
      document.getElementById("cardRecentPaymentsDate").innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>Payments in Last 7 Days`;
    }

    // --- 8. FILTER & SEARCH ENGINE ---
    function applyFilters() {
      const searchTerm = document.getElementById("paymentSearchInput").value.trim().toLowerCase();
      const typeFilter = document.getElementById("filterPaymentType").value;
      const methodFilter = document.getElementById("filterPaymentMethod").value;
      const dateFilter = document.getElementById("filterDateRange").value;

      filteredRecords = paymentRecords.filter(p => {
        // Search
        if (searchTerm) {
          const matchId = p.paymentId.toLowerCase().includes(searchTerm);
          const matchProjId = p.projectId.toLowerCase().includes(searchTerm);
          const matchProjName = p.projectName.toLowerCase().includes(searchTerm);
          const matchCust = p.customer.toLowerCase().includes(searchTerm);
          const matchRef = (p.referenceNo || "").toLowerCase().includes(searchTerm);
          if (!matchId && !matchProjId && !matchProjName && !matchCust && !matchRef) return false;
        }

        // Type
        if (typeFilter !== "ALL" && p.paymentType !== typeFilter) return false;

        // Method
        if (methodFilter !== "ALL" && p.paymentMethod !== methodFilter) return false;

        // Dynamic Date Period
        if (dateFilter === "THIS_MONTH") {
          if (!p.paymentDate.startsWith(thisMonthPrefix)) return false;
        } else if (dateFilter === "PREVIOUS_MONTH") {
          if (!p.paymentDate.startsWith(prevMonthPrefix)) return false;
        }

        return true;
      });

      // Sort newest first
      filteredRecords.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

      currentPage = 1;
      renderTable();
    }

    // --- 9. TABLE RENDERING & PAGINATION ---
    function renderTable() {
      const tbody = document.getElementById("paymentTableBody");
      const emptyState = document.getElementById("tableEmptyState");
      const pageButtonsContainer = document.getElementById("pageButtons");
      const totalRecords = filteredRecords.length;

      tbody.innerHTML = "";

      if (totalRecords === 0) {
        emptyState.classList.remove("hidden");
        document.getElementById("paginationInfo").innerHTML = `Showing <span class="text-white font-bold">0</span> to <span class="text-white font-bold">0</span> of <span class="text-white font-bold">0</span> records`;
        document.getElementById("pageStart").textContent = "0";
        document.getElementById("pageEnd").textContent = "0";
        document.getElementById("pageTotal").textContent = "0";
        document.getElementById("prevPageBtn").disabled = true;
        document.getElementById("nextPageBtn").disabled = true;
        pageButtonsContainer.innerHTML = ""; // Clear all page buttons when empty
        return;
      }

      emptyState.classList.add("hidden");

      const totalPages = Math.ceil(totalRecords / recordsPerPage);
      if (currentPage > totalPages) currentPage = totalPages;

      const startIndex = (currentPage - 1) * recordsPerPage;
      const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
      const currentSlice = filteredRecords.slice(startIndex, endIndex);

      currentSlice.forEach(record => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/40 transition-colors";

        let typeBadge = "";
        if (record.paymentType === "ADVANCE") {
          typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">ADVANCE</span>`;
        } else {
          typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">FINAL</span>`;
        }

        let methodBadge = "";
        if (record.paymentMethod === "BANK TRANSFER") {
          methodBadge = `<span class="text-[11px] text-slate-300 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>BANK TRF</span>`;
        } else {
          methodBadge = `<span class="text-[11px] text-slate-300 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>CASH</span>`;
        }

        tr.innerHTML = `
          <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
            ${escapeHTML(record.paymentId)}
            ${record.referenceNo ? `<span class="text-[10px] text-slate-500 block font-normal font-sans truncate max-w-[120px]" title="${escapeHTML(record.referenceNo)}">Ref: ${escapeHTML(record.referenceNo)}</span>` : ''}
          </td>
          <td class="py-3 px-4 font-mono text-blue-300 text-xs whitespace-nowrap">
            ${escapeHTML(record.projectId)}
          </td>
          <td class="py-3 px-4 font-medium text-slate-100 max-w-xs truncate" title="${escapeHTML(record.projectName)}">
            ${escapeHTML(record.projectName)}
          </td>
          <td class="py-3 px-4 text-slate-300 text-xs truncate max-w-[150px]" title="${escapeHTML(record.customer)}">
            ${escapeHTML(record.customer)}
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            ${typeBadge}
          </td>
          <td class="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
            ${escapeHTML(record.paymentDate)}
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            ${methodBadge}
          </td>
          <td class="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
            ${formatLKR(record.amount)}
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            <button
              data-id="${escapeHTML(record.paymentId)}"
              class="view-details-btn px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors inline-flex items-center gap-1"
            >
              <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>View</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Update Pagination Indicators
      document.getElementById("pageStart").textContent = startIndex + 1;
      document.getElementById("pageEnd").textContent = endIndex;
      document.getElementById("pageTotal").textContent = totalRecords;
      document.getElementById("prevPageBtn").disabled = currentPage === 1;
      document.getElementById("nextPageBtn").disabled = currentPage === totalPages;

      // Update Page Numbers
      pageButtonsContainer.innerHTML = "";
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = i === currentPage
          ? "w-8 h-8 rounded-lg bg-blue-600 text-white font-bold"
          : "w-8 h-8 rounded-lg border border-[#1e293b] bg-[#0b1326] text-slate-400 hover:text-white";
        btn.onclick = () => { currentPage = i; renderTable(); };
        pageButtonsContainer.appendChild(btn);
      }
    }

    // --- 10. RECORD PAYMENT MODAL LOGIC & FINANCIAL PANEL ---
    function populateProjectSelectDropdown() {
      const select = document.getElementById("modalProjectSelect");
      select.innerHTML = `<option value="">-- Choose Project with Accepted Quotation or Final Invoice --</option>`;

      commercialProjects.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.projectId;
        const invoiceTag = p.isInvoiceIssued ? `[Invoice: ${p.finalInvoiceNo}]` : `[Quotation: ${p.acceptedQuotationNo} - No Invoice]`;
        opt.textContent = `${p.projectId} - ${p.projectName} (${p.customer}) ${invoiceTag}`;
        select.appendChild(opt);
      });
    }

    function updateModalFinancialLedger() {
      const projectId = document.getElementById("modalProjectSelect").value;
      const typeRadio = document.querySelector('input[name="modalPaymentType"]:checked');
      const paymentType = typeRadio ? typeRadio.value : "ADVANCE";
      const panel = document.getElementById("projectFinancialSummaryPanel");
      const amountInput = document.getElementById("modalPaymentAmount");
      const helper = document.getElementById("amountHelperText");

      if (!projectId) {
        panel.className = "p-4 rounded-xl border border-slate-800 bg-[#0e172a] text-slate-500 text-center";
        panel.innerHTML = `<p class="italic">Please select a commercial project to view its real-time financial ledger & validation baseline.</p>`;
        if (!isAmountManuallyEdited) amountInput.value = "";
        return;
      }

      const ledger = getProjectFinancialLedger(projectId);
      if (!ledger) return;

      if (paymentType === "ADVANCE") {
        panel.className = "p-4 rounded-xl border border-indigo-900/50 bg-indigo-950/20 space-y-2 text-xs";
        const isTargetMet = ledger.remainingAdvance <= 0;

        panel.innerHTML = `
          <div class="flex items-center justify-between border-b border-indigo-900/40 pb-2">
            <span class="font-semibold text-indigo-200 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Advance Payment Financial Ledger (30% Baseline)
            </span>
            <span class="font-mono text-[11px] text-slate-400">Ref: ${escapeHTML(ledger.acceptedQuotationNo)}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <span class="text-slate-400 text-[10px] block">Accepted Quotation:</span>
              <span class="font-mono font-bold text-white text-xs">${formatLKR(ledger.acceptedQuotationAmount)}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Required 30% Advance:</span>
              <span class="font-mono font-bold text-indigo-300 text-xs">${formatLKR(ledger.requiredAdvance)}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Advance Already Paid:</span>
              <span class="font-mono font-bold text-emerald-400 text-xs">${formatLKR(ledger.advancePaid)}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Remaining Advance:</span>
              <span class="font-mono font-bold ${ledger.remainingAdvance > 0 ? 'text-amber-400' : 'text-emerald-400'} text-xs">
                ${formatLKR(ledger.remainingAdvance)}
              </span>
            </div>
          </div>

          <div class="pt-2 border-t border-indigo-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>Workflow Status: Advance payments can be recorded before the final invoice is created.</span>
            ${isTargetMet ? '<span class="text-emerald-400 font-semibold">✓ 30% Advance Satisfied (No further advance allowed)</span>' : '<span class="text-amber-400">Mobilization Deposit Pending</span>'}
          </div>
        `;

        if (!isAmountManuallyEdited) {
          amountInput.value = ledger.remainingAdvance > 0 ? ledger.remainingAdvance : "";
        }
        helper.textContent = isTargetMet
          ? "30% advance target is fully settled. Additional ADVANCE payments cannot be accepted."
          : `Target 30% advance: ${formatLKR(ledger.requiredAdvance)}. Remaining needed: ${formatLKR(ledger.remainingAdvance)}. Max allowed: ${formatLKR(ledger.remainingAdvance)}.`;

      } else {
        // FINAL PAYMENT PANEL
        if (!ledger.isInvoiceIssued) {
          panel.className = "p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs space-y-2";
          panel.innerHTML = `
            <div class="flex items-center gap-2 text-rose-400 font-bold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              FINAL INVOICE REQUIRED FOR FINAL PAYMENT
            </div>
            <p class="text-slate-300 leading-relaxed">
              According to business rules, <span class="text-white font-semibold">FINAL payments must be linked directly to a final invoice</span>. Project <span class="font-mono text-rose-300">${escapeHTML(ledger.projectId)}</span> does not have an issued final invoice yet.
            </p>
            <p class="text-[11px] text-slate-400">
              Please switch to <span class="text-indigo-400 font-semibold cursor-pointer underline" onclick="document.querySelector('input[name=modalPaymentType][value=ADVANCE]').checked=true; isAmountManuallyEdited=false; updateModalFinancialLedger();">ADVANCE</span> payment or generate the final invoice in Invoice Management.
            </p>
          `;
          if (!isAmountManuallyEdited) amountInput.value = "";
          helper.textContent = "Final payments locked until final invoice is issued.";
          return;
        }

        panel.className = "p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 space-y-2 text-xs";
        panel.innerHTML = `
          <div class="flex items-center justify-between border-b border-emerald-900/40 pb-2">
            <span class="font-semibold text-emerald-200 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Final Invoice Settlement Ledger
            </span>
            <span class="font-mono text-[11px] text-blue-300">Invoice: ${escapeHTML(ledger.finalInvoiceNo)}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <span class="text-slate-400 text-[10px] block">Invoice Total:</span>
              <span class="font-mono font-bold text-white text-xs">${formatLKR(ledger.invoiceTotal)}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Amount Already Paid:</span>
              <span class="font-mono font-bold text-emerald-400 text-xs">${formatLKR(ledger.totalPaid)}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Advance Deducted:</span>
              <span class="font-mono text-slate-300 text-xs">${formatLKR(ledger.advancePaid)}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Outstanding Balance:</span>
              <span class="font-mono font-bold ${ledger.outstandingInvoiceBalance > 0 ? 'text-amber-400' : 'text-emerald-400'} text-xs">
                ${formatLKR(ledger.outstandingInvoiceBalance)}
              </span>
            </div>
          </div>

          <div class="pt-2 border-t border-emerald-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>Linked to final invoice. Overpayment beyond outstanding balance is strictly blocked.</span>
            <span class="font-mono text-emerald-400">Max Allowed: ${formatLKR(ledger.outstandingInvoiceBalance)}</span>
          </div>
        `;

        if (!isAmountManuallyEdited) {
          amountInput.value = ledger.outstandingInvoiceBalance > 0 ? ledger.outstandingInvoiceBalance : "";
        }
        helper.textContent = `Outstanding Invoice Balance: ${formatLKR(ledger.outstandingInvoiceBalance)}. Overpayment prohibited.`;
      }
    }

    function openRecordModal() {
      populateProjectSelectDropdown();
      document.getElementById("modalPaymentDate").value = getColomboDateString();
      document.getElementById("modalPaymentDate").removeAttribute("max");

      isAmountManuallyEdited = false;
      document.getElementById("modalPaymentAmount").value = "";
      document.getElementById("modalPaymentRef").value = "";
      document.getElementById("modalEvidenceUpload").value = "";
      document.querySelector('input[name="modalPaymentType"][value="ADVANCE"]').checked = true;

      updateModalFinancialLedger();
      document.getElementById("recordPaymentModal").classList.remove("hidden");
    }

    function closeRecordModal() {
      document.getElementById("recordPaymentModal").classList.add("hidden");
    }

    function handleRecordPaymentSubmit(e) {
      e.preventDefault();
      const projectId = document.getElementById("modalProjectSelect").value;
      const typeRadio = document.querySelector('input[name="modalPaymentType"]:checked');
      const paymentType = typeRadio ? typeRadio.value : "ADVANCE";
      const paymentDate = document.getElementById("modalPaymentDate").value;
      const paymentMethod = document.getElementById("modalPaymentMethod").value;
      const rawAmountStr = document.getElementById("modalPaymentAmount").value.trim();
      const refNo = document.getElementById("modalPaymentRef").value.trim();
      const evidenceFileInput = document.getElementById("modalEvidenceUpload");
      const evidenceFile = evidenceFileInput.files && evidenceFileInput.files[0] ? evidenceFileInput.files[0] : null;

      if (!projectId) {
        showToast("Validation Error", "Please select a valid commercial project.", false);
        return;
      }

      const ledger = getProjectFinancialLedger(projectId);
      if (!ledger) {
        showToast("Error", "Commercial project records could not be resolved.", false);
        return;
      }

      // Robust Amount Validation: Positive integer only, no silent rounding, safe integer checks
      if (!/^\d+$/.test(rawAmountStr)) {
        showToast("Validation Error", "Payment amount must contain whole numbers only without decimals or letters.", false);
        return;
      }

      const numVal = Number(rawAmountStr);
      if (!Number.isSafeInteger(numVal) || numVal <= 0 || numVal > Number.MAX_SAFE_INTEGER) {
        showToast("Validation Error", "Payment amount must be a positive whole integer greater than zero.", false);
        return;
      }

      const amount = numVal;

      // Business Rule: ADVANCE payments cannot exceed remaining 30% advance deposit limit
      if (paymentType === "ADVANCE") {
        if (ledger.remainingAdvance <= 0) {
          showToast("Governance Block", "The 30% advance deposit has already been reached for this project. Further advance payments are not allowed.", false);
          return;
        }
        if (amount > ledger.remainingAdvance) {
          showToast(
            "Advance Deposit Limit Exceeded",
            `Entered advance amount ${formatLKR(amount)} exceeds the remaining 30% deposit allowance of ${formatLKR(ledger.remainingAdvance)}. Partial payments up to this limit are permitted.`,
            false
          );
          return;
        }
      }

      // Business Rule: FINAL payments must be linked to the final invoice and not exceed outstanding balance
      if (paymentType === "FINAL") {
        if (!ledger.isInvoiceIssued) {
          showToast("Governance Block", "Cannot record FINAL payment: No final invoice has been generated for this project.", false);
          return;
        }

        if (amount > ledger.outstandingInvoiceBalance) {
          showToast(
            "Overpayment Prohibited",
            `Amount of ${formatLKR(amount)} exceeds outstanding invoice balance of ${formatLKR(ledger.outstandingInvoiceBalance)}.`,
            false
          );
          return;
        }
      }

      // Frontend demo identifier notation indicating backend generation responsibility
      const demoIdentifier = `DEMO-PAY-${String(paymentRecords.length + 1).padStart(3, "0")}`;

      const newRecord = {
        paymentId: demoIdentifier,
        projectId: ledger.projectId,
        projectName: ledger.projectName,
        customer: ledger.customer,
        paymentType: paymentType,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        amount: amount,
        referenceNo: refNo || null,
        evidenceFile: evidenceFile ? `${evidenceFile.name} (Local client file selected - not uploaded in prototype)` : null,
        recordedBy: null, // Displayed as "Not available in prototype"
        createdDate: paymentDate + " " + new Intl.DateTimeFormat('en-US', { timeZone: SL_TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(new Date())
      };

      paymentRecords.unshift(newRecord);

      showToast(
        "Payment Logged",
        `Payment ${demoIdentifier} of ${formatLKR(amount)} recorded in memory for ${ledger.projectName}. (Actual ID assigned by server).`
      );

      closeRecordModal();
      updateSummaryCards();
      applyFilters();
    }

    // --- 11. PAYMENT DETAILS AUDIT MODAL ---
    function openPaymentDetails(paymentId) {
      const record = paymentRecords.find(p => p.paymentId === paymentId);
      if (!record) return;

      const proj = commercialProjects.find(p => p.projectId === record.projectId);

      document.getElementById("detailPaymentIdBadge").textContent = record.paymentId;
      document.getElementById("detailAmountDisplay").textContent = formatLKR(record.amount);

      const badgeContainer = document.getElementById("detailTypeBadgeContainer");
      if (record.paymentType === "ADVANCE") {
        badgeContainer.innerHTML = `<span class="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">ADVANCE</span>`;
      } else {
        badgeContainer.innerHTML = `<span class="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">FINAL INVOICE SETTLEMENT</span>`;
      }

      document.getElementById("detailProjectName").textContent = record.projectName;
      document.getElementById("detailProjectId").textContent = record.projectId;
      document.getElementById("detailCustomerName").textContent = record.customer;
      document.getElementById("detailPaymentDate").textContent = record.paymentDate;
      document.getElementById("detailPaymentMethod").textContent = record.paymentMethod;

      if (record.paymentType === "ADVANCE") {
        document.getElementById("detailCommercialRef").textContent = proj ? `Accepted Quote: ${proj.acceptedQuotationNo}` : "Accepted Quotation Baseline";
      } else {
        document.getElementById("detailCommercialRef").textContent = proj && proj.finalInvoiceNo ? `Final Invoice: ${proj.finalInvoiceNo}` : "Final Invoice";
      }

      document.getElementById("detailTxnRef").textContent = record.referenceNo || "Not provided";

      const evidenceDoc = document.getElementById("detailEvidenceFile");
      if (record.evidenceFile) {
        evidenceDoc.innerHTML = `<span class="inline-flex items-center gap-1 text-blue-400 font-mono"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg> ${escapeHTML(record.evidenceFile)}</span>`;
      } else {
        evidenceDoc.textContent = "No document attached (optional)";
      }

      document.getElementById("detailRecordedBy").textContent = record.recordedBy || "Not available in prototype";
      document.getElementById("detailCreatedDate").textContent = record.createdDate || record.paymentDate;

      document.getElementById("paymentDetailsModal").classList.remove("hidden");
    }

    function closePaymentDetails() {
      document.getElementById("paymentDetailsModal").classList.add("hidden");
    }

    // --- 12. INITIALIZATION & EVENT LISTENERS ---
    document.addEventListener("DOMContentLoaded", () => {
      // Dynamic period labels in filter using Asia/Colombo timezone
      const currentMonthLabel = colomboMonthFormatter.format(new Date());
      const prevMonthLabel = colomboMonthFormatter.format(prevMonthDate);

      const dateSelect = document.getElementById("filterDateRange");
      if (dateSelect) {
        const thisMonthOpt = dateSelect.querySelector('option[value="THIS_MONTH"]');
        const prevMonthOpt = dateSelect.querySelector('option[value="PREVIOUS_MONTH"]');
        if (thisMonthOpt) thisMonthOpt.textContent = `This Month (${currentMonthLabel})`;
        if (prevMonthOpt) prevMonthOpt.textContent = `Previous Month (${prevMonthLabel})`;
      }

      updateSummaryCards();
      applyFilters();

      // Mobile Drawer Toggle
      const toggleBtn = document.getElementById("toggleSidebarBtn");
      const sidebar = document.getElementById("sidebar");
      const backdrop = document.getElementById("sidebarBackdrop");

      if (toggleBtn && sidebar && backdrop) {
        toggleBtn.addEventListener("click", () => {
          sidebar.classList.toggle("-translate-x-full");
          backdrop.classList.toggle("hidden");
        });
        backdrop.addEventListener("click", () => {
          sidebar.classList.add("-translate-x-full");
          backdrop.classList.add("hidden");
        });
      }

      // Search & Filters Listeners
      document.getElementById("paymentSearchInput").addEventListener("input", applyFilters);
      document.getElementById("filterPaymentType").addEventListener("change", applyFilters);
      document.getElementById("filterPaymentMethod").addEventListener("change", applyFilters);
      document.getElementById("filterDateRange").addEventListener("change", applyFilters);

      document.getElementById("resetFiltersBtn").addEventListener("click", () => {
        document.getElementById("paymentSearchInput").value = "";
        document.getElementById("filterPaymentType").value = "ALL";
        document.getElementById("filterPaymentMethod").value = "ALL";
        document.getElementById("filterDateRange").value = "ALL";
        applyFilters();
      });

      // Pagination Listeners
      document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable();
        }
      });
      document.getElementById("nextPageBtn").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        if (currentPage < totalPages) {
          currentPage++;
          renderTable();
        }
      });

      // Record Modal Open/Close
      document.getElementById("openRecordPaymentBtn").addEventListener("click", openRecordModal);
      document.getElementById("closeRecordModalBtn").addEventListener("click", closeRecordModal);
      document.getElementById("cancelRecordModalBtn").addEventListener("click", closeRecordModal);
      document.getElementById("recordPaymentForm").addEventListener("submit", handleRecordPaymentSubmit);

      // Track manual edits on modal amount input
      const amountInputEl = document.getElementById("modalPaymentAmount");
      amountInputEl.addEventListener("input", () => {
        isAmountManuallyEdited = true;
      });

      // Modal Dynamic Ledger Change Triggers
      document.getElementById("modalProjectSelect").addEventListener("change", () => {
        isAmountManuallyEdited = false; // Reset manual edit flag on project switch
        updateModalFinancialLedger();
      });

      document.querySelectorAll('input[name="modalPaymentType"]').forEach(radio => {
        radio.addEventListener("change", () => {
          isAmountManuallyEdited = false; // Reset manual edit flag on payment type switch
          updateModalFinancialLedger();
        });
      });

      // Details Modal Close
      document.getElementById("closeDetailsModalBtn").addEventListener("click", closePaymentDetails);
      document.getElementById("dismissDetailsModalBtn").addEventListener("click", closePaymentDetails);

      // Table Action Event Delegation for "View Details"
      document.getElementById("paymentTableBody").addEventListener("click", e => {
        const btn = e.target.closest(".view-details-btn");
        if (btn) {
          const id = btn.getAttribute("data-id");
          openPaymentDetails(id);
        }
      });

      // Escape Key Dismissal
      document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
          closeRecordModal();
          closePaymentDetails();
          if (sidebar && !sidebar.classList.contains("-translate-x-full")) {
            sidebar.classList.add("-translate-x-full");
            backdrop.classList.add("hidden");
          }
        }
      });
    });
