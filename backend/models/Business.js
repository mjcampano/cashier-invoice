const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  BusinessName: String,
  Address: String,
  Phone: String,
  TIN: String
});

// EXACT collection name
module.exports = mongoose.model(
  "Business",
  businessSchema,
  "businesses"
);
