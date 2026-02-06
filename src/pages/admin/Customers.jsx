import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/admin/customers.css";

const columnOptions = [
  { key: "student_no", label: "Student No" },
  { key: "full_name", label: "Full Name" },
  { key: "age", label: "Age" },
  { key: "course", label: "Course" },
  { key: "email", label: "Email" },
  { key: "contact_no", label: "Contact" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "role", label: "Role" },
];

const Students = () => {
  const navigate = useNavigate();

  const [columns, setColumns] = useState([
    "student_no",
    "full_name",
    "age",
    "course",
    "role",
  ]);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalStudent, setModalStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    student_no: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    birthdate: "",
    gender: "",
    address: "",
    contact_no: "",
    email: "",
    password: "",
    course: "",
    photo: null,
    role: "student",
  });

  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/students");
        setStudents(res.data);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      }
    };
    fetchStudents();
  }, []);

  const calculateAge = (birthdate) => {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, photo: null });
      setPhotoPreview(null);
    }
  };

  const resetForm = () => {
    setFormData({
      student_no: "",
      last_name: "",
      first_name: "",
      middle_name: "",
      birthdate: "",
      gender: "",
      address: "",
      contact_no: "",
      email: "",
      password: "",
      course: "",
      photo: null,
      role: "student",
    });
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = [
      "student_no",
      "last_name",
      "first_name",
      "birthdate",
      "gender",
      "address",
      "email",
      "password",
      "course",
      "role",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in ${field.replace("_", " ")}`);
        return;
      }
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) data.append(key, formData[key]);
    });

    try {
      if (editId) {
        await axios.put(
          `http://localhost:5000/api/students/${editId}`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/students",
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }
      const res = await axios.get("http://localhost:5000/api/students");
      setStudents(res.data);
      setShowForm(false);
      setEditId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error saving student");
    }
  };

  const handleEdit = (student) => {
    setFormData({ ...student, photo: null });
    setPhotoPreview(student.photo ? `http://localhost:5000${student.photo}` : null);
    setEditId(student._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive student?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/students/${id}`);
      setStudents(students.filter((s) => s._id !== id));
    } catch (err) {
      console.error(err);
      alert("Error archiving student");
    }
  };
  const filteredStudents = students.filter(
    (s) =>
      !s.is_archived &&
      (s.student_no.includes(searchTerm) ||
        s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="students-page shell">
      <h2 className="h3">Students</h2>

      <div className="topbar">
        <input
          className="input search-input"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          className="actionBtn success"
          onClick={() => {
            resetForm();
            setEditId(null);
            setShowForm(true);
          }}
        >
          + Add Student/Admin
        </button>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="students-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>
                  {col === "full_name"
                    ? "Full Name"
                    : columnOptions.find((opt) => opt.key === col)?.label || col}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s._id}>
                {columns.map((col, index) => (
                  <td key={index}>
                    {col === "full_name"
                      ? `${s.last_name || ""}, ${s.first_name || ""} ${s.middle_name || ""}`
                      : col === "age"
                      ? calculateAge(s.birthdate)
                      : s[col] || ""}
                  </td>
                ))}
                <td>
                  <button className="smallBtn" onClick={() => handleEdit(s)}>Edit</button>
                  <button className="dangerBtn" onClick={() => handleDelete(s._id)}>Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="pop-modal" onClick={() => setShowForm(false)}>
          <div className="pop-modal__dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pop-modal__header">
              <h3 className="pop-modal__title">{editId ? "Edit Student" : "Add Student"}</h3>
            </div>

            <div className="pop-modal__body">
              <div>
                <div className="photo-upload">
                  <input
                    type="file"
                    id="photo"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoChange}
                  />
                  <label htmlFor="photo" className="uploadBtn">
                    {photoPreview ? "Change Photo" : "Upload Photo"}
                  </label>
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="photo-preview"
                      style={{ width: "100px", height: "100px", objectFit: "cover", marginTop: "10px" }}
                    />
                  )}
                </div>

                <form className="student-form" onSubmit={handleSubmit}>
                  <div className="formRow">
                    <label className="label">Student Number</label>
                    <input className="input" name="student_no" value={formData.student_no} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Last Name</label>
                    <input className="input" name="last_name" value={formData.last_name} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">First Name</label>
                    <input className="input" name="first_name" value={formData.first_name} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Middle Name</label>
                    <input className="input" name="middle_name" value={formData.middle_name} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Birthdate</label>
                    <input className="input" type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Gender</label>
                    <select className="input" name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="formRow">
                    <label className="label">Address</label>
                    <input className="input" name="address" value={formData.address} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Contact</label>
                    <input className="input" name="contact_no" value={formData.contact_no} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Email</label>
                    <input className="input" name="email" value={formData.email} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Password</label>
                    <input className="input" type="password" name="password" value={formData.password} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Course</label>
                    <input className="input" name="course" value={formData.course} onChange={handleChange} />
                  </div>
                  <div className="formRow">
                    <label className="label">Role</label>
                    <select className="input" name="role" value={formData.role} onChange={handleChange}>
                      <option value="">Select Role</option>
                      <option value="student">Student</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <button type="submit" className="actionBtn success" style={{ marginTop: "10px" }}>
                    {editId ? "Update" : "Add"}
                  </button>
                </form>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", gap: "10px" }}>
              <button
                className="actionBtn danger"
                onClick={() => setShowForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
