import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    category: {
      type: String,
      enum: ["Request", "Complaint", "Question"],
      default: "Question",
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
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Closed"],
      default: "Open",
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "messages",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

MessageSchema.index({ status: 1, priority: 1, createdAt: -1 });
MessageSchema.index({ classId: 1, status: 1 });
MessageSchema.index({ createdByUserId: 1, createdAt: -1 });

MessageSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdByUserId",
  foreignField: "_id",
  justOne: true,
});

export default mongoose.model("Message", MessageSchema);
