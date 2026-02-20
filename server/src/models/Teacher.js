import mongoose from "mongoose";
import { createAllAudienceNotice } from "../services/noticeAlerts.js";

const TeacherSchema = new mongoose.Schema(
  {
    teacherCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    hiredAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "teachers",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TeacherSchema.index({ fullName: "text", email: "text", department: "text", subject: "text" });
TeacherSchema.index({ status: 1, department: 1 });

TeacherSchema.virtual("assignedClasses", {
  ref: "Class",
  localField: "_id",
  foreignField: "teacherIds",
});

TeacherSchema.virtual("advisoryClasses", {
  ref: "Class",
  localField: "_id",
  foreignField: "adviserTeacherId",
});

TeacherSchema.pre("save", function markNewTeacher(next) {
  this.$locals = this.$locals || {};
  this.$locals.wasNew = this.isNew;
  next();
});

TeacherSchema.post("save", async function createTeacherNotice(doc, next) {
  try {
    if (!doc.$locals?.wasNew || doc.$locals?.skipNoticeAlert) {
      next();
      return;
    }

    const codeSuffix = doc.teacherCode ? ` (${doc.teacherCode})` : "";
    await createAllAudienceNotice({
      title: "New teacher added",
      content: `Teacher ${doc.fullName}${codeSuffix} was added to the system.`,
      createdByUserId: doc.createdBy || null,
    });
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Teacher", TeacherSchema);
