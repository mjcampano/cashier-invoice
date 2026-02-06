const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || `Request failed (${response.status})`;
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
