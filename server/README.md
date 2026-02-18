# Cashier Invoice API (MongoDB Atlas)

## 1. Configure MongoDB Cloud
Set these values in `server/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
MONGO_DB_NAME=
MONGO_APP_NAME=cashier-invoice-api
MONGO_SERVER_SELECTION_TIMEOUT_MS=10000
MONGO_EXPORT_SAMPLE_SIZE=200
SCHEMA_EXPORT_PATH=./schema-export.json
PORT=4000
```

## 2. Verify connection
From `server/` run:

```bash
npm run db:list
npm run db:check
```

This validates:
- Atlas URI works
- server can reach Atlas
- user has access to the target database
- chosen `MONGO_DB_NAME` is applied (if set)

## 3. Export cloud schema snapshot
From `server/` run:

```bash
npm run db:export-schema
```

Output file is controlled by `SCHEMA_EXPORT_PATH` (default: `server/schema-export.json`).

The export includes:
- collection metadata
- indexes
- estimated document counts
- inferred field types from sampled documents

## 4. Start API
From `server/` run:

```bash
npm run dev
```

## 5. Automatic notice alerts (Users/Teachers)
When a new record is created, the backend now auto-creates a notice with:
- `audience: "All"`
- `status: "Published"`

Triggers:
- Create user via `POST /api/users`
- Create teacher via `POST /api/teachers`
- Fetch role IDs via `GET /api/roles` (needed before creating user)

Check alerts:

```bash
GET /api/notices
```

## 6. How to know backend is working well
Use these checks:

1. Connectivity to DB
```bash
npm run db:check
```

2. API health
```bash
GET /api/health
```

3. API runtime status + key counts
```bash
GET /api/status
```

`/api/status` returns:
- DB state (`connected`/etc.)
- DB name
- uptime
- document counts (`users`, `teachers`, `notices`, `invoices`)

## Atlas checklist if connection fails
- Atlas `Network Access` includes your server IP (or `0.0.0.0/0` for testing only).
- Atlas DB user/password are correct.
- Atlas DB user has read/write permission on the target database.
- URI database name matches your intended DB.
