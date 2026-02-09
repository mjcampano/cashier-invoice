const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    if (isLocalhost) return "http://localhost:4000/api";
  }

  return "/api";
};

const API_BASE = resolveApiBase();

const request = async (path, options = {}) => {
  const hasBody = options.body !== undefined;
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    const error = new Error(
      `Failed to fetch ${path}. API not reachable at ${API_BASE}. Ensure backend is running and accessible.`
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
          `API returned invalid JSON response. Check VITE_API_BASE (${API_BASE}).`
        );
        error.status = response.status;
        error.raw = text.slice(0, 200);
        throw error;
      }
    }
  }

  if (!response.ok) {
    const rawMessage =
      data?.message || text || `Request failed (${response.status}) at ${API_BASE}`;
    const cleaned = rawMessage.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const message =
      cleaned ||
      `Request failed (${response.status}) at ${API_BASE}. Ensure backend is running and VITE_API_BASE is correct.`;
    const error = new Error(message);
    error.status = response.status;
    error.raw = text.slice(0, 200);
    throw error;
  }

  return data;
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
