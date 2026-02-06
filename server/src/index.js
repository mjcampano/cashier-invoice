import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import invoiceRoutes from "./routes/invoices.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment.");
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
  res.json({ ok: true, service: "cashier-invoice-api" });
});
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "cashier-invoice-api" });
});

app.use("/api/invoices", invoiceRoutes);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
