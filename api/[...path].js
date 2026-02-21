import { Buffer } from "node:buffer";
import process from "node:process";

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

const parseBackendUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
};

const normalizePathPrefix = (value) => {
  const compact = String(value || "").trim();
  if (!compact || compact === "/") return "";
  return `/${compact.replace(/^\/+|\/+$/g, "")}`;
};

const getPrefixCandidates = (backendUrl) => {
  const rawPath = normalizePathPrefix(backendUrl.pathname);
  const withoutApiSuffix = rawPath.endsWith("/api") ? rawPath.slice(0, -4) : rawPath;
  const candidates = [rawPath, withoutApiSuffix, "/api", ""].map(normalizePathPrefix);
  return [...new Set(candidates)];
};

const buildTargetUrls = (req, backendUrl) => {
  const rawPath = Array.isArray(req.query?.path)
    ? req.query.path.join("/")
    : String(req.query?.path || "");
  const safePath = rawPath.replace(/^\/+/, "");
  const suffix = safePath ? `/${safePath}` : "";

  return getPrefixCandidates(backendUrl).map((prefix) => {
    const target = new URL(`${backendUrl.origin}${prefix}${suffix}`);

    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === "path") continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => target.searchParams.append(key, String(entry)));
        continue;
      }
      target.searchParams.set(key, String(value));
    }

    return target;
  });
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

const snapshotResponse = async (upstream, targetUrl) => ({
  status: upstream.status,
  headers: Array.from(upstream.headers.entries()),
  body: Buffer.from(await upstream.arrayBuffer()),
  targetUrl,
});

const applyResponse = (snapshot, res) => {
  for (const [key, value] of snapshot.headers) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    res.setHeader(key, value);
  }
  res.setHeader("x-proxy-target", snapshot.targetUrl);
  res.status(snapshot.status).send(snapshot.body);
};

const shouldRetryWithNextTarget = (status) => status === 404 || status === 405;

export default async function handler(req, res) {
  const backendUrl = parseBackendUrl(process.env.API_BACKEND_URL);
  if (!backendUrl) {
    res.status(500).json({
      message:
        "Missing or invalid API_BACKEND_URL in Vercel environment. Example: https://your-api.example.com",
    });
    return;
  }

  const targets = buildTargetUrls(req, backendUrl);
  if (!targets.length) {
    res.status(500).json({
      message: "No proxy targets generated. Check API_BACKEND_URL format.",
    });
    return;
  }

  let firstRetriableSnapshot = null;
  let lastNetworkError = null;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const isLastTarget = index === targets.length - 1;

    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: buildRequestHeaders(req),
        body: buildRequestBody(req),
      });
      const snapshot = await snapshotResponse(upstream, target.toString());

      if (shouldRetryWithNextTarget(snapshot.status) && !isLastTarget) {
        if (!firstRetriableSnapshot) firstRetriableSnapshot = snapshot;
        continue;
      }

      applyResponse(snapshot, res);
      return;
    } catch (error) {
      lastNetworkError = error;
      if (isLastTarget) break;
    }
  }

  if (firstRetriableSnapshot) {
    applyResponse(firstRetriableSnapshot, res);
    return;
  }

  console.error("Vercel API proxy error:", lastNetworkError);
  res.status(502).json({
    message: "Unable to reach backend API through proxy.",
  });
}
