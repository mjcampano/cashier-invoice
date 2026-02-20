import React, { useMemo, useState } from "react";
import AdminTable from "../components/AdminTable";
import PageHeader from "../components/PageHeader";
import { requirementTypes, seedStudents } from "../data/seedData";
import { exportRowsToCsv, rowMatchesSearch } from "../utils/tableHelpers";

const normalizeStudent = (student) => ({
  studentId: student.studentCode || student.id,
  fullName: student.fullName || student.name || "Unknown Student",
  gradeLevel: student.currentEnrollment?.gradeLevel || "Not Set",
  section: student.currentEnrollment?.section || "Not Set",
  status: student.status || "Active",
  enrollmentStatus: student.currentEnrollment?.enrollmentStatus || "Enrolled",
  updatedAt: student.updatedAt || student.createdAt || null,
  missingRequirements: requirementTypes
    .filter((type) => type.isRequired)
    .reduce((count, type) => {
      const requirement = (student.requirements || []).find(
        (item) => item.requirementTypeId === type.id
      );
      return requirement?.status === "Verified" ? count : count + 1;
    }, 0),
});

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => seedStudents.map(normalizeStudent), []);

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) =>
        rowMatchesSearch(
          row,
          ["studentId", "fullName", "gradeLevel", "section", "status", "enrollmentStatus"],
          searchTerm
        )
      )
      .filter((row) => (gradeFilter === "all" ? true : row.gradeLevel === gradeFilter))
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter));
  }, [rows, searchTerm, gradeFilter, statusFilter]);

  const gradeOptions = useMemo(
    () => [...new Set(rows.map((row) => row.gradeLevel).filter(Boolean))],
    [rows]
  );

  const summary = useMemo(() => {
    const active = rows.filter((row) => row.status === "Active").length;
    const inactive = rows.filter((row) => row.status === "Inactive").length;
    const transferred = rows.filter((row) => row.status === "Transferred").length;
    const graduated = rows.filter((row) => row.status === "Graduated").length;
    const withMissingRequirements = rows.filter((row) => row.missingRequirements > 0).length;

    const enrollmentSummary = rows.reduce((acc, row) => {
      const key = `${row.gradeLevel}::${row.section}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          gradeSection: `${row.gradeLevel} - ${row.section}`,
          total: 0,
        };
      }
      acc[key].total += 1;
      return acc;
    }, {});

    return {
      active,
      inactive,
      transferred,
      graduated,
      withMissingRequirements,
      enrollmentSummary: Object.values(enrollmentSummary).sort((a, b) =>
        a.gradeSection.localeCompare(b.gradeSection)
      ),
    };
  }, [rows]);

  const exportMasterlist = () => {
    exportRowsToCsv("student-masterlist.csv", filteredRows, [
      { key: "studentId", label: "Student ID" },
      { key: "fullName", label: "Full Name" },
      { key: "gradeLevel", label: "Grade" },
      { key: "section", label: "Section" },
      { key: "status", label: "Status" },
      { key: "enrollmentStatus", label: "Enrollment Status" },
      { key: "updatedAt", label: "Last Updated" },
    ]);
  };

  const exportMissingRequirements = () => {
    exportRowsToCsv(
      "missing-requirements-report.csv",
      filteredRows.filter((row) => row.missingRequirements > 0),
      [
        { key: "studentId", label: "Student ID" },
        { key: "fullName", label: "Full Name" },
        { key: "gradeLevel", label: "Grade" },
        { key: "section", label: "Section" },
        { key: "missingRequirements", label: "Missing Requirements" },
      ]
    );
  };

  const exportEnrollmentSummary = () => {
    exportRowsToCsv("enrollment-summary.csv", summary.enrollmentSummary, [
      { key: "gradeSection", label: "Grade - Section" },
      { key: "total", label: "Total Students" },
    ]);
  };

  return (
    <section className="sa-module">
      <PageHeader
        title="Reports"
        subtitle="Generate masterlists and requirement reports with quick filters and exports."
        actions={
          <div className="sa-action-group">
            <button type="button" className="sa-btn sa-btn-secondary" onClick={exportMasterlist}>
              Export Masterlist
            </button>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={exportMissingRequirements}>
              Missing Requirements Report
            </button>
            <button type="button" className="sa-btn sa-btn-primary" onClick={exportEnrollmentSummary}>
              Enrollment Summary
            </button>
          </div>
        }
      />

      <div className="sa-stats-grid sa-stats-grid--four">
        <article className="sa-stat-card">
          <p className="sa-stat-label">Student Masterlist</p>
          <h2 className="sa-stat-value">{rows.length}</h2>
          <p className="sa-stat-subtitle">total records</p>
        </article>
        <article className="sa-stat-card">
          <p className="sa-stat-label">Missing Requirements</p>
          <h2 className="sa-stat-value">{summary.withMissingRequirements}</h2>
          <p className="sa-stat-subtitle">students with missing docs</p>
        </article>
        <article className="sa-stat-card">
          <p className="sa-stat-label">Active / Inactive</p>
          <h2 className="sa-stat-value">{summary.active} / {summary.inactive}</h2>
          <p className="sa-stat-subtitle">status breakdown</p>
        </article>
        <article className="sa-stat-card">
          <p className="sa-stat-label">Transferred / Graduated</p>
          <h2 className="sa-stat-value">{summary.transferred} / {summary.graduated}</h2>
          <p className="sa-stat-subtitle">completion movement</p>
        </article>
      </div>

      <div className="sa-panel sa-stack-gap">
        <div className="sa-toolbar-main">
          <label className="sa-toolbar-search">
            <span className="sa-toolbar-label">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student ID, name, grade, section..."
            />
          </label>

          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Grade</span>
            <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              <option value="all">All Grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Transferred">Transferred</option>
              <option value="Graduated">Graduated</option>
            </select>
          </label>
        </div>

        <AdminTable
          columns={[
            "Student ID",
            "Full Name",
            "Grade-Section",
            "Status",
            "Missing Requirements",
            "Enrollment Status",
            "Last Updated",
          ]}
          minWidth={1140}
        >
          {filteredRows.map((row) => (
            <tr key={row.studentId}>
              <td>{row.studentId}</td>
              <td>{row.fullName}</td>
              <td>{row.gradeLevel} - {row.section}</td>
              <td>{row.status}</td>
              <td>{row.missingRequirements}</td>
              <td>{row.enrollmentStatus}</td>
              <td>{formatDate(row.updatedAt)}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <div className="sa-panel">
        <h3 className="sa-panel-title">Enrollment Summary (By Grade/Section)</h3>
        <AdminTable columns={["Grade-Section", "Total Students"]} minWidth={720}>
          {summary.enrollmentSummary.map((item) => (
            <tr key={item.key}>
              <td>{item.gradeSection}</td>
              <td>{item.total}</td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </section>
  );
}
