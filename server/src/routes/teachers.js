import { Router } from "express";
import mongoose from "mongoose";
import Teacher from "../models/Teacher.js";

const router = Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

router.get("/", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.department && req.query.department !== "all") {
      filter.department = req.query.department;
    }

    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        filter.$or = [
          { teacherCode: { $regex: term, $options: "i" } },
          { fullName: { $regex: term, $options: "i" } },
          { email: { $regex: term, $options: "i" } },
          { subject: { $regex: term, $options: "i" } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      Teacher.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Teacher.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("List teachers error:", error);
    res.status(500).json({ message: "Failed to list teachers." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const teacherCode = String(payload.teacherCode || "").trim();
    const fullName = String(payload.fullName || "").trim();

    if (!teacherCode || !fullName) {
      return res
        .status(400)
        .json({ message: "teacherCode and fullName are required." });
    }

    if (payload.createdBy && !isValidObjectId(payload.createdBy)) {
      return res.status(400).json({ message: "Invalid createdBy user id." });
    }

    const teacher = new Teacher({
      teacherCode,
      fullName,
      email: payload.email || "",
      phone: payload.phone || "",
      department: payload.department || "",
      subject: payload.subject || "",
      status: payload.status || "Active",
      hiredAt: payload.hiredAt || undefined,
      createdBy: payload.createdBy || null,
    });

    if (payload.suppressNotice === true) {
      teacher.$locals = { ...(teacher.$locals || {}), skipNoticeAlert: true };
    }

    await teacher.save();
    res.status(201).json(teacher.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Teacher code already exists." });
    }
    console.error("Create teacher error:", error);
    res.status(500).json({ message: "Failed to create teacher." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid teacher id." });
    }

    const payload = req.body || {};
    const updates = {};

    if (Object.hasOwn(payload, "fullName")) {
      const fullName = String(payload.fullName || "").trim();
      if (!fullName) {
        return res.status(400).json({ message: "fullName cannot be empty." });
      }
      updates.fullName = fullName;
    }

    if (Object.hasOwn(payload, "email")) {
      updates.email = String(payload.email || "").trim().toLowerCase();
    }

    if (Object.hasOwn(payload, "phone")) {
      updates.phone = String(payload.phone || "").trim();
    }

    if (Object.hasOwn(payload, "department")) {
      updates.department = String(payload.department || "").trim();
    }

    if (Object.hasOwn(payload, "subject")) {
      updates.subject = String(payload.subject || "").trim();
    }

    if (Object.hasOwn(payload, "status")) {
      updates.status = payload.status;
    }

    if (Object.hasOwn(payload, "hiredAt")) {
      updates.hiredAt = payload.hiredAt || null;
    }

    if (Object.hasOwn(payload, "createdBy")) {
      if (payload.createdBy && !isValidObjectId(payload.createdBy)) {
        return res.status(400).json({ message: "Invalid createdBy user id." });
      }
      updates.createdBy = payload.createdBy || null;
    }

    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    res.json(teacher.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Teacher code already exists." });
    }
    console.error("Update teacher error:", error);
    res.status(500).json({ message: "Failed to update teacher." });
  }
});

export default router;
