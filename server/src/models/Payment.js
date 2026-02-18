import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeType: {
      type: String,
      trim: true,
      default: "Tuition",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["Cash", "GCash", "Bank", "Card", "Other"],
      default: "Cash",
    },
    status: {
      type: String,
      enum: ["Paid", "Pending", "Refunded"],
      default: "Paid",
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    receivedByUserId: {
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
    collection: "payments",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PaymentSchema.index({ studentId: 1, paidAt: -1 });
PaymentSchema.index({ status: 1, method: 1 });

export default mongoose.model("Payment", PaymentSchema);
