import mongoose from "mongoose";
import Notice from "../models/Notice.js";

const asObjectIdOrNull = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? value : null;

export const createAllAudienceNotice = async ({
  title,
  content,
  createdByUserId = null,
  publishDate = new Date(),
}) => {
  const safeTitle = String(title || "").trim();
  const safeContent = String(content || "").trim();
  if (!safeTitle || !safeContent) return null;

  return Notice.create({
    title: safeTitle,
    content: safeContent,
    audience: "All",
    status: "Published",
    publishDate,
    createdByUserId: asObjectIdOrNull(createdByUserId),
  });
};

export default {
  createAllAudienceNotice,
};
