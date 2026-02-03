import React, { useCallback, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";  
import Tabs from "./components/Tabs";
import DataEntry from "./pages/DataEntry";
import Preview from "./pages/Preview";
import ProofOfPayment from "./components/ProofOfPayment";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";

import { PROGRAMS, buildSchoolItems } from "./data/tuitionTemplates";
import { uid } from "./utils";

export default function App() {
  const invoiceRef = useRef(null);

  const [mode, setMode] = useState("admin"); // "admin" or "invoice"
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [tab, setTab] = useState("form");
  const [isExporting, setIsExporting] = useState(false);

  // ✅ Keep uploads in App so it persists across tab switching
  const [uploads, setUploads] = useState([]);

  const [data, setData] = useState({
    school: {
      programKey: "MA",
      trackKey: "THESIS_5_TERMS",
    },
    business: {
      name: "Sandigan Colleges, Inc.",
      address: "web:https://sandigancolleges.edu.ph/",
      phone: "0917 000 0000",
      tin: "123-456-789-000",
    },
    customer: {
      name: "Juan Dela Cruz",
      address: "Customer Address, City, Philippines",
      contact: "0918 111 2222",
      accountNo: "ACC-000123",
    },
    invoice: {
      billingMonth: "May 2026",
      statementNo: "MAY-2026-0001",
      dateIssued: "2026-06-01",
      dueDate: "2026-06-10",
      cashierName: "Bachelor of Science in Information Technology",
      cashierId: "Software Development",
    },
    items: [
      { id: uid(), description: "Rice (25kg)", qty: 1, unitPrice: 1350 },
      { id: uid(), description: "Cooking Oil (1L)", qty: 6, unitPrice: 120 },
      { id: uid(), description: "Eggs (tray)", qty: 2, unitPrice: 260 },
    ],
    payments: [
      {
        id: uid(),
        date: "2026-05-15",
        reference: "OR-10021",
        method: "Cash",
        amount: 1000,
        proofStatus: "Verified",
      },
    ],
    notes:
      "Please settle your balance on or before the due date to avoid penalties. Thank you!",
  });

  /**
   * ✅ Multi-page PDF export
   */
  const exportPDF = useCallback(async () => {
    const element = invoiceRef.current;
    if (!element || isExporting) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 8;
      const marginX = 0;
      const marginTop = 8;

      pdf.addImage(imgData, "PNG", marginX, marginTop, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = marginTop - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", marginX, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeMonth = String(data.invoice.billingMonth || "Invoice")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "");

      pdf.save(`Billing-Statement-${safeMonth}.pdf`);
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [data.invoice.billingMonth, isExporting]);

  const applySchoolTemplateToItems = useCallback(() => {
    const templateItems = buildSchoolItems(data.school.programKey, data.school.trackKey).map(
      (it) => ({ id: uid(), ...it })
    );
    setData((d) => ({ ...d, items: templateItems }));
  }, [data.school.programKey, data.school.trackKey]);

  return (
    <>
      {mode === "admin" ? (
        <AdminLayout setMode={setMode} activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
          <AdminDashboard />
        </AdminLayout>
      ) : (
        <div className="shell">
          <header className="topbar">
            <div className="brand">Cashier Invoice</div>

            <Tabs tab={tab} setTab={setTab} />

            <button
              className="exportBtn"
              onClick={exportPDF}
              type="button"
              disabled={isExporting}
              title={isExporting ? "Exporting..." : "Export PDF"}
            >
              {isExporting ? "Exporting..." : "Export PDF"}
            </button>
          </header>

          <main className="main">
            {tab === "form" ? (
              <DataEntry
                data={data}
                setData={setData}
                uid={uid}
                onGoPreview={() => setTab("preview")}
                PROGRAMS={PROGRAMS}
                buildSchoolItems={buildSchoolItems}
                onApplySchoolTemplate={applySchoolTemplateToItems}
              />
            ) : tab === "preview" ? (
              <Preview invoiceRef={invoiceRef} data={data} />
            ) : (
              <ProofOfPayment
                data={data}
                setData={setData}
                uploads={uploads}
                setUploads={setUploads}
                onGoPreview={() => setTab("preview")}
              />
            )}
          </main>
        </div>
      )}
    </>
  );
}
