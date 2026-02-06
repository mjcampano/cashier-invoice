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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      const error = new Error(
        `API returned non-JSON response. Check VITE_API_BASE (${API_BASE}).`
      );
      error.status = response.status;
      error.raw = text.slice(0, 200);
      throw error;
    }
  }

  if (!response.ok) {
    const message =
      data?.message || `Request failed (${response.status}) at ${API_BASE}`;
    const error = new Error(message);
    error.status = response.status;
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

export const getApiHealth = () => request("/health");
