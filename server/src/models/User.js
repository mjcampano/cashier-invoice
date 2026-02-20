import mongoose from "mongoose";
import { createAllAudienceNotice } from "../services/noticeAlerts.js";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    profile: {
      displayName: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      avatarUrl: { type: String, trim: true, default: "" },
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

UserSchema.index({ roleId: 1, status: 1 });

UserSchema.pre("save", function markNewUser(next) {
  this.$locals = this.$locals || {};
  this.$locals.wasNew = this.isNew;
  next();
});

UserSchema.post("save", async function createUserNotice(doc, next) {
  try {
    if (!doc.$locals?.wasNew || doc.$locals?.skipNoticeAlert) {
      next();
      return;
    }

    const displayName = doc.profile?.displayName?.trim() || doc.email;
    await createAllAudienceNotice({
      title: "New user account added",
      content: `A new user account was created for ${displayName}.`,
    });
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("User", UserSchema);
