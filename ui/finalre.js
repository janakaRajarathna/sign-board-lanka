    // Master Projects Dataset (Audited and Corrected)
    const masterProjects = [
      {
        projectId: 'PRJ-2026-089',
        projectName: 'Dialog Axiata 3D Acrylic Rooftop Pylon',
        clientName: 'Dialog Axiata PLC',
        siteInfo: 'Union Place Headquarters, Colombo 02',
        invoiceNo: 'INV-2026-089',
        invoiceDate: '2026-11-02',
        quotationAmount: 2420000,
        invoiceAmount: 2420000,
        payments: [
          { paymentId: 'PAY-2026-006', paymentDate: '2026-11-18', paymentType: 'FINAL', paymentMethod: 'BANK TRANSFER', amount: 1694000, recordedBy: 'Not available in prototype' },
          { paymentId: 'PAY-2026-005', paymentDate: '2026-11-14', paymentType: 'ADVANCE', paymentMethod: 'BANK TRANSFER', amount: 726000, recordedBy: 'Not available in prototype' }
        ]
      },
      {
        projectId: 'PRJ-2026-074',
        projectName: 'Keells Supermarket Facade ACP Signage',
        clientName: 'Jaykay Marketing Services (Pvt) Ltd',
        siteInfo: 'Thimbirigasyaya Super Store',
        invoiceNo: 'INV-2026-074',
        invoiceDate: '2026-11-01',
        quotationAmount: 1800000,
        invoiceAmount: 1800000,
        payments: [
          { paymentId: 'PAY-2026-004', paymentDate: '2026-11-12', paymentType: 'FINAL', paymentMethod: 'CASH', amount: 1260000, recordedBy: 'Not available in prototype' },
          { paymentId: 'PAY-2026-003', paymentDate: '2026-11-08', paymentType: 'ADVANCE', paymentMethod: 'BANK TRANSFER', amount: 540000, recordedBy: 'Not available in prototype' }
        ]
      },
      {
        projectId: 'PRJ-2026-071',
        projectName: 'Singer Mega Colombo Neon & Fascia Displays',
        clientName: 'Singer (Sri Lanka) PLC',
        siteInfo: 'Duplication Road Flagship Store',
        invoiceNo: 'INV-2026-071',
        invoiceDate: '2026-10-28',
        quotationAmount: 2600000,
        invoiceAmount: 2600000,
        payments: [
          { paymentId: 'PAY-2026-002', paymentDate: '2026-11-06', paymentType: 'ADVANCE', paymentMethod: 'BANK TRANSFER', amount: 780000, recordedBy: 'Not available in prototype' }
        ]
      },
      {
        projectId: 'PRJ-2026-068',
        projectName: 'Commercial Bank Wayfinding Signage & Branch Pylon',
        clientName: 'Commercial Bank of Ceylon PLC',
        siteInfo: 'Kollupitiya Regional Office',
        invoiceNo: 'INV-2026-068',
        invoiceDate: '2026-10-25',
        quotationAmount: 2350000,
        invoiceAmount: 2350000,
        payments: [
          { paymentId: 'PAY-2026-001', paymentDate: '2026-11-04', paymentType: 'FINAL', paymentMethod: 'BANK TRANSFER', amount: 1152000, recordedBy: 'Not available in prototype' },
          { paymentId: 'PAY-2026-001A', paymentDate: '2026-11-01', paymentType: 'ADVANCE', paymentMethod: 'BANK TRANSFER', amount: 705000, recordedBy: 'Not available in prototype' }
        ]
      },
      {
        projectId: 'PRJ-2026-052',
        projectName: 'Odel Mall Atrium Suspended Architectural Signage',
        clientName: 'Softlogic Retail Holdings',
        siteInfo: 'Odel Alexandra Place, Colombo 07',
        invoiceNo: 'INV-2026-052',
        invoiceDate: '2026-10-14',
        quotationAmount: 1200000,
        invoiceAmount: 1200000,
        payments: []
      }
    ];

    // Helper: Compute project aggregates
    function getProjectFinancials(proj) {
      const today = getColomboToday();
      const paid = proj.payments.reduce((acc, p) => {
        const paymentDate = parseDateOnly(p.paymentDate);
        return paymentDate && paymentDate <= today ? acc + p.amount : acc;
      }, 0);
      const outstanding = Math.max(0, proj.invoiceAmount - paid);
      let status = 'UNPAID';
      if (paid >= proj.invoiceAmount && proj.invoiceAmount > 0) {
        status = 'PAID';
      } else if (paid > 0) {
        status = 'PARTIALLY PAID';
      }
      return { paid, outstanding, status };
    }

    function getColomboToday() {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const year = Number(parts.find(part => part.type === 'year').value);
      const month = Number(parts.find(part => part.type === 'month').value);
      const day = Number(parts.find(part => part.type === 'day').value);
      return new Date(Date.UTC(year, month - 1, day));
    }

    function parseDateOnly(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.split('-').map(Number);
      if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) return null;
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return null;
      return date;
    }

    function formatDateOnly(date) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function getDateRangeForTimeframe(timeframe) {
      const today = getColomboToday();
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      let start, end;

      if (timeframe === 'today') {
        start = today;
        end = today;
      } else if (timeframe === 'week') {
        start = new Date(today);
        start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
        end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 6);
      } else if (timeframe === 'month') {
        start = new Date(Date.UTC(year, month, 1));
        end = new Date(Date.UTC(year, month + 1, 0));
      } else if (timeframe === 'prev_month') {
        start = new Date(Date.UTC(year, month - 1, 1));
        end = new Date(Date.UTC(year, month, 0));
      } else if (timeframe === 'year') {
        start = new Date(Date.UTC(year, 0, 1));
        end = new Date(Date.UTC(year, 11, 31));
      } else if (timeframe === 'custom') {
        return getCustomDateRange();
      } else {
        start = new Date(Date.UTC(2000, 0, 1));
        end = new Date(Date.UTC(2099, 11, 31));
      }

      return { start, end };
    }

    function getCustomDateRange() {
      const start = parseDateOnly(document.getElementById('customStartDate').value);
      const end = parseDateOnly(document.getElementById('customEndDate').value);
      let message = '';

      if (!start || !end) {
        message = 'Select both custom dates. Reports remain on the previous valid range until corrected.';
      } else if (start > end) {
        message = 'Start date must be on or before end date. Reports remain on the previous valid range until corrected.';
      }

      const error = document.getElementById('customDateError');
      error.textContent = message;
      error.classList.toggle('hidden', !message);

      return message ? null : { start, end };
    }

    function isDateInRange(dateStr, range) {
      const date = parseDateOnly(dateStr);
      return date !== null && date >= range.start && date <= range.end;
    }

    // Number formatting helper
    function fmt(n) {
      return Number(n).toLocaleString('en-US');
    }

    // Safe DOM creator helpers
    function createEl(tag, classNames = '', text = '') {
      const el = document.createElement(tag);
      if (classNames) el.className = classNames;
      if (text !== '') el.textContent = text;
      return el;
    }

    // Tab Navigation
    function switchReportTab(tabId) {
      const tabs = ['tab1', 'tab2', 'tab3', 'tab4'];
      tabs.forEach((t, index) => {
        const btn = document.getElementById(`navTab${index + 1}`);
        const content = document.getElementById(`tabContent${index + 1}`);
        if (t === tabId) {
          btn.className = 'px-space-md py-space-sm flex items-center gap-space-xs font-label-md text-label-md tracking-wider transition-all bg-primary-container text-on-primary-container font-semibold';
          content.classList.remove('hidden');
          content.classList.add('block');
        } else {
          btn.className = 'px-space-md py-space-sm flex items-center gap-space-xs font-label-md text-label-md tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all';
          content.classList.remove('block');
          content.classList.add('hidden');
        }
      });
    }

    // Global Timeframe Change Handler
    function handleTimeframeChange(val) {
      const customBox = document.getElementById('customDateContainer');
      if (val === 'custom') {
        customBox.classList.remove('hidden');
        customBox.classList.add('flex');
      } else {
        customBox.classList.remove('flex');
        customBox.classList.add('hidden');
        const error = document.getElementById('customDateError');
        error.textContent = '';
        error.classList.add('hidden');
      }
      applyFilters();
    }

    function applyCustomDateRange() {
      applyFilters();
    }

    // Main Filter and Render Pipeline
    function applyFilters() {
      const globalTf = document.getElementById('globalTimeframe').value;
      const dateRange = getDateRangeForTimeframe(globalTf);
      if (!dateRange) return;

      renderKPIs(dateRange);
      renderTab1(dateRange);
      renderTab2(dateRange);
      renderTab3(dateRange);
    }

    // Update Top KPIs
    function renderKPIs(dateRange) {
      let totalInvoiced = 0;
      let totalCollected = 0;
      let totalAdvance = 0;
      let totalFinal = 0;
      let totalOutstanding = 0;
      const today = getColomboToday();

      masterProjects.filter(proj => isDateInRange(proj.invoiceDate, dateRange)).forEach(proj => {
        totalInvoiced += proj.invoiceAmount;
        totalOutstanding += getProjectFinancials(proj).outstanding;
      });

      masterProjects.forEach(proj => {
        proj.payments.forEach(p => {
          const paymentDate = parseDateOnly(p.paymentDate);
          if (!paymentDate || paymentDate > today || !isDateInRange(p.paymentDate, dateRange)) return;
          totalCollected += p.amount;
          if (p.paymentType === 'ADVANCE') totalAdvance += p.amount;
          if (p.paymentType === 'FINAL') totalFinal += p.amount;
        });
      });

      const collectionEff = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0.0';
      const exposureDelta = totalInvoiced > 0 ? ((totalOutstanding / totalInvoiced) * 100).toFixed(1) : '0.0';

      const kpiInvoiced = document.getElementById('kpiTotalInvoiced');
      kpiInvoiced.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalInvoiced)}`;

      const kpiCollected = document.getElementById('kpiTotalCollected');
      kpiCollected.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalCollected)}`;
      document.getElementById('kpiCollectedDesc').textContent = `Advance LKR ${(totalAdvance / 1000000).toFixed(2)}M + Final LKR ${(totalFinal / 1000000).toFixed(2)}M`;
      document.getElementById('kpiCollectionRate').textContent = `${collectionEff}% CLEARANCE`;

      const kpiOutstanding = document.getElementById('kpiTotalOutstanding');
      kpiOutstanding.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalOutstanding)}`;
      document.getElementById('kpiExposureRate').textContent = `${exposureDelta}% PENDING`;

      const kpiAdvance = document.getElementById('kpiTotalAdvance');
      kpiAdvance.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalAdvance)}`;
    }

    // TAB 1: Payment Collection Report
    function renderTab1(dateRange) {
      const search = (document.getElementById('tab1SearchInput').value || '').trim().toLowerCase();

      // Extract all payment records joined with project details
      let records = [];
      masterProjects.forEach(proj => {
        proj.payments.forEach(pay => {
          records.push({
            ...pay,
            projectId: proj.projectId,
            projectName: proj.projectName,
            clientName: proj.clientName
          });
        });
      });

      // Sort descending by date
      records.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

      // Filter by global date range
      const today = getColomboToday();
      records = records.filter(r => {
        const paymentDate = parseDateOnly(r.paymentDate);
        return paymentDate !== null && paymentDate <= today && isDateInRange(r.paymentDate, dateRange);
      });

      // Filter by search query
      if (search) {
        records = records.filter(r =>
          r.paymentId.toLowerCase().includes(search) ||
          r.projectId.toLowerCase().includes(search) ||
          r.projectName.toLowerCase().includes(search) ||
          r.clientName.toLowerCase().includes(search) ||
          r.paymentMethod.toLowerCase().includes(search) ||
          r.paymentType.toLowerCase().includes(search)
        );
      }

      // Calculate Metrics Strip
      let sumCollected = 0;
      let sumAdvance = 0;
      let sumFinal = 0;
      let sumCash = 0;
      let sumBank = 0;

      records.forEach(r => {
        sumCollected += r.amount;
        if (r.paymentType === 'ADVANCE') sumAdvance += r.amount;
        if (r.paymentType === 'FINAL') sumFinal += r.amount;
        if (r.paymentMethod.includes('CASH')) sumCash += r.amount;
        if (r.paymentMethod.includes('BANK')) sumBank += r.amount;
      });

      document.getElementById('stripTotalCollected').textContent = `LKR ${fmt(sumCollected)}`;
      document.getElementById('stripAdvanceCollected').textContent = `LKR ${fmt(sumAdvance)}`;
      document.getElementById('stripFinalCollected').textContent = `LKR ${fmt(sumFinal)}`;
      document.getElementById('stripCashCollected').textContent = `LKR ${fmt(sumCash)}`;
      document.getElementById('stripBankCollected').textContent = `LKR ${fmt(sumBank)}`;
      document.getElementById('stripTxnCount').textContent = `${records.length} Records`;

      // Render Table Rows
      const tbody = document.getElementById('tab1TableBody');
      tbody.textContent = '';

      if (records.length === 0) {
        const tr = createEl('tr', 'bg-surface-container-low');
        const td = createEl('td', 'py-space-md px-space-md text-center text-outline font-body-md', 'No payment records match the current filter criteria.');
        td.colSpan = 9;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        records.forEach((item, idx) => {
          const tr = createEl('tr', (idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container') + ' hover:bg-surface-container-high transition-colors');

          const tdDate = createEl('td', 'py-space-sm px-space-md text-on-surface', item.paymentDate);
          const tdId = createEl('td', 'py-space-sm px-space-md text-primary font-bold', item.paymentId);
          const tdProjNo = createEl('td', 'py-space-sm px-space-md text-on-surface-variant', item.projectId);
          const tdProjName = createEl('td', 'py-space-sm px-space-md text-on-surface font-body-md', item.projectName);
          const tdClient = createEl('td', 'py-space-sm px-space-md text-on-surface-variant font-body-md', item.clientName);

          const tdType = createEl('td', 'py-space-sm px-space-md');
          const typeBadge = createEl('span', item.paymentType === 'FINAL'
            ? 'px-space-xs py-0.5 bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold'
            : 'px-space-xs py-0.5 bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-semibold',
            item.paymentType
          );
          tdType.appendChild(typeBadge);

          const tdMethod = createEl('td', 'py-space-sm px-space-md');
          const methodBadge = createEl('span', 'px-space-xs py-0.5 bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center gap-1 w-max');
          const methodIcon = createEl('span', 'material-symbols-outlined text-[14px] ' + (item.paymentMethod.includes('CASH') ? 'text-secondary' : 'text-primary'), item.paymentMethod.includes('CASH') ? 'payments' : 'account_balance');
          const methodText = document.createTextNode(' ' + item.paymentMethod);
          methodBadge.appendChild(methodIcon);
          methodBadge.appendChild(methodText);
          tdMethod.appendChild(methodBadge);

          const tdAmt = createEl('td', 'py-space-sm px-space-md text-right text-secondary font-bold', fmt(item.amount));
          const tdBy = createEl('td', 'py-space-sm px-space-md text-outline font-body-sm italic', item.recordedBy);

          tr.appendChild(tdDate);
          tr.appendChild(tdId);
          tr.appendChild(tdProjNo);
          tr.appendChild(tdProjName);
          tr.appendChild(tdClient);
          tr.appendChild(tdType);
          tr.appendChild(tdMethod);
          tr.appendChild(tdAmt);
          tr.appendChild(tdBy);

          tbody.appendChild(tr);
        });
      }

      document.getElementById('tab1TotalSum').textContent = `LKR ${fmt(sumCollected)}`;
      document.getElementById('tab1CountSummary').textContent = `${records.length} Transactions Validated`;
      document.getElementById('tab1ShowingLabel').textContent = `Showing 1 to ${records.length} of ${records.length} transactions`;
    }

    // TAB 2: Outstanding Payments Report
    function renderTab2(dateRange) {
      const search = (document.getElementById('tab2SearchInput').value || '').trim().toLowerCase();

      // Filter projects by global date range (using project activity / invoiceDate)
      let list = masterProjects.filter(p =>
        isDateInRange(p.invoiceDate, dateRange) && getProjectFinancials(p).outstanding > 0
      );

      if (search) {
        list = list.filter(p => {
          const fin = getProjectFinancials(p);
          return p.projectId.toLowerCase().includes(search) ||
                 p.projectName.toLowerCase().includes(search) ||
                 p.clientName.toLowerCase().includes(search) ||
                 fin.status.toLowerCase().includes(search);
        });
      }

      let totalInv = 0;
      let totalPaid = 0;
      let totalOut = 0;
      let partialCount = 0;
      let unpaidCount = 0;

      const tbody = document.getElementById('tab2TableBody');
      tbody.textContent = '';

      if (list.length === 0) {
        const tr = createEl('tr', 'bg-surface-container-low');
        const td = createEl('td', 'py-space-md px-space-md text-center text-outline font-body-md', 'No projects match the current filter criteria.');
        td.colSpan = 7;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        list.forEach((proj, idx) => {
          const fin = getProjectFinancials(proj);
          totalInv += proj.invoiceAmount;
          totalPaid += fin.paid;
          totalOut += fin.outstanding;

          if (fin.status === 'PARTIALLY PAID') partialCount++;
          if (fin.status === 'UNPAID') unpaidCount++;

          const tr = createEl('tr', (idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container') + ' hover:bg-surface-container-high transition-colors');

          const tdId = createEl('td', 'py-space-sm px-space-md text-primary font-bold', proj.projectId);
          const tdName = createEl('td', 'py-space-sm px-space-md text-on-surface font-body-md', proj.projectName);
          const tdClient = createEl('td', 'py-space-sm px-space-md text-on-surface-variant font-body-md', proj.clientName);
          const tdInv = createEl('td', 'py-space-sm px-space-md text-right text-on-surface', fmt(proj.invoiceAmount));

          const tdPaid = createEl('td', 'py-space-sm px-space-md text-right text-secondary', fmt(fin.paid));
          if (fin.status === 'PARTIALLY PAID') {
            const advSpan = createEl('span', 'text-outline text-label-sm ml-1', '(Adv)');
            tdPaid.appendChild(advSpan);
          }

          const tdOut = createEl('td', 'py-space-sm px-space-md text-right ' + (fin.outstanding > 0 ? 'text-error font-bold' : 'text-outline'), fmt(fin.outstanding));

          const tdStatus = createEl('td', 'py-space-sm px-space-md text-center');
          let statusClass = 'bg-primary-container text-on-primary-container';
          if (fin.status === 'PARTIALLY PAID') statusClass = 'bg-tertiary-container text-on-tertiary-container';
          if (fin.status === 'UNPAID') statusClass = 'bg-error-container text-on-error-container';
          const badge = createEl('span', `px-space-xs py-0.5 ${statusClass} font-label-sm text-label-sm font-bold`, fin.status);
          tdStatus.appendChild(badge);

          tr.appendChild(tdId);
          tr.appendChild(tdName);
          tr.appendChild(tdClient);
          tr.appendChild(tdInv);
          tr.appendChild(tdPaid);
          tr.appendChild(tdOut);
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        });
      }

      // Update Summary Cards
      const outCard = document.getElementById('tab2TotalOutstandingCard');
      outCard.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalOut)}`;

      const partCountEl = document.getElementById('tab2PartiallyPaidCount');
      partCountEl.innerHTML = `${partialCount} <span class="font-headline-sm text-headline-sm text-outline font-normal">Projects</span>`;

      const unpCountEl = document.getElementById('tab2UnpaidCount');
      unpCountEl.innerHTML = `${unpaidCount} <span class="font-headline-sm text-headline-sm text-outline font-normal">Projects</span>`;

      // Update Footer
      document.getElementById('tab2FooterInvoiced').textContent = fmt(totalInv);
      document.getElementById('tab2FooterPaid').textContent = fmt(totalPaid);
      document.getElementById('tab2FooterOutstanding').textContent = fmt(totalOut);
    }

    // TAB 3: Invoice Report
    function renderTab3(dateRange) {
      const search = (document.getElementById('tab3SearchInput').value || '').trim().toLowerCase();

      // Filter by invoiceDate
      let list = masterProjects.filter(p => isDateInRange(p.invoiceDate, dateRange));

      if (search) {
        list = list.filter(p => {
          const fin = getProjectFinancials(p);
          return p.invoiceNo.toLowerCase().includes(search) ||
                 p.projectId.toLowerCase().includes(search) ||
                 p.projectName.toLowerCase().includes(search) ||
                 p.clientName.toLowerCase().includes(search) ||
                 fin.status.toLowerCase().includes(search);
        });
      }

      let totalInvAmt = 0;
      let totalPaidAmt = 0;

      const tbody = document.getElementById('tab3TableBody');
      tbody.textContent = '';

      if (list.length === 0) {
        const tr = createEl('tr', 'bg-surface-container-low');
        const td = createEl('td', 'py-space-md px-space-md text-center text-outline font-body-md', 'No invoices match the current filter criteria.');
        td.colSpan = 7;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        list.forEach((proj, idx) => {
          const fin = getProjectFinancials(proj);
          totalInvAmt += proj.invoiceAmount;
          totalPaidAmt += fin.paid;

          const tr = createEl('tr', (idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container') + ' hover:bg-surface-container-high transition-colors');

          const tdInvNo = createEl('td', 'py-space-sm px-space-md text-primary font-bold', proj.invoiceNo);
          const tdProjId = createEl('td', 'py-space-sm px-space-md text-on-surface-variant', proj.projectId);
          const tdName = createEl('td', 'py-space-sm px-space-md text-on-surface font-body-md', proj.projectName);
          const tdClient = createEl('td', 'py-space-sm px-space-md text-on-surface-variant font-body-md', proj.clientName);
          const tdDate = createEl('td', 'py-space-sm px-space-md text-on-surface', proj.invoiceDate);
          const tdAmt = createEl('td', 'py-space-sm px-space-md text-right text-on-surface font-bold', fmt(proj.invoiceAmount));

          const tdStatus = createEl('td', 'py-space-sm px-space-md text-center');
          let statusClass = 'bg-primary-container text-on-primary-container';
          if (fin.status === 'PARTIALLY PAID') statusClass = 'bg-tertiary-container text-on-tertiary-container';
          if (fin.status === 'UNPAID') statusClass = 'bg-error-container text-on-error-container';
          const badge = createEl('span', `px-space-xs py-0.5 ${statusClass} font-label-sm text-label-sm font-bold`, fin.status);
          tdStatus.appendChild(badge);

          tr.appendChild(tdInvNo);
          tr.appendChild(tdProjId);
          tr.appendChild(tdName);
          tr.appendChild(tdClient);
          tr.appendChild(tdDate);
          tr.appendChild(tdAmt);
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        });
      }

      // Update Summary Cards
      const docCard = document.getElementById('tab3TotalInvoicesCard');
      docCard.innerHTML = `${list.length} <span class="font-headline-sm text-headline-sm text-outline font-normal">Documents</span>`;

      const invAmtCard = document.getElementById('tab3TotalInvoicedAmtCard');
      invAmtCard.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalInvAmt)}`;

      const paidAmtCard = document.getElementById('tab3TotalPaidAmtCard');
      paidAmtCard.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(totalPaidAmt)}`;

      document.getElementById('tab3FooterInvoiced').textContent = `LKR ${fmt(totalInvAmt)}`;
    }

    // TAB 4: Project Financial Details (Explicitly exempt from global date filter per instruction)
    function loadProjectFinancialDetails(projId) {
      const proj = masterProjects.find(p => p.projectId === projId);
      if (!proj) return;

      const fin = getProjectFinancials(proj);

      // Safe header updates
      document.getElementById('detailProjTag').textContent = proj.projectId;
      const statusEl = document.getElementById('detailProjStatus');
      statusEl.textContent = fin.status;
      let statusClass = 'text-secondary';
      if (fin.status === 'PARTIALLY PAID') statusClass = 'text-tertiary';
      if (fin.status === 'UNPAID') statusClass = 'text-error';
      statusEl.className = `px-space-xs py-0.5 bg-surface-container ${statusClass} font-label-sm text-label-sm font-semibold uppercase`;

      document.getElementById('detailProjTitle').textContent = proj.projectName;
      document.getElementById('detailClientName').textContent = `Client: ${proj.clientName} | Site: ${proj.siteInfo}`;

      // Four Agreed Financial Metric Cards
      const qEl = document.getElementById('detailQuotationAmt');
      qEl.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(proj.quotationAmount)}`;

      const iEl = document.getElementById('detailInvoiceAmt');
      iEl.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(proj.invoiceAmount)}`;

      const pEl = document.getElementById('detailTotalPaid');
      pEl.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(fin.paid)}`;

      const oEl = document.getElementById('detailOutstanding');
      oEl.innerHTML = `<span class="font-label-sm text-label-sm text-outline mr-1 font-normal">LKR</span>${fmt(fin.outstanding)}`;
      oEl.className = `font-headline-md text-headline-md ${fin.outstanding > 0 ? 'text-error' : 'text-outline'} font-bold mt-1`;

      // Payment History Ledger Table: Display only Date, Payment Type, Payment Method, and Amount (LKR)
      const tbody = document.getElementById('projectLedgerBody');
      tbody.textContent = '';
      const today = getColomboToday();
      const validPayments = (proj.payments || []).filter(item => {
        const paymentDate = parseDateOnly(item.paymentDate);
        return paymentDate !== null && paymentDate <= today;
      });

      if (validPayments.length === 0) {
        const tr = createEl('tr', 'bg-surface-container-low');
        const td = createEl('td', 'py-space-md px-space-md text-center text-outline font-body-md', 'No completed payments recorded against this project.');
        td.colSpan = 4;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        validPayments.forEach((item, idx) => {
          const tr = createEl('tr', (idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container'));

          const tdDate = createEl('td', 'py-space-sm px-space-md text-on-surface', item.paymentDate);

          const tdType = createEl('td', 'py-space-sm px-space-md');
          const typeBadge = createEl('span', item.paymentType === 'FINAL'
            ? 'px-space-xs py-0.5 bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold'
            : 'px-space-xs py-0.5 bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-semibold',
            item.paymentType
          );
          tdType.appendChild(typeBadge);

          const tdMethod = createEl('td', 'py-space-sm px-space-md text-on-surface-variant', item.paymentMethod);
          const tdAmt = createEl('td', 'py-space-sm px-space-md text-right text-secondary font-bold', fmt(item.amount));

          tr.appendChild(tdDate);
          tr.appendChild(tdType);
          tr.appendChild(tdMethod);
          tr.appendChild(tdAmt);

          tbody.appendChild(tr);
        });
      }
    }

    // Export Functionality (Transparent Prototype Placeholder)
    function triggerExport(reportName, format) {
      triggerToast(
        `${format.toUpperCase()} Export`,
        `Export functionality is a prototype placeholder. Live PDF/Excel generation will be handled by the backend.`
      );
    }

    // Safe Toast Notification Display
    let toastTimeout = null;
    function triggerToast(title, message) {
      const toast = document.getElementById('toastNotification');
      document.getElementById('toastTitle').textContent = title;
      document.getElementById('toastMessage').textContent = message;

      toast.classList.remove('translate-y-[-120%]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-[-120%]', 'opacity-0');
      }, 4000);
    }

    function updateTimeframeLabels() {
      const today = getColomboToday();
      const thisWeek = getDateRangeForTimeframe('week');
      const previousMonth = getDateRangeForTimeframe('prev_month');
      const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const todayLabel = document.querySelector('#globalTimeframe option[value="today"]');
      const weekLabel = document.querySelector('#globalTimeframe option[value="week"]');
      const monthLabel = document.querySelector('#globalTimeframe option[value="month"]');
      const previousMonthLabel = document.querySelector('#globalTimeframe option[value="prev_month"]');
      const yearLabel = document.querySelector('#globalTimeframe option[value="year"]');

      todayLabel.textContent = `Today (${formatDateOnly(today)})`;
      weekLabel.textContent = `This Week (${formatDateOnly(thisWeek.start)} to ${formatDateOnly(thisWeek.end)})`;
      monthLabel.textContent = `This Month (${monthFormatter.format(today)})`;
      previousMonthLabel.textContent = `Previous Month (${monthFormatter.format(previousMonth.start)})`;
      yearLabel.textContent = `This Year (${today.getUTCFullYear()})`;

      const monthRange = getDateRangeForTimeframe('month');
      document.getElementById('customStartDate').value = formatDateOnly(monthRange.start);
      document.getElementById('customEndDate').value = formatDateOnly(today);
    }

    function initializeFinancialReports() {
      updateTimeframeLabels();
      applyFilters();
      loadProjectFinancialDetails('PRJ-2026-089');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeFinancialReports, { once: true });
    } else {
      initializeFinancialReports();
    }
