import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export default mongoose.model("Invoice", InvoiceSchema);
