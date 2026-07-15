const LOCAL_INVOICE_STORAGE_KEY = "cashier-invoice.local-invoices.v1";

const hasLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readLocalInvoices = () => {
  if (!hasLocalStorage()) return [];

  const raw = window.localStorage.getItem(LOCAL_INVOICE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalInvoices = (items) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(LOCAL_INVOICE_STORAGE_KEY, JSON.stringify(items));
};

const createLocalId = () => {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parsePayload = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  return payload.data && typeof payload.data === "object" ? payload.data : payload;
};

const sortByUpdatedAtDesc = (items) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

const buildInvoiceRecord = (payload, current = null) => {
  const now = new Date().toISOString();
  const customer = payload?.customer ?? {};
  const amountDue = toNumber(payload?.amountDue ?? payload?.totals?.grandTotal, 0);
  const amountPaid = toNumber(
    payload?.amountPaid,
    Array.isArray(payload?.payments)
      ? payload.payments.reduce((sum, payment) => sum + toNumber(payment?.amount, 0), 0)
      : 0
  );
  const balance = toNumber(payload?.balance, Math.max(0, amountDue - amountPaid));
  const status =
    String(payload?.status || "").trim() ||
    (balance <= 0 ? "Paid" : amountPaid > 0 ? "Partially Paid" : "Draft");

  return {
    id: current?.id || createLocalId(),
    invoiceCode: String(payload?.invoiceCode || payload?.invoice?.statementNo || "").trim(),
    studentId: payload?.studentId || payload?.customer?.studentId || null,
    student:
      payload?.student ||
      {
        id: payload?.studentId || payload?.customer?.studentId || null,
        studentCode: String(customer?.accountNo || "").trim(),
        fullName: String(customer?.name || "").trim(),
        gradeYear: "",
        sectionClass: "",
        status: "",
      },
    classId: payload?.classId || payload?.school?.classId || null,
    amountDue,
    amountPaid,
    balance,
    status,
    issuedAt: payload?.issuedAt || payload?.invoice?.dateIssued || null,
    dueAt: payload?.dueAt || payload?.invoice?.dueDate || null,
    createdByUserId: payload?.createdByUserId || null,
    data: payload,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
};

const toListItem = (record) => ({
  id: record.id,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  invoiceCode: record.invoiceCode || "",
  studentId: record.studentId || null,
  student: record.student || null,
  classId: record.classId || null,
  amountDue: record.amountDue ?? 0,
  amountPaid: record.amountPaid ?? 0,
  balance: record.balance ?? 0,
  status: record.status || "Draft",
  issuedAt: record.issuedAt || null,
  dueAt: record.dueAt || null,
  invoice: record.data?.invoice ?? null,
  customer: record.data?.customer ?? null,
  business: record.data?.business ?? null,
});

const readAll = () => sortByUpdatedAtDesc(readLocalInvoices());

const getById = (id) => readAll().find((record) => String(record.id) === String(id));

const saveAll = (items) => {
  writeLocalInvoices(items);
  return items;
};

export const createInvoice = async (payload) => {
  const records = readAll();
  const created = buildInvoiceRecord(parsePayload(payload));
  saveAll([created, ...records]);
  return created;
};

export const updateInvoice = async (id, payload) => {
  const records = readAll();
  const current = records.find((record) => String(record.id) === String(id));
  if (!current) {
    const error = new Error("Invoice not found.");
    error.status = 404;
    throw error;
  }

  const updated = buildInvoiceRecord(parsePayload(payload), current);
  saveAll(records.map((record) => (String(record.id) === String(id) ? updated : record)));
  return updated;
};

export const getInvoice = async (id) => {
  const record = getById(id);
  if (!record) {
    const error = new Error("Invoice not found.");
    error.status = 404;
    throw error;
  }
  return record;
};

export const getLatestInvoice = async () => {
  const latest = readAll()[0];
  if (!latest) {
    const error = new Error("No invoices found.");
    error.status = 404;
    throw error;
  }
  return latest;
};

export const listInvoices = async () => ({ items: readAll().map(toListItem) });

export const deleteInvoice = async (id) => {
  const records = readAll();
  const nextRecords = records.filter((record) => String(record.id) !== String(id));
  if (nextRecords.length === records.length) {
    const error = new Error("Invoice not found.");
    error.status = 404;
    throw error;
  }
  saveAll(nextRecords);
  return { ok: true, id };
};
