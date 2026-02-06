import React, { useEffect, useState } from "react";
import "../../styles/admin/customers.css";

export default function Students() {
  const [students, setStudents] = useState([]);

  // TEMP sample data (we'll replace with API soon)
  useEffect(() => {
    setStudents([
      {
        _id: 1,
        student_no: "2024-001",
        first_name: "Juan",
        last_name: "Dela Cruz",
        course: "BSIT",
        email: "juan@email.com",
      },
      {
        _id: 2,
        student_no: "2024-002",
        first_name: "Maria",
        last_name: "Santos",
        course: "BSBA",
        email: "maria@email.com",
      },
    ]);
  }, []);

  return (
    <div className="students-page">
      <h2>Student List</h2>

      <div className="students-table-wrapper">
        <table className="students-table">
          <thead>
            <tr>
              <th>Student No</th>
              <th>Name</th>
              <th>Course</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s._id}>
                <td>{s.student_no}</td>
                <td>{s.last_name}, {s.first_name}</td>
                <td>{s.course}</td>
                <td>{s.email}</td>
                <td className="action-cell">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-delete">Delete</button>
                </td>
              </tr>
            ))}

            {students.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
