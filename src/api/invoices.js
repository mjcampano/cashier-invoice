const normalizeApiBase = (value) => String(value || "").trim().replace(/\/+$/, "");

const resolveApiBase = () => {
  const envBase = normalizeApiBase(import.meta.env.VITE_API_BASE);
  if (envBase) return envBase;
  return "/api";
};

const API_BASE = resolveApiBase();

const buildRequestTargets = () => {
  if (!API_BASE.startsWith("http")) return [API_BASE];
  return [API_BASE, "/api"];
};

const LOCAL_INVOICE_STORAGE_KEY = "cashier-invoice.local-invoices.v1";
let hasLoggedLocalFallback = false;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

const parseBody = (body) => {
  if (body === undefined || body === null) return {};
  if (typeof body === "object") return body;
  if (typeof body !== "string") return {};

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const extractPayload = (body) => {
  const parsed = parseBody(body);
  return parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
};

const deriveStatus = (payload, amountDue, amountPaid, balance) => {
  const explicit = String(payload?.status || "").trim();
  if (explicit) return explicit;
  if (balance <= 0 && amountDue > 0) return "Paid";
  if (amountPaid > 0) return "Partially Paid";
  if (amountDue > 0) return "Issued";
  return "Draft";
};

const buildLocalInvoiceRecord = (payload, current = null) => {
  const now = new Date().toISOString();
  const amountDue = toNumber(payload?.amountDue ?? payload?.totals?.grandTotal, 0);
  const paidFromPayments = Array.isArray(payload?.payments)
    ? payload.payments.reduce((sum, payment) => sum + toNumber(payment?.amount, 0), 0)
    : 0;
  const amountPaid = toNumber(payload?.amountPaid, paidFromPayments);
  const defaultBalance = Math.max(0, amountDue - amountPaid);
  const balance = toNumber(payload?.balance, defaultBalance);

  return {
    id: current?.id || createLocalId(),
    invoiceCode: String(payload?.invoiceCode || payload?.invoice?.statementNo || "").trim(),
    studentId: payload?.studentId || payload?.customer?.studentId || null,
    classId: payload?.classId || payload?.school?.classId || null,
    amountDue,
    amountPaid,
    balance,
    status: deriveStatus(payload, amountDue, amountPaid, balance),
    issuedAt: payload?.issuedAt || payload?.invoice?.dateIssued || null,
    dueAt: payload?.dueAt || payload?.invoice?.dueDate || null,
    createdByUserId: payload?.createdByUserId || null,
    data: payload,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
};

const sortByUpdatedAtDesc = (items) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

const toListItem = (record) => ({
  id: record.id,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  invoiceCode: record.invoiceCode || "",
  studentId: record.studentId || null,
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

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const isBackendUnavailable = (error) => {
  if (!error) return false;
  if (error.isNetworkError) return true;
  if (error.status === 502 || error.status === 503 || error.status === 504) return true;

  const message = String(error.message || "").toLowerCase();
  return /(econnrefused|enotfound|failed to fetch|proxy error|not reachable|networkerror|unable to reach backend)/i.test(
    message
  );
};

const isInvoicePath = (path) =>
  path === "/invoices" ||
  path === "/invoices/latest" ||
  /^\/invoices\/[^/]+$/.test(path) ||
  /^\/invoices\/[^/]+\/delete$/.test(path);

const logLocalFallback = () => {
  if (hasLoggedLocalFallback) return;
  hasLoggedLocalFallback = true;
  console.warn(
    "API backend is unreachable. Using local invoice storage fallback for this session."
  );
};

const executeLocalFallback = (path, options = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  const items = sortByUpdatedAtDesc(readLocalInvoices());
  const idMatch = path.match(/^\/invoices\/([^/]+)$/);
  const deletePostMatch = path.match(/^\/invoices\/([^/]+)\/delete$/);

  const readById = (id) => items.find((entry) => String(entry.id) === String(id));
  const writeAndReturn = (nextItems, value) => {
    writeLocalInvoices(nextItems);
    logLocalFallback();
    return value;
  };

  if (path === "/invoices" && method === "GET") {
    logLocalFallback();
    return { items: items.map(toListItem) };
  }

  if (path === "/invoices" && method === "POST") {
    const payload = extractPayload(options.body);
    if (!payload || typeof payload !== "object") {
      const error = new Error("Invalid invoice payload.");
      error.status = 400;
      throw error;
    }

    const created = buildLocalInvoiceRecord(payload);
    return writeAndReturn([created, ...items], created);
  }

  if (path === "/invoices/latest" && method === "GET") {
    const latest = items[0];
    if (!latest) throw notFound("No invoices found.");
    logLocalFallback();
    return latest;
  }

  if (idMatch) {
    const id = decodeURIComponent(idMatch[1]);
    const current = readById(id);

    if (method === "GET") {
      if (!current) throw notFound("Invoice not found.");
      logLocalFallback();
      return current;
    }

    if (method === "PUT") {
      if (!current) throw notFound("Invoice not found.");
      const payload = extractPayload(options.body);
      if (!payload || typeof payload !== "object") {
        const error = new Error("Invalid invoice payload.");
        error.status = 400;
        throw error;
      }

      const updated = buildLocalInvoiceRecord(payload, current);
      const nextItems = items.map((entry) => (String(entry.id) === String(id) ? updated : entry));
      return writeAndReturn(nextItems, updated);
    }

    if (method === "DELETE") {
      if (!current) throw notFound("Invoice not found.");
      const nextItems = items.filter((entry) => String(entry.id) !== String(id));
      return writeAndReturn(nextItems, { ok: true, id });
    }
  }

  if (deletePostMatch && method === "POST") {
    const id = decodeURIComponent(deletePostMatch[1]);
    const current = readById(id);
    if (!current) throw notFound("Invoice not found.");
    const nextItems = items.filter((entry) => String(entry.id) !== String(id));
    return writeAndReturn(nextItems, { ok: true, id });
  }

  const error = new Error(`Local fallback route is not supported for ${method} ${path}.`);
  error.status = 405;
  throw error;
};

const executeRequest = async (base, path, options = {}) => {
  const hasBody = options.body !== undefined;
  let response;

  try {
    response = await fetch(`${base}${path}`, {
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    const error = new Error(
      `Failed to fetch ${path}. API not reachable at ${base}. Ensure backend is running and accessible.`
    );
    error.isNetworkError = true;
    throw error;
  }

  const text = await response.text();
  let data = null;
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (text && isJson) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) {
        const error = new Error(
          `API returned invalid JSON response. Check API base (${base}).`
        );
        error.status = response.status;
        error.raw = text.slice(0, 200);
        throw error;
      }
    }
  }

  if (!response.ok) {
    const rawMessage =
      data?.message || text || `Request failed (${response.status}) at ${base}`;
    const cleaned = rawMessage.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const message =
      cleaned ||
      `Request failed (${response.status}) at ${base}. Ensure backend is running and VITE_API_BASE is correct.`;
    const error = new Error(message);
    error.status = response.status;
    error.raw = text.slice(0, 200);
    throw error;
  }

  return data;
};

const request = async (path, options = {}) => {
  const targets = buildRequestTargets();
  const errors = [];

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    try {
      return await executeRequest(target, path, options);
    } catch (error) {
      errors.push(error);
      const isLastTarget = index === targets.length - 1;
      const shouldTryNext =
        !isLastTarget && (error?.isNetworkError || error?.status === 404 || error?.status === 405);
      if (shouldTryNext) continue;
      break;
    }
  }

  if (isInvoicePath(path) && errors.length > 0 && errors.every(isBackendUnavailable)) {
    return executeLocalFallback(path, options);
  }

  throw errors[errors.length - 1] || new Error("Unexpected API request failure.");
};

export const createInvoice = (payload) =>
  request("/invoices", {
    method: "POST",
    body: JSON.stringify({ data: payload }),
  });

export const updateInvoice = (id, payload) =>
  request(`/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify({ data: payload }),
  });

export const getInvoice = (id) => request(`/invoices/${id}`);

export const getLatestInvoice = () => request("/invoices/latest");

export const listInvoices = () => request("/invoices");

export const deleteInvoice = async (id) => {
  try {
    return await request(`/invoices/${id}`, { method: "DELETE" });
  } catch (err) {
    const message = String(err?.message || "");
    const shouldFallback =
      err?.isNetworkError ||
      err?.status === 404 ||
      err?.status === 405 ||
      /cannot delete/i.test(message);

    if (!shouldFallback) throw err;

    try {
      return await request(`/invoices/${id}/delete`, {
        method: "POST",
      });
    } catch (fallbackErr) {
      if (fallbackErr?.isNetworkError) throw err;
      throw fallbackErr;
    }
  }
};

export const getApiHealth = () => request("/health");
