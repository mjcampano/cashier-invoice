import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import invoiceRoutes from "./routes/invoices.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

const getDbStateLabel = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] || "unknown";
};

if (!MONGODB_URI) {
  console.error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  process.exit(1);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((v) => v.trim())
      : "*",
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

app.use("/api/invoices", invoiceRoutes);
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

mongoose
  .connect(MONGODB_URI, {
    appName: "cashier-invoice-api",
    serverSelectionTimeoutMS: 10000,
  })
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
