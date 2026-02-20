import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { connectMongo, getDbStateLabel, resolveMongoUri } from "./config/mongo.js";
import invoiceRoutes from "./routes/invoices.js";
import noticeRoutes from "./routes/notices.js";
import roleRoutes from "./routes/roles.js";
import studentRoutes from "./routes/students.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

if (!resolveMongoUri()) {
  console.error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  process.exit(1);
}

const parseCorsOrigins = () =>
  (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  if (!allowedOrigins.length) return true;
  if (allowedOrigins.includes("*")) return true;

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) return true;
    if (!allowedOrigin.includes("*")) return false;

    const wildcardRegex = new RegExp(
      `^${escapeRegex(allowedOrigin).replace(/\\\*/g, ".*")}$`
    );
    return wildcardRegex.test(origin);
  });
};

const allowedOrigins = parseCorsOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "cashier-invoice-api",
    db: {
      state: getDbStateLabel(),
      name: mongoose.connection.name || null,
    },
  });
});
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "cashier-invoice-api",
    db: {
      state: getDbStateLabel(),
      name: mongoose.connection.name || null,
    },
  });
});
app.get("/api/status", async (req, res) => {
  const dbState = getDbStateLabel();
  const connected = mongoose.connection.readyState === 1;

  const safeCount = async (collectionName) => {
    try {
      return await mongoose.connection.db.collection(collectionName).estimatedDocumentCount();
    } catch {
      return null;
    }
  };

  const collectionCounts = connected
    ? {
        users: await safeCount("users"),
        students: await safeCount("students"),
        notices: await safeCount("notices"),
        invoices: await safeCount("invoices"),
      }
    : null;

  res.status(connected ? 200 : 503).json({
    ok: connected,
    service: "cashier-invoice-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    db: {
      state: dbState,
      name: mongoose.connection.name || null,
    },
    counts: collectionCounts,
  });
});

app.use("/api/invoices", invoiceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/users", userRoutes);
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

connectMongo()
  .then(() => {
    console.log(
      `MongoDB connected (db: ${mongoose.connection.name || "unknown"}).`
    );
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
