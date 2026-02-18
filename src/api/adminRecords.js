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

const toQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  if (!entries.length) return "";

  return `?${new URLSearchParams(entries).toString()}`;
};

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

export const listTeachers = (params = {}) =>
  request(`/teachers${toQueryString(params)}`);

export const createTeacher = (payload) =>
  request("/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTeacher = (id, payload) =>
  request(`/teachers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const listStudents = (params = {}) =>
  request(`/students${toQueryString(params)}`);

export const createStudent = (payload) =>
  request("/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateStudent = (id, payload) =>
  request(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
