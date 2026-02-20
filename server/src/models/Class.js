import mongoose from "mongoose";

const ClassSchema = new mongoose.Schema(
  {
    classCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    gradeYear: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    term: {
      type: String,
      trim: true,
      default: "",
    },
    schoolYear: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
    collection: "classes",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ClassSchema.index({ gradeYear: 1, section: 1, term: 1, schoolYear: 1 });
ClassSchema.index({ status: 1, schoolYear: 1, term: 1 });

ClassSchema.virtual("enrollments", {
  ref: "Enrollment",
  localField: "_id",
  foreignField: "classId",
});

ClassSchema.statics.findWithStudents = function findWithStudents(match = {}) {
  return this.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "classId",
        as: "enrollments",
      },
    },
    {
      $lookup: {
        from: "students",
        localField: "enrollments.studentId",
        foreignField: "_id",
        as: "students",
      },
    },
  ]);
};

export default mongoose.model("Class", ClassSchema);
