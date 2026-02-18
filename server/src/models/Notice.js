import mongoose from "mongoose";

const NoticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      enum: ["All", "Teachers", "Students", "Class"],
      default: "All",
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Scheduled", "Archived"],
      default: "Draft",
    },
    publishDate: {
      type: Date,
      default: null,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "notices",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

NoticeSchema.index({ status: 1, publishDate: -1 });
NoticeSchema.index({ title: "text", content: "text" });
NoticeSchema.index({ createdByUserId: 1, createdAt: -1 });

NoticeSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdByUserId",
  foreignField: "_id",
  justOne: true,
});

export default mongoose.model("Notice", NoticeSchema);
