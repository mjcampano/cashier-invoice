import { Router } from "express";
import Role from "../models/Role.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const items = await Role.find({}).sort({ isSystem: -1, name: 1 }).lean();
    res.json({ items });
  } catch (error) {
    console.error("List roles error:", error);
    res.status(500).json({ message: "Failed to list roles." });
  }
});

export default router;
