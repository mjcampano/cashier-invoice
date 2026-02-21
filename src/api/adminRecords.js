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

const toQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  if (!entries.length) return "";

  return `?${new URLSearchParams(entries).toString()}`;
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
  let firstError = null;

  for (const target of targets) {
    try {
      return await executeRequest(target, path, options);
    } catch (error) {
      if (!firstError) firstError = error;
      const shouldTryNext =
        error?.isNetworkError || error?.status === 404 || error?.status === 405;
      if (!shouldTryNext || target === targets[targets.length - 1]) {
        throw firstError;
      }
    }
  }

  throw firstError || new Error("Unexpected API request failure.");
};

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

export const getStatus = () => request("/status");
