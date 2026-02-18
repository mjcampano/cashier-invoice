import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    term: {
      type: String,
      required: true,
      trim: true,
    },
    schoolYear: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Enrolled", "Dropped", "Completed"],
      default: "Enrolled",
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "enrollments",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

EnrollmentSchema.index(
  { studentId: 1, classId: 1, term: 1, schoolYear: 1 },
  { unique: true, name: "uniq_enrollment_per_term" }
);
EnrollmentSchema.index({ classId: 1, status: 1 });
EnrollmentSchema.index({ studentId: 1, status: 1 });

EnrollmentSchema.virtual("student", {
  ref: "Student",
  localField: "studentId",
  foreignField: "_id",
  justOne: true,
});

EnrollmentSchema.virtual("classRecord", {
  ref: "Class",
  localField: "classId",
  foreignField: "_id",
  justOne: true,
});

export default mongoose.model("Enrollment", EnrollmentSchema);
