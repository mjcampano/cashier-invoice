import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import Tabs from "./components/Tabs";
import DataEntry from "./pages/DataEntry";
import Preview from "./pages/Preview";

// ✅ ADD: school template imports
import { PROGRAMS, buildSchoolItems } from "./data/tuitionTemplates";

const uid = () => Math.random().toString(16).slice(2);

export default function App() {
  const invoiceRef = useRef(null);
  const [tab, setTab] = useState("form");

  const [data, setData] = useState({
    // ✅ ADD: program + track option
    school: {
      programKey: "MA",
      trackKey: "THESIS_5_TERMS",
    },

    business: {
      name: "Sandigan Mini Mart",
      address: "Sample Address, City, Philippines",
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
      cashierName: "Cashier A",
      cashierId: "C-001",
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
      },
    ],
    notes:
      "Please settle your balance on or before the due date to avoid penalties. Thank you!",
  });

  const exportPDF = async () => {
    // ✅ Important: ensure preview tab is visible before exporting (optional)
    // setTab("preview");

    const element = invoiceRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;

    let imgWidth = pdfWidth;
    let imgHeight = imgWidth / imgRatio;

    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
      imgWidth = imgHeight * imgRatio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = 8;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(
      `Billing-Statement-${String(data.invoice.billingMonth || "Invoice").replace(
        " ",
        "-"
      )}.pdf`
    );
  };

  // ✅ ADD: helper to apply school template (MA/PhD) into items
  const applySchoolTemplateToItems = () => {
    const templateItems = buildSchoolItems(
      data.school.programKey,
      data.school.trackKey
    ).map((it) => ({ id: uid(), ...it }));

    setData((d) => ({ ...d, items: templateItems }));
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Cashier Invoice</div>

        <Tabs tab={tab} setTab={setTab} />

        <button className="exportBtn" onClick={exportPDF} type="button">
          Export PDF
        </button>
      </header>

      <main className="main">
        {tab === "form" ? (
          <DataEntry
            data={data}
            setData={setData}
            uid={uid}
            onGoPreview={() => setTab("preview")}
            // ✅ PASS THESE for Program/Track dropdown + Apply button
            PROGRAMS={PROGRAMS}
            buildSchoolItems={buildSchoolItems}
            onApplySchoolTemplate={applySchoolTemplateToItems}
          />
        ) : (
          <Preview invoiceRef={invoiceRef} data={data} />
        )}
      </main>
    </div>
  );
}
