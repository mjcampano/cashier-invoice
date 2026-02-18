import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = Router();

const toSafeUser = (doc) => {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  const { passwordHash: _passwordHash, ...safe } = plain || {};
  return safe;
};

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

    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        filter.$or = [
          { email: { $regex: term, $options: "i" } },
          { "profile.displayName": { $regex: term, $options: "i" } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-passwordHash").lean(),
      User.countDocuments(filter),
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
    console.error("List users error:", error);
    res.status(500).json({ message: "Failed to list users." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const email = String(payload.email || "").trim().toLowerCase();
    const passwordHash = String(payload.passwordHash || "").trim();

    if (!email || !passwordHash || !payload.roleId) {
      return res
        .status(400)
        .json({ message: "email, passwordHash, and roleId are required." });
    }

    if (!isValidObjectId(payload.roleId)) {
      return res.status(400).json({ message: "Invalid roleId." });
    }

    if (payload.teacherId && !isValidObjectId(payload.teacherId)) {
      return res.status(400).json({ message: "Invalid teacherId." });
    }

    if (payload.studentId && !isValidObjectId(payload.studentId)) {
      return res.status(400).json({ message: "Invalid studentId." });
    }

    const user = new User({
      email,
      passwordHash,
      roleId: payload.roleId,
      profile: payload.profile || {},
      teacherId: payload.teacherId || null,
      studentId: payload.studentId || null,
      status: payload.status || "Active",
      lastLoginAt: payload.lastLoginAt || null,
    });

    if (payload.suppressNotice === true) {
      user.$locals = { ...(user.$locals || {}), skipNoticeAlert: true };
    }

    await user.save();
    res.status(201).json(toSafeUser(user));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "User already exists." });
    }
    console.error("Create user error:", error);
    res.status(500).json({ message: "Failed to create user." });
  }
});

export default router;
