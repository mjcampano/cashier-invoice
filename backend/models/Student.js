const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  student_no: { type: String, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  middle_name: { type: String, default: "" },
  birthdate: { type: Date, required: true },
  gender: { type: String, enum: ["Male", "Female"], required: true },
  address: { type: String, required: true },
  contact_no: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password
  course: { type: String, required: true },
  photo: { type: String, default: "" },
  role: { type: String, enum: ["student", "admin", "superadmin"], default: "student" },
  is_archived: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
