import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    studentCode: {
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
    gradeYear: {
      type: String,
      trim: true,
      default: "",
    },
    sectionClass: {
      type: String,
      trim: true,
      default: "",
    },
    guardianContact: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Archived"],
      default: "Active",
    },
    enrollmentDate: {
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
    collection: "students",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

StudentSchema.index({ fullName: "text", gradeYear: "text", sectionClass: "text" });
StudentSchema.index({ status: 1, enrollmentDate: -1 });

StudentSchema.virtual("enrollments", {
  ref: "Enrollment",
  localField: "_id",
  foreignField: "studentId",
});

StudentSchema.virtual("payments", {
  ref: "Payment",
  localField: "_id",
  foreignField: "studentId",
});

StudentSchema.virtual("invoiceRecords", {
  ref: "Invoice",
  localField: "_id",
  foreignField: "studentId",
});

StudentSchema.virtual("attendanceRecords", {
  ref: "AttendanceRecord",
  localField: "_id",
  foreignField: "studentId",
});

export default mongoose.model("Student", StudentSchema);
