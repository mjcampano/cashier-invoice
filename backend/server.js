const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const Business = require("./models/Business");
const Invoice = require("./models/Invoice");
const User = require("./models/User"); 
const adminRoutes = require("./routes/admin");
const Student = require("./models/Student");

const app = express();

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== MULTER STORAGE =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder must exist
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const studentNo = req.body.student_no || Date.now();
    cb(null, `student_${studentNo}${ext}`);
  },
});
const upload = multer({ storage });

// ===== DATABASE =====
mongoose.connect("mongodb://127.0.0.1:27017/billingDB")
  .then(() => console.log("MongoDB connected to billingDB"))
  .catch(err => console.error(err));

// ===== ROUTES =====
app.use("/api/admin", adminRoutes);

// ----- BUSINESS -----
app.get("/api/business", async (req, res) => {
  try {
    const businesses = await Business.find();
    res.json(businesses);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ----- LOGIN -----
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, student.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      {
        id: student._id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        role: student.role,
      },
      "your_jwt_secret_here",
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ----- STUDENTS -----
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find({ is_archived: false });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/students", upload.single("photo"), async (req, res) => {
  try {
    const studentData = { ...req.body };
    
    if (!studentData.password) return res.status(400).json({ error: "Password required" });
    studentData.password = await bcrypt.hash(studentData.password, 10);

    if (req.file) studentData.photo = `/uploads/${req.file.filename}`;

    const student = new Student(studentData);
    await student.save();
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.put("/api/students/:id", upload.single("photo"), async (req, res) => {
  try {
    const updatedData = { ...req.body };

    if (updatedData.password) {
      updatedData.password = await bcrypt.hash(updatedData.password, 10);
    }

    if (req.file) updatedData.photo = `/uploads/${req.file.filename}`;

    const updated = await Student.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.delete("/api/students/:id", async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { is_archived: true });
    res.json({ message: "Archived" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== SERVER START =====
app.listen(5000, () => console.log("Server running on port 5000"));