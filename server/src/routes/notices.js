import { Router } from "express";
import mongoose from "mongoose";
import Notice from "../models/Notice.js";

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
    const status = req.query.status || "Published";
    if (status !== "all") {
      filter.status = status;
    }

    const audience = req.query.audience;
    if (audience && audience !== "all") {
      filter.$or = [{ audience: "All" }, { audience }];
    }

    if (req.query.search) {
      const term = String(req.query.search).trim();
      if (term) {
        filter.$text = { $search: term };
      }
    }

    const [items, total] = await Promise.all([
      Notice.find(filter)
        .sort({ publishDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notice.countDocuments(filter),
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
    console.error("List notices error:", error);
    res.status(500).json({ message: "Failed to list notices." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const title = String(payload.title || "").trim();
    const content = String(payload.content || "").trim();

    if (!title || !content) {
      return res.status(400).json({ message: "title and content are required." });
    }

    if (payload.createdByUserId && !isValidObjectId(payload.createdByUserId)) {
      return res.status(400).json({ message: "Invalid createdByUserId." });
    }

    const notice = await Notice.create({
      title,
      content,
      audience: payload.audience || "All",
      status: payload.status || "Published",
      publishDate: payload.publishDate || new Date(),
      createdByUserId: payload.createdByUserId || null,
    });

    res.status(201).json(notice.toObject());
  } catch (error) {
    console.error("Create notice error:", error);
    res.status(500).json({ message: "Failed to create notice." });
  }
});

export default router;
