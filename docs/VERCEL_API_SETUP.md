# Vercel API Connection Setup

This project now includes a Vercel serverless proxy at `api/[...path].js`.

It lets the frontend keep using relative `/api/*` calls in production while forwarding requests to your finance backend.

## 1. Required Vercel Environment Variable

In your Vercel project settings, add:

```env
API_BACKEND_URL=https://your-finance-backend-domain.com
```

Notes:
- Use the backend base URL without trailing slash.
- Both values below are accepted:
  - `https://your-finance-backend-domain.com`
  - `https://your-finance-backend-domain.com/api`
- Do **not** use a full endpoint like `https://your-finance-backend-domain.com/api/health`.
- If this value is invalid, the proxy returns a `500` with an explicit config error.

## 2. Redeploy

After setting `API_BACKEND_URL`, trigger a new deployment on Vercel.

## 3. Verify

After deploy, open:

- `https://<your-vercel-app>.vercel.app/api/health`
- `https://<your-vercel-app>.vercel.app/api/status`

If proxy is configured correctly, these return your backend API JSON response.

If these return `404 Not Found`:
- open browser devtools `Network` tab
- click `/api/health`
- check response header `x-proxy-target`
- this shows the exact backend URL the Vercel proxy tried
- correct `API_BACKEND_URL` based on that value and redeploy

## 4. Optional Frontend Env

You can leave `VITE_API_BASE` empty on Vercel because the app now uses same-origin `/api` which is proxied by the function.

## 5. Backend CORS

With proxy mode, browser requests hit the same Vercel origin first, so CORS errors from the browser should be avoided.

If you still call backend directly from browser (using `VITE_API_BASE`), set backend `CORS_ORIGIN` to your Vercel frontend domain.

## 6. Vercel Project Settings Checklist

- `Root Directory`: repository root (where `package.json` and `api/` exist)
- `Build Command`: `npm run build`
- `Output Directory`: `dist`
- Environment variable `API_BACKEND_URL` is set for the active environment (Production/Preview)
- Trigger **Redeploy** after changing env vars
