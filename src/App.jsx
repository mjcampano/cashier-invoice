import React, { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";  
import Tabs from "./components/Tabs";
import DataEntry from "./pages/DataEntry";
import Preview from "./pages/Preview";
import ProofOfPayment from "./components/ProofOfPayment";
import useNotifications from "./components/notifications/useNotifications";

import { PROGRAMS, buildSchoolItems } from "./data/tuitionTemplates";
import { uid } from "./utils";
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  getLatestInvoice,
  listInvoices,
  updateInvoice,
} from "./storage/invoices";

const createDefaultData = () => ({
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

const ensureIds = (list, fallback = []) =>
  (Array.isArray(list) ? list : fallback).map((item) => ({
    ...item,
    id: item.id || uid(),
  }));

const normalizeInvoiceData = (incoming) => {
  const base = createDefaultData();
  const safe = incoming && typeof incoming === "object" ? incoming : {};

  return {
    ...base,
    ...safe,
    school: { ...base.school, ...(safe.school || {}) },
    business: { ...base.business, ...(safe.business || {}) },
    customer: { ...base.customer, ...(safe.customer || {}) },
    invoice: { ...base.invoice, ...(safe.invoice || {}) },
    items: ensureIds(safe.items, base.items),
    payments: ensureIds(safe.payments, base.payments),
    notes: safe.notes ?? base.notes,
  };
};

export default function App() {
  const invoiceRef = useRef(null);
  const {
    showAlert,
    showToast,
    showValidation,
    clearValidation,
    confirm,
  } = useNotifications();

  const [tab, setTab] = useState("form");
  const [isExporting, setIsExporting] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListingInvoices, setIsListingInvoices] = useState(false);
  const [invoiceList, setInvoiceList] = useState([]);
  const [invoiceListStatus, setInvoiceListStatus] = useState("");
  const [activeInvoiceActionId, setActiveInvoiceActionId] = useState(null);

  // ✅ Keep uploads in App so it persists across tab switching
  const [uploads, setUploads] = useState([]);

  const [data, setData] = useState(() => createDefaultData());

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
      showAlert("PDF export failed. Please try again.", { variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  }, [data.invoice.billingMonth, isExporting, showAlert]);

  const applySchoolTemplateToItems = useCallback(() => {
    const templateItems = buildSchoolItems(data.school.programKey, data.school.trackKey).map(
      (it) => ({ id: uid(), ...it })
    );
    setData((d) => ({ ...d, items: templateItems }));
  }, [data.school.programKey, data.school.trackKey]);

  const handleRefreshInvoices = useCallback(async () => {
    setIsListingInvoices(true);
    setInvoiceListStatus("Loading saved students...");

    try {
      const response = await listInvoices();
      const items = Array.isArray(response?.items) ? response.items : [];
      setInvoiceList(items);
      setInvoiceListStatus(
        items.length ? `${items.length} invoice(s) found.` : "No saved students yet."
      );
    } catch (err) {
      console.error("List invoices error:", err);
      setInvoiceListStatus(err.message || "Failed to load saved students.");
      showAlert(err.message || "Failed to load saved students.", { variant: "danger" });
    } finally {
      setIsListingInvoices(false);
    }
  }, [showAlert]);

  const handleLoadInvoice = useCallback(
    async (id) => {
      if (!id || isLoading) return;

      clearValidation();
      setIsLoading(true);
      setActiveInvoiceActionId(id);
      setSaveStatus("Loading selected invoice...");

      try {
        const response = await getInvoice(id);
        setData(normalizeInvoiceData(response.data));
        setInvoiceId(response.id);
        setSaveStatus(`Loaded invoice ${response.id}`);
      } catch (err) {
        console.error("Load invoice by id error:", err);
        setSaveStatus(err.message || "Load failed.");
        showAlert(err.message || "Load failed.", { variant: "danger" });
      } finally {
        setActiveInvoiceActionId(null);
        setIsLoading(false);
      }
    },
    [isLoading, showAlert, clearValidation]
  );

  const handleDeleteInvoice = useCallback(
    async (id) => {
      if (!id) return;

      const confirmed = await confirm("Delete this saved invoice? This cannot be undone.", {
        title: "Delete invoice",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      });

      if (!confirmed) return;

      setActiveInvoiceActionId(id);
      setSaveStatus("Deleting invoice...");

      try {
        await deleteInvoice(id);
        if (invoiceId === id) {
          setInvoiceId(null);
          setData(createDefaultData());
        }
        setSaveStatus("Invoice deleted.");
        showAlert("Invoice deleted.", { variant: "success" });
        await handleRefreshInvoices();
      } catch (err) {
        console.error("Delete invoice error:", err);
        setSaveStatus(err.message || "Delete failed.");
        showAlert(err.message || "Delete failed.", { variant: "danger" });
      } finally {
        setActiveInvoiceActionId(null);
      }
    },
    [confirm, handleRefreshInvoices, invoiceId, showAlert]
  );

  const handleSaveInvoice = useCallback(async () => {
    if (isSaving) return;

    clearValidation();
    setIsSaving(true);
    setSaveStatus("Saving invoice...");

    try {
      const response = invoiceId
        ? await updateInvoice(invoiceId, data)
        : await createInvoice(data);

      setInvoiceId(response.id);
      setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
      showToast("Invoice saved successfully.");
      await handleRefreshInvoices();
    } catch (err) {
      console.error("Save invoice error:", err);
      setSaveStatus(err.message || "Save failed.");
      showValidation(err.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }, [
    data,
    handleRefreshInvoices,
    invoiceId,
    isSaving,
    showToast,
    showValidation,
    clearValidation,
  ]);

  const handleLoadLatest = useCallback(async () => {
    if (isLoading) return;

    clearValidation();
    setIsLoading(true);
    setSaveStatus("Loading latest invoice...");

    try {
      const response = await getLatestInvoice();
      setData(normalizeInvoiceData(response.data));
      setInvoiceId(response.id);
      setSaveStatus(`Loaded invoice ${response.id}`);
      showToast("Latest invoice loaded.");
    } catch (err) {
      console.error("Load latest invoice error:", err);
      if (err.status === 404) {
        setSaveStatus("No saved invoices found.");
        showAlert("No saved invoices found.", { variant: "warning" });
      } else {
        setSaveStatus(err.message || "Load failed.");
        showAlert(err.message || "Load failed.", { variant: "danger" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, showToast, showAlert, clearValidation]);

  const handleNewInvoice = useCallback(() => {
    setData(createDefaultData());
    setInvoiceId(null);
    setSaveStatus("New invoice form ready.");
    clearValidation();
  }, [clearValidation]);

  useEffect(() => {
    handleRefreshInvoices();
  }, [handleRefreshInvoices]);

  return (
    <div className="shell financeShellFull">
      <header className="topbar">
        <div className="topbarMainRow">
          <div className="topbarBrandGroup">
            <div className="brand">Cashier Invoice</div>
            <div className="topbarBadge">Finance Console</div>
          </div>

          <div className="topbarUtilityActions">
            <button
              className="exportBtn"
              onClick={exportPDF}
              type="button"
              disabled={isExporting}
              title={isExporting ? "Exporting..." : "Export PDF"}
            >
              {isExporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>

        <div className="topbarTabsRow">
          <Tabs tab={tab} setTab={setTab} />
        </div>
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
            onSaveInvoice={handleSaveInvoice}
            onLoadLatest={handleLoadLatest}
            saveStatus={saveStatus}
            saveDisabled={isSaving || isLoading}
            loadDisabled={isSaving || isLoading}
            onNewInvoice={handleNewInvoice}
            invoiceList={invoiceList}
            invoiceListStatus={invoiceListStatus}
            listDisabled={isSaving || isLoading || isListingInvoices}
            onRefreshInvoices={handleRefreshInvoices}
            onLoadInvoice={handleLoadInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            activeInvoiceId={invoiceId}
            activeInvoiceActionId={activeInvoiceActionId}
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
  );
}
