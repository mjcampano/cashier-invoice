import { Router } from "express";
import mongoose from "mongoose";
import Student from "../models/Student.js";

const router = Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateStudentId = (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid student id." });
    return false;
  }
  return true;
};

const removeStudentById = async (id, res) => {
  if (!validateStudentId(id, res)) return;

  const student = await Student.findByIdAndDelete(id);
  if (!student) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  res.json({ ok: true, id });
};

router.get("/", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.sectionClass && req.query.sectionClass !== "all") {
      filter.sectionClass = req.query.sectionClass;
    }

    if (req.query.enrollmentDate) {
      const from = new Date(String(req.query.enrollmentDate));
      if (!Number.isNaN(from.getTime())) {
        const next = new Date(from);
        next.setDate(from.getDate() + 1);
        filter.enrollmentDate = { $gte: from, $lt: next };
      }
    }

    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        filter.$or = [
          { studentCode: { $regex: term, $options: "i" } },
          { fullName: { $regex: term, $options: "i" } },
          { gradeYear: { $regex: term, $options: "i" } },
          { sectionClass: { $regex: term, $options: "i" } },
          { guardianContact: { $regex: term, $options: "i" } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Student.countDocuments(filter),
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
    console.error("List students error:", error);
    res.status(500).json({ message: "Failed to list students." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const studentCode = String(payload.studentCode || "").trim();
    const fullName = String(payload.fullName || "").trim();

    if (!studentCode || !fullName) {
      return res
        .status(400)
        .json({ message: "studentCode and fullName are required." });
    }

    if (payload.createdBy && !isValidObjectId(payload.createdBy)) {
      return res.status(400).json({ message: "Invalid createdBy user id." });
    }

    const student = await Student.create({
      studentCode,
      fullName,
      gradeYear: payload.gradeYear || "",
      sectionClass: payload.sectionClass || "",
      guardianContact: payload.guardianContact || "",
      status: payload.status || "Active",
      enrollmentDate: payload.enrollmentDate || undefined,
      createdBy: payload.createdBy || null,
    });

    res.status(201).json(student.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Student code already exists." });
    }
    console.error("Create student error:", error);
    res.status(500).json({ message: "Failed to create student." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateStudentId(id, res)) return;

    const payload = req.body || {};
    const updates = {};

    if (Object.hasOwn(payload, "fullName")) {
      const fullName = String(payload.fullName || "").trim();
      if (!fullName) {
        return res.status(400).json({ message: "fullName cannot be empty." });
      }
      updates.fullName = fullName;
    }

    if (Object.hasOwn(payload, "gradeYear")) {
      updates.gradeYear = String(payload.gradeYear || "").trim();
    }

    if (Object.hasOwn(payload, "sectionClass")) {
      updates.sectionClass = String(payload.sectionClass || "").trim();
    }

    if (Object.hasOwn(payload, "guardianContact")) {
      updates.guardianContact = String(payload.guardianContact || "").trim();
    }

    if (Object.hasOwn(payload, "status")) {
      updates.status = payload.status;
    }

    if (Object.hasOwn(payload, "enrollmentDate")) {
      updates.enrollmentDate = payload.enrollmentDate || null;
    }

    if (Object.hasOwn(payload, "createdBy")) {
      if (payload.createdBy && !isValidObjectId(payload.createdBy)) {
        return res.status(400).json({ message: "Invalid createdBy user id." });
      }
      updates.createdBy = payload.createdBy || null;
    }

    const student = await Student.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json(student.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Student code already exists." });
    }
    console.error("Update student error:", error);
    res.status(500).json({ message: "Failed to update student." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await removeStudentById(req.params.id, res);
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Failed to delete student." });
  }
});

router.post("/:id/delete", async (req, res) => {
  try {
    await removeStudentById(req.params.id, res);
  } catch (error) {
    console.error("Delete student via POST error:", error);
    res.status(500).json({ message: "Failed to delete student." });
  }
});

export default router;
