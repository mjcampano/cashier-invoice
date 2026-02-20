import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Exam", "Holiday", "Meeting", "Other"],
      default: "Other",
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    audience: {
      type: String,
      enum: ["All", "Students", "Class"],
      default: "All",
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
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Published",
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "events",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

EventSchema.index({ startAt: 1, endAt: 1 });
EventSchema.index({ type: 1, audience: 1 });
EventSchema.index({ status: 1, classId: 1, startAt: 1 });
EventSchema.index({ createdByUserId: 1, createdAt: -1 });

EventSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdByUserId",
  foreignField: "_id",
  justOne: true,
});

export default mongoose.model("Event", EventSchema);
