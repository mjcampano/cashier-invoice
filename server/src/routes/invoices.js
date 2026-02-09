import { Router } from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";

const router = Router();

const getPayload = (req) => {
  const body = req.body ?? {};
  return body.data && typeof body.data === "object" ? body.data : body;
};

const toInvoiceResponse = (doc) => ({
  id: doc._id,
  data: doc.data,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const isInvalidObjectId = (id) => !mongoose.Types.ObjectId.isValid(id);
const validateId = (id, res) => {
  if (isInvalidObjectId(id)) {
    res.status(400).json({ message: "Invalid invoice id." });
    return false;
  }
  return true;
};

const removeInvoiceById = async (id, res) => {
  if (!validateId(id, res)) return;

  const invoice = await Invoice.findByIdAndDelete(id);
  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found." });
  }

  res.json({ ok: true, id });
};

router.get("/", async (req, res) => {
  try {
    const docs = await Invoice.find({}).sort({ updatedAt: -1 }).lean();

    const items = docs.map((doc) => ({
      id: doc._id,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      invoice: doc.data?.invoice ?? null,
      customer: doc.data?.customer ?? null,
      business: doc.data?.business ?? null,
    }));

    res.json({ items });
  } catch (err) {
    console.error("List invoices error:", err);
    res.status(500).json({ message: "Failed to list invoices." });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const doc = await Invoice.findOne({}).sort({ updatedAt: -1 }).lean();
    if (!doc) {
      return res.status(404).json({ message: "No invoices found." });
    }
    res.json(toInvoiceResponse(doc));
  } catch (err) {
    console.error("Get latest invoice error:", err);
    res.status(500).json({ message: "Failed to fetch latest invoice." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id, res)) return;

    const doc = await Invoice.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    res.json(toInvoiceResponse(doc));
  } catch (err) {
    console.error("Get invoice error:", err);
    res.status(500).json({ message: "Failed to fetch invoice." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = getPayload(req);
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ message: "Invalid invoice payload." });
    }

    const invoice = await Invoice.create({ data: payload });
    res.status(201).json(toInvoiceResponse(invoice));
  } catch (err) {
    console.error("Create invoice error:", err);
    res.status(500).json({ message: "Failed to create invoice." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id, res)) return;

    const payload = getPayload(req);
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ message: "Invalid invoice payload." });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { data: payload },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    res.json(toInvoiceResponse(invoice));
  } catch (err) {
    console.error("Update invoice error:", err);
    res.status(500).json({ message: "Failed to update invoice." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await removeInvoiceById(req.params.id, res);
  } catch (err) {
    console.error("Delete invoice error:", err);
    res.status(500).json({ message: "Failed to delete invoice." });
  }
});

router.post("/:id/delete", async (req, res) => {
  try {
    await removeInvoiceById(req.params.id, res);
  } catch (err) {
    console.error("Delete invoice via POST error:", err);
    res.status(500).json({ message: "Failed to delete invoice." });
  }
});

export default router;
