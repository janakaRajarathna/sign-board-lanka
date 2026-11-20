// Inline core functionality to ensure 100% interactivity if external JS is offline
    document.addEventListener("DOMContentLoaded", function() {
      const invoicesData = {
        "INV-2026-018": {
          id: "INV-2026-018",
          customerName: "Dialog Axiata PLC",
          customerAddress: "Dialog Axiata Head Office, No. 475, Union Place, Colombo 02",
          customerVat: "VAT-8291041-0",
          invoiceDate: "18 Nov 2026",
          quotationRef: "QTN-2026-031",
          projectId: "PRJ-2026-089",
          handoverDate: "16 Nov 2026 (Verified 100%)",
          projectTitle: "Dialog Axiata 3D Acrylic Rooftop Pylon",
          subtotal: "2,200,000",
          taxAmount: "400,000",
          grandTotal: "2,600,000",
          advancePaid: "780,000",
          postInstallPaid: "520,000",
          balanceDue: "1,300,000",
          status: "PARTIALLY PAID",
          statusClass: "text-[#38bdf8]",
          items: [
            { id: "#01", desc: "Heavy structural steel sub-frame fabrication & hot-dip galvanizing (18ft x 6ft)", qty: "1 Lot", amount: "1,150,000" },
            { id: "#02", desc: "3D Molded Acrylic letter cladding with high-lumen Samsung IP68 LED illumination", qty: "1 Lot", amount: "750,000" },
            { id: "#03", desc: "High-elevation crane boom rigging & site installation at Dialog HQ Rooftop", qty: "1 Lot", amount: "300,000" }
          ],
          payments: [
            { ref: "RCT-2026-114", date: "02 Oct 2026", stage: "30% Advance Deposit", method: "Commercial Bank Transfer Ref #CB-98214", amount: "780,000" },
            { ref: "RCT-2026-289", date: "22 Nov 2026", stage: "Interim Handover Draw", method: "Commercial Bank Transfer Ref #CB-99410", amount: "520,000" }
          ]
        },
        "INV-2026-017": {
          id: "INV-2026-017",
          customerName: "Jaykay Marketing Services (Pvt) Ltd",
          customerAddress: "No. 130, Glennie Street, Colombo 02",
          customerVat: "VAT-1029381-4",
          invoiceDate: "12 Nov 2026",
          quotationRef: "QTN-2026-025",
          projectId: "PRJ-2026-074",
          handoverDate: "10 Nov 2026 (Verified 100%)",
          projectTitle: "Keells Supermarket Facade ACP Signage",
          subtotal: "1,650,000",
          taxAmount: "250,000",
          grandTotal: "1,900,000",
          advancePaid: "570,000",
          postInstallPaid: "1,330,000",
          balanceDue: "0",
          status: "PAID",
          statusClass: "text-[#6EE7B7]",
          items: [
            { id: "#01", desc: "Fire-rated 4mm ACP cladding framing system (RAL 6029 Custom Green)", qty: "1 Lot", amount: "980,000" },
            { id: "#02", desc: "Fabricated Keells logo face-lit dimensional letters with daylight LEDs", qty: "1 Lot", amount: "470,000" },
            { id: "#03", desc: "Night-time installation and electrical mains hookup at Wattala Flagship", qty: "1 Lot", amount: "200,000" }
          ],
          payments: [
            { ref: "RCT-2026-092", date: "18 Sep 2026", stage: "30% Advance Deposit", method: "Sampath Bank Cheque #918231", amount: "570,000" },
            { ref: "RCT-2026-241", date: "16 Nov 2026", stage: "Final Settlement", method: "Electronic Fund Transfer SLIPS #4491", amount: "1,330,000" }
          ]
        },
        "INV-2026-016": {
          id: "INV-2026-016",
          customerName: "Commercial Bank of Ceylon PLC",
          customerAddress: "Commercial House, No. 21, Sir Razik Fareed Mawatha, Colombo 01",
          customerVat: "VAT-3049182-1",
          invoiceDate: "04 Nov 2026",
          quotationRef: "QTN-2026-022",
          projectId: "PRJ-2026-068",
          handoverDate: "01 Nov 2026 (Verified 100%)",
          projectTitle: "Commercial Bank Wayfinding Signage & Branch Totems",
          subtotal: "2,150,000",
          taxAmount: "320,000",
          grandTotal: "2,470,000",
          advancePaid: "741,000",
          postInstallPaid: "1,191,000",
          balanceDue: "538,000",
          status: "ISSUED",
          statusClass: "text-[#FDE68A]",
          items: [
            { id: "#01", desc: "Stainless steel grade 304 monolith signs with internal illumination (2 Units)", qty: "2 Units", amount: "1,200,000" },
            { id: "#02", desc: "Modular interior directional suspended sign blades (14 zones)", qty: "14 Units", amount: "650,000" },
            { id: "#03", desc: "Kandy Regional Branch on-site civil anchoring and cabling works", qty: "1 Lot", amount: "300,000" }
          ],
          payments: [
            { ref: "RCT-2026-071", date: "15 Aug 2026", stage: "30% Advance Deposit", method: "Direct Bank Remittance #CB-1104", amount: "741,000" },
            { ref: "RCT-2026-210", date: "10 Nov 2026", stage: "Interim Handover Draw", method: "Direct Bank Remittance #CB-1492", amount: "1,191,000" }
          ]
        },
        "INV-2026-015": {
          id: "INV-2026-015",
          customerName: "Softlogic Retail Holdings PLC",
          customerAddress: "No. 14, De Fonseka Place, Colombo 05",
          customerVat: "VAT-4910294-8",
          invoiceDate: "28 Oct 2026",
          quotationRef: "QTN-2026-019",
          projectId: "PRJ-2026-052",
          handoverDate: "25 Oct 2026 (Verified 100%)",
          projectTitle: "Odel Mall Atrium Suspended Architectural Signage",
          subtotal: "1,120,000",
          taxAmount: "180,000",
          grandTotal: "1,300,000",
          advancePaid: "390,000",
          postInstallPaid: "910,000",
          balanceDue: "0",
          status: "PAID",
          statusClass: "text-[#6EE7B7]",
          items: [
            { id: "#01", desc: "High-tensile steel cable suspended elliptical aluminum signboard (12ft x 4ft)", qty: "1 Lot", amount: "820,000" },
            { id: "#02", desc: "Mirror finish brass edge channel banding with warm white accent LEDs", qty: "1 Lot", amount: "300,000" }
          ],
          payments: [
            { ref: "RCT-2026-045", date: "05 Jul 2026", stage: "30% Advance Deposit", method: "HNB Transfer Ref #HNB-7781", amount: "390,000" },
            { ref: "RCT-2026-178", date: "30 Oct 2026", stage: "Final Settlement Balance", method: "Direct Remittance #HNB-9902", amount: "910,000" }
          ]
        }
      };

      const viewModalOverlay = document.getElementById("viewModalOverlay");
      const closeViewModalBtn = document.getElementById("closeViewModalBtn");

      function openInvoice(id) {
        const inv = invoicesData[id] || invoicesData["INV-2026-018"];
        document.getElementById("docInvoiceNo").innerText = inv.id;
        document.getElementById("docCustomerName").innerText = inv.customerName;
        document.getElementById("docCustomerAddress").innerText = inv.customerAddress;
        document.getElementById("docCustomerVat").innerText = "Client Tax No: " + inv.customerVat;
        document.getElementById("docInvoiceDate").innerText = inv.invoiceDate;
        document.getElementById("docQuotationRef").innerText = inv.quotationRef;
        document.getElementById("docProjectRef").innerText = inv.projectId;
        document.getElementById("docHandoverDate").innerText = inv.handoverDate;
        document.getElementById("docProjectTitle").innerText = inv.projectTitle;

        const badge = document.getElementById("docStatusBadge");
        badge.innerText = inv.status;
        badge.className = "font-bold uppercase " + inv.statusClass;

        document.getElementById("docSubtotal").innerText = "LKR " + inv.subtotal;
        document.getElementById("docTaxAmount").innerText = "LKR " + inv.taxAmount;
        document.getElementById("docGrandTotal").innerText = "LKR " + inv.grandTotal;
        document.getElementById("docAdvanceDeducted").innerText = "- LKR " + inv.advancePaid;
        document.getElementById("docPostInstallPaid").innerText = "- LKR " + inv.postInstallPaid;
        document.getElementById("docNetBalance").innerText = "LKR " + inv.balanceDue;
        document.getElementById("docDueTerms").innerText = inv.balanceDue === "0" ? "Fully Reconciled & Cleared" : "Net 14 Days Terms Active";

        const tbody = document.getElementById("docItemsTableBody");
        tbody.innerHTML = inv.items.map(it => `
          <tr>
            <td class="py-2.5 px-3 font-code-tabular text-outline">${it.id}</td>
            <td class="py-2.5 px-3 font-body-sm text-on-surface">${it.desc}</td>
            <td class="py-2.5 px-3 font-code-tabular text-center text-outline">${it.qty}</td>
            <td class="py-2.5 px-3 font-code-tabular text-right text-white font-medium">${it.amount}</td>
          </tr>
        `).join("");

        const pbody = document.getElementById("docPaymentsAuditBody");
        pbody.innerHTML = inv.payments.map(p => `
          <tr>
            <td class="py-1.5 px-2 font-bold text-white">${p.ref}</td>
            <td class="py-1.5 px-2 text-outline">${p.date}</td>
            <td class="py-1.5 px-2 text-tertiary-fixed">${p.stage}</td>
            <td class="py-1.5 px-2 text-on-surface-variant">${p.method}</td>
            <td class="py-1.5 px-2 text-right text-white font-bold">LKR ${p.amount}</td>
          </tr>
        `).join("");

        viewModalOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }

      function closeModal() {
        viewModalOverlay.classList.add("hidden");
        document.body.style.overflow = "";
      }

      closeViewModalBtn.addEventListener("click", closeModal);
      viewModalOverlay.addEventListener("click", function(e) {
        if (e.target === viewModalOverlay) closeModal();
      });

      document.querySelectorAll("[data-action='view']").forEach(btn => {
        btn.addEventListener("click", () => openInvoice(btn.dataset.id));
      });

      document.querySelectorAll("[data-action='print']").forEach(btn => {
        btn.addEventListener("click", () => {
          openInvoice(btn.dataset.id);
          setTimeout(() => window.print(), 200);
        });
      });

      function showToast(msg) {
        const toast = document.getElementById("toastNotification");
        document.getElementById("toastMessage").innerText = msg;
        toast.classList.remove("translate-y-16", "opacity-0", "pointer-events-none");
        setTimeout(() => {
          toast.classList.add("translate-y-16", "opacity-0", "pointer-events-none");
        }, 3000);
      }

      document.querySelectorAll("[data-action='download']").forEach(btn => {
        btn.addEventListener("click", () => showToast(`Generating PDF for ${btn.dataset.id}... Download initiated.`));
      });

      document.getElementById("viewPrintBtn").addEventListener("click", () => window.print());
      document.getElementById("viewDownloadBtn").addEventListener("click", () => showToast("Exporting official tax invoice PDF document."));
      document.getElementById("btnExportSummary").addEventListener("click", () => showToast("Exporting Accounts Ledger summary (CSV/Excel)..."));
      document.getElementById("btnOpenCreateInvoice").addEventListener("click", () => showToast("Verifying completed projects pool for invoice issuance..."));
      document.getElementById("btnReviewJobs").addEventListener("click", () => showToast("Opening shop floor certified installation review register..."));

      // Filter tabs interaction
      const tabs = document.querySelectorAll(".tab-btn");
      const rows = document.querySelectorAll("#invoiceTableBody tr");
      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          tabs.forEach(t => {
            t.className = "tab-btn px-4 py-1.5 font-label-md text-xs font-semibold rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors flex items-center gap-2";
          });
          tab.className = "tab-btn px-4 py-1.5 font-label-md text-xs font-semibold rounded text-on-surface bg-surface-container-high transition-colors flex items-center gap-2";

          const filter = tab.dataset.filter;
          let visibleCount = 0;
          rows.forEach(r => {
            const id = r.dataset.id;
            const item = invoicesData[id];
            if (!item) return;
            const match = (filter === "ALL") || (item.status.replace(" ", "_") === filter);
            r.style.display = match ? "" : "none";
            if (match) visibleCount++;
          });
          document.getElementById("showingCountSummary").innerText = `Showing ${visibleCount} of 4 records in register`;
        });
      });

      // Search interaction
      const searchInput = document.getElementById("invoiceSearchInput");
      const clearSearchBtn = document.getElementById("clearSearchBtn");
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        clearSearchBtn.classList.toggle("hidden", !q);
        let visibleCount = 0;
        rows.forEach(r => {
          const text = r.innerText.toLowerCase();
          const match = text.includes(q);
          r.style.display = match ? "" : "none";
          if (match) visibleCount++;
        });
        document.getElementById("showingCountSummary").innerText = `Showing ${visibleCount} of 4 records in register`;
        document.getElementById("noResultsState").classList.toggle("hidden", visibleCount > 0);
      });
      clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        rows.forEach(r => r.style.display = "");
        document.getElementById("showingCountSummary").innerText = `Showing 4 of 4 records in register`;
        document.getElementById("noResultsState").classList.add("hidden");
      });
    });