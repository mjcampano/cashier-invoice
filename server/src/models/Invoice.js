import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceCode: {
      type: String,
      trim: true,
      default: "",
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    amountDue: {
      type: Number,
      min: 0,
      default: 0,
    },
    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },
    balance: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Archived"],
      default: "Draft",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    dueAt: {
      type: Date,
      default: null,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
    collection: "invoices",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

InvoiceSchema.index({ invoiceCode: 1 }, { unique: true, sparse: true });
InvoiceSchema.index({ studentId: 1, issuedAt: -1 });
InvoiceSchema.index({ status: 1, dueAt: 1 });

InvoiceSchema.virtual("payments", {
  ref: "Payment",
  localField: "_id",
  foreignField: "invoiceId",
});

export default mongoose.model("Invoice", InvoiceSchema);
