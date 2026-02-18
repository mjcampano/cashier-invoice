import mongoose from "mongoose";

const AttendanceRecordSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    classLabel: {
      type: String,
      trim: true,
      default: "",
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentLabel: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Excused"],
      required: true,
    },
    markedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "attendance_records",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AttendanceRecordSchema.index({ date: -1, classId: 1, studentId: 1 }, { unique: true });
AttendanceRecordSchema.index({ status: 1, date: -1 });
AttendanceRecordSchema.index({ studentId: 1, date: -1 });

export default mongoose.model("AttendanceRecord", AttendanceRecordSchema);
