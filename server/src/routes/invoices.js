import { Router } from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Student from "../models/Student.js";

const router = Router();

const getPayload = (req) => {
  const body = req.body ?? {};
  return body.data && typeof body.data === "object" ? body.data : body;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toObjectIdOrNull = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const toTrimmedString = (value) => String(value || "").trim();

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const studentPopulate = {
  path: "studentId",
  select: "studentCode fullName gradeYear sectionClass status",
};

const getStudentIdValue = (studentRef) => {
  if (!studentRef) return null;
  if (typeof studentRef === "object") return studentRef._id || studentRef.id || null;
  return studentRef;
};

const toStudentSummary = (studentRef, payload) => {
  const fallbackName = toTrimmedString(payload?.customer?.name);
  const fallbackCode = toTrimmedString(payload?.customer?.accountNo);
  const fallbackId = payload?.customer?.studentId || payload?.studentId || null;

  if (studentRef && typeof studentRef === "object") {
    return {
      id: studentRef._id || studentRef.id || fallbackId || null,
      studentCode: studentRef.studentCode || fallbackCode || "",
      fullName: studentRef.fullName || fallbackName || "",
      gradeYear: studentRef.gradeYear || "",
      sectionClass: studentRef.sectionClass || "",
      status: studentRef.status || "",
    };
  }

  if (!fallbackName && !fallbackCode && !fallbackId) return null;

  return {
    id: fallbackId || null,
    studentCode: fallbackCode || "",
    fullName: fallbackName || "",
    gradeYear: "",
    sectionClass: "",
    status: "",
  };
};

const normalizeDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const invoiceStatuses = new Set([
  "Draft",
  "Issued",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Archived",
]);

const deriveInvoiceStatus = (payload, amountDue, amountPaid, balance) => {
  const explicit = String(payload?.status || "").trim();
  if (invoiceStatuses.has(explicit)) return explicit;
  if (balance <= 0 && amountDue > 0) return "Paid";
  if (amountPaid > 0) return "Partially Paid";
  if (amountDue > 0) return "Issued";
  return "Draft";
};

const resolveStudentForInvoice = async (payload) => {
  const explicitId = payload?.studentId || payload?.customer?.studentId;
  if (mongoose.Types.ObjectId.isValid(explicitId)) {
    const student = await Student.findById(explicitId)
      .select("studentCode fullName gradeYear sectionClass status")
      .lean();
    if (student) return student;
  }

  const studentCode = toTrimmedString(payload?.customer?.accountNo || payload?.studentCode);
  const fullName = toTrimmedString(payload?.customer?.name || payload?.fullName);

  if (studentCode) {
    const byCode = await Student.findOne({ studentCode })
      .select("studentCode fullName gradeYear sectionClass status")
      .lean();
    if (byCode) return byCode;
  }

  if (fullName) {
    const byName = await Student.findOne({
      fullName: { $regex: `^${escapeRegex(fullName)}$`, $options: "i" },
    })
      .select("studentCode fullName gradeYear sectionClass status")
      .lean();
    if (byName) return byName;
  }

  if (!studentCode || !fullName) return null;

  try {
    const created = await Student.create({
      studentCode,
      fullName,
      status: "Active",
    });
    return created.toObject();
  } catch (error) {
    if (error?.code === 11000) {
      return Student.findOne({ studentCode })
        .select("studentCode fullName gradeYear sectionClass status")
        .lean();
    }
    throw error;
  }
};

const attachStudentToPayload = (payload, student) => {
  if (!student?._id && !student?.id) return payload;
  const studentId = String(student._id || student.id);

  return {
    ...payload,
    studentId,
    customer: {
      ...(payload?.customer || {}),
      studentId,
      name: payload?.customer?.name || student.fullName || "",
      accountNo: payload?.customer?.accountNo || student.studentCode || "",
    },
  };
};

const extractInvoiceMetadata = (payload, resolvedStudentId = null) => {
  const amountDue = toNumber(payload?.amountDue ?? payload?.totals?.grandTotal, 0);
  const amountPaid = toNumber(
    payload?.amountPaid ??
      (Array.isArray(payload?.payments)
        ? payload.payments.reduce((sum, payment) => sum + toNumber(payment?.amount, 0), 0)
        : 0),
    0
  );
  const fallbackBalance = Math.max(0, amountDue - amountPaid);
  const balance = toNumber(payload?.balance, fallbackBalance);

  return {
    invoiceCode: String(payload?.invoiceCode || payload?.invoice?.statementNo || "").trim(),
    studentId: toObjectIdOrNull(
      resolvedStudentId || payload?.studentId || payload?.customer?.studentId
    ),
    classId: toObjectIdOrNull(payload?.classId || payload?.school?.classId),
    amountDue,
    amountPaid,
    balance,
    status: deriveInvoiceStatus(payload, amountDue, amountPaid, balance),
    issuedAt: normalizeDateOrNull(payload?.issuedAt || payload?.invoice?.dateIssued),
    dueAt: normalizeDateOrNull(payload?.dueAt || payload?.invoice?.dueDate),
    createdByUserId: toObjectIdOrNull(payload?.createdByUserId),
  };
};

const toInvoiceResponse = (doc) => ({
  id: doc._id,
  invoiceCode: doc.invoiceCode || "",
  studentId: getStudentIdValue(doc.studentId) || null,
  student: toStudentSummary(doc.studentId, doc.data),
  classId: doc.classId || null,
  amountDue: doc.amountDue ?? 0,
  amountPaid: doc.amountPaid ?? 0,
  balance: doc.balance ?? 0,
  status: doc.status || "Draft",
  issuedAt: doc.issuedAt || null,
  dueAt: doc.dueAt || null,
  createdByUserId: doc.createdByUserId || null,
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
    const docs = await Invoice.find({})
      .sort({ updatedAt: -1 })
      .populate(studentPopulate)
      .lean();

    const items = docs.map((doc) => ({
      id: doc._id,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      invoiceCode: doc.invoiceCode || "",
      studentId: getStudentIdValue(doc.studentId) || null,
      student: toStudentSummary(doc.studentId, doc.data),
      classId: doc.classId || null,
      amountDue: doc.amountDue ?? 0,
      amountPaid: doc.amountPaid ?? 0,
      balance: doc.balance ?? 0,
      status: doc.status || "Draft",
      issuedAt: doc.issuedAt || null,
      dueAt: doc.dueAt || null,
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
    const doc = await Invoice.findOne({})
      .sort({ updatedAt: -1 })
      .populate(studentPopulate)
      .lean();
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

    const doc = await Invoice.findById(req.params.id).populate(studentPopulate).lean();
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

    const student = await resolveStudentForInvoice(payload);
    const normalizedPayload = attachStudentToPayload(payload, student);

    const createdInvoice = await Invoice.create({
      data: normalizedPayload,
      ...extractInvoiceMetadata(normalizedPayload, student?._id || student?.id || null),
    });

    const invoice = await Invoice.findById(createdInvoice._id)
      .populate(studentPopulate)
      .lean();

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

    const student = await resolveStudentForInvoice(payload);
    const normalizedPayload = attachStudentToPayload(payload, student);

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        data: normalizedPayload,
        ...extractInvoiceMetadata(normalizedPayload, student?._id || student?.id || null),
      },
      { new: true }
    )
      .populate(studentPopulate)
      .lean();

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
