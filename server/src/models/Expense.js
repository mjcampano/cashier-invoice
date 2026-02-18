import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    expenseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    vendor: {
      type: String,
      trim: true,
      default: "",
    },
    expenseDate: {
      type: Date,
      default: Date.now,
    },
    createdByUserId: {
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
    collection: "expenses",
  }
);

ExpenseSchema.index({ category: 1, expenseDate: -1 });

export default mongoose.model("Expense", ExpenseSchema);
