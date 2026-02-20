const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const normalizeBackendBase = (value) => {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

const buildTargetUrl = (req, backendBase) => {
  const rawPath = Array.isArray(req.query?.path)
    ? req.query.path.join("/")
    : String(req.query?.path || "");
  const target = new URL(`${backendBase}/api/${rawPath}`);

  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => target.searchParams.append(key, String(entry)));
      continue;
    }
    target.searchParams.set(key, String(value));
  }

  return target;
};

const buildRequestHeaders = (req) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  return headers;
};

const buildRequestBody = (req) => {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;

  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;
  return JSON.stringify(req.body);
};

const copyResponseHeaders = (upstream, res) => {
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    res.setHeader(key, value);
  });
};

export default async function handler(req, res) {
  const backendBase = normalizeBackendBase(process.env.API_BACKEND_URL);
  if (!backendBase) {
    res.status(500).json({
      message:
        "Missing API_BACKEND_URL in Vercel environment. Set it to your backend URL (for example: https://your-api.example.com).",
    });
    return;
  }

  try {
    const target = buildTargetUrl(req, backendBase);
    const upstream = await fetch(target, {
      method: req.method,
      headers: buildRequestHeaders(req),
      body: buildRequestBody(req),
    });

    copyResponseHeaders(upstream, res);
    const payload = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(payload);
  } catch (error) {
    console.error("Vercel API proxy error:", error);
    res.status(502).json({
      message: "Unable to reach backend API through proxy.",
    });
  }
}
