const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  business: Object,
  customer: Object,
  invoiceInfo: Object,
  programTemplate: Object,
  items: Array,
  payments: Array,
  total: Number
});

// 3rd argument = exact MongoDB collection name
module.exports = mongoose.model("Invoice", invoiceSchema, "Invoice");
