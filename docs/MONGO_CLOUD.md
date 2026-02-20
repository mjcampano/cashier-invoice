# MongoDB Atlas / Cloud Setup

This project already uses `mongoose` with a flexible URI resolver (`MONGODB_URI`, `MONGO_URI`, or `DATABASE_URL`), so wiring it to MongoDB Atlas only requires a few environmental changes plus an optional data import.

## 1. Provision your Atlas cluster
1. Sign in to MongoDB Atlas, create a project, and launch a cluster (Shared Tier is fine for testing).
2. Create a database user with `readWrite` rights and take note of the username/password pair.
3. Add your IP (or `0.0.0.0/0` for open access during development) under **Network Access → IP Access List**.
4. Copy the connection string (looks like `mongodb+srv://<user>:<pass>@cluster0.xxxxxx.mongodb.net`) and decide on a default database name (e.g., `cashier-invoice`).

## 2. Point the backend to Atlas
1. In `server/.env` (or your deployment platform’s secrets), set the Atlas URI and optionally the database name:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxxx.mongodb.net/cashier-invoice
   MONGO_DB_NAME=cashier-invoice
   PORT=4000
   ```
2. The app also respects `CORS_ORIGIN`, so scope that to your admin domain once you push to production.
3. Restart the backend with `npm run dev`/`npm start` from the `server` folder. It logs the resolved database name once connected.

## 3. Verify connection & seed required collections
1. Run `npm run db:check` from `server` to ensure Atlas accepts our connection string: the script reports the server version and database list.
2. Run `npm run init:db` to create indexes and seed the default `admin` role plus the `school.profile` setting. That script can run safely multiple times, so integrate it into your deployment pipeline.

## 4. Import your data into Atlas
If you already have a MongoDB dump/JSON, use one of the following commands (replace placeholders):

### Project seed import (students)
If you want to load the built-in student records from this repo into your connected cluster, run:

```bash
cd server
npm run db:import-students
```

This script reads `src/features/admin/data/seedData.js` and upserts students by `studentCode`.

### Mongorestore (binary dump)
```bash
mongorestore --uri="mongodb+srv://<user>:<pass>@cluster0.xxxxxx.mongodb.net/cashier-invoice" \
  --drop --gzip ./dump
```

### Mongoimport (JSON/CSV)
```bash
mongoimport --uri="mongodb+srv://<user>:<pass>@cluster0.xxxxxx.mongodb.net/cashier-invoice" \
  --collection=students --jsonArray ./backups/students.json --drop
```

Atlas also supports the UI import/export tool, but the CLI commands above guarantee repeatability.

If you need a schema reference, see `server/schema-export.json`; it documents the exported `invoices` collection structure.

## 5. Keep the React admin site in sync
1. The React client uses `VITE_API_BASE` to locate the API. For local testing point it to `http://localhost:4000/api` (already handled automatically when `window.location.hostname` is `localhost`).
2. In production, set `VITE_API_BASE=https://api.yourdomain.com/api` before running `npm run build` so the admin UI talks to your deployed backend.
3. Once the backend is wired to Atlas and seeded, launch the React app (`npm run dev`) and visit the admin workspace. The dashboard now reports live counts, showing the MongoDB connection status on screen.

## 6. Troubleshooting
- MongoDB authentication errors usually mean the URI or user credentials are misconfigured—double-check the username/password and that the user has access to the target database.
- If Atlas rejects the connection, ensure the IP is whitelisted and that TLS is enabled (Atlas requires TLS, so avoid `dnsSeedlist` URIs without `tls=true`).
- Use `npm run db:list` to inspect the current databases once the URI is working locally.
- To reset everything, rerun `npm run init:db` followed by your preferred `mongorestore`/`mongoimport` commands.

With these steps you can host the backend on Atlas while the admin UI reflects live Mongo data, creating a production-grade experience for your cashier-invoice dashboard.
