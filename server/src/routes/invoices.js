import { Router } from "express";
import Invoice from "../models/Invoice.js";

const router = Router();

const getPayload = (req) => {
  const body = req.body ?? {};
  return body.data && typeof body.data === "object" ? body.data : body;
};

router.get("/", async (req, res) => {
  try {
    const docs = await Invoice.find({})
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

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
    res.json({
      id: doc._id,
      data: doc.data,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("Get latest invoice error:", err);
    res.status(500).json({ message: "Failed to fetch latest invoice." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Invoice.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    res.json({
      id: doc._id,
      data: doc.data,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
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
    res.status(201).json({
      id: invoice._id,
      data: invoice.data,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  } catch (err) {
    console.error("Create invoice error:", err);
    res.status(500).json({ message: "Failed to create invoice." });
  }
});

router.put("/:id", async (req, res) => {
  try {
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

    res.json({
      id: invoice._id,
      data: invoice.data,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  } catch (err) {
    console.error("Update invoice error:", err);
    res.status(500).json({ message: "Failed to update invoice." });
  }
});

export default router;
