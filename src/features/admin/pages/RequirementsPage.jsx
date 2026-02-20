import React, { useMemo, useState } from "react";
import AdminTable from "../components/AdminTable";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import { requirementTypes, seedStudents } from "../data/seedData";
import { exportRowsToCsv, paginateRows, rowMatchesSearch, toggleSelection } from "../utils/tableHelpers";

const requiredTypes = requirementTypes.filter((type) => type.isRequired);

const cloneStudents = () =>
  seedStudents.map((student) => ({
    ...student,
    requirements: (student.requirements || []).map((requirement) => ({
      ...requirement,
      documents: [...(requirement.documents || [])],
    })),
  }));

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStudentId = (student) => student.studentCode || student.id;
const getName = (student) => student.fullName || student.name || "Unknown Student";
const getGrade = (student) => student.currentEnrollment?.gradeLevel || "Not Set";
const getSection = (student) => student.currentEnrollment?.section || "Not Set";

const getRequirement = (student, typeId) =>
  (student.requirements || []).find((item) => item.requirementTypeId === typeId) || {
    requirementTypeId: typeId,
    status: "Pending",
    verifiedAt: null,
    notes: "",
    documents: [],
  };

const getMissingRequirementNames = (student) =>
  requiredTypes
    .filter((type) => getRequirement(student, type.id).status !== "Verified")
    .map((type) => type.name);

const getRows = (students) =>
  students.map((student) => {
    const missingRequirementNames = getMissingRequirementNames(student);
    return {
      rowId: getStudentId(student),
      studentId: getStudentId(student),
      fullName: getName(student),
      grade: getGrade(student),
      section: getSection(student),
      gradeSection: `${getGrade(student)} - ${getSection(student)}`,
      status: student.status || "Active",
      missingCount: missingRequirementNames.length,
      missingLabel: missingRequirementNames.length ? `Missing ${missingRequirementNames.length}` : "Complete",
      missingNames: missingRequirementNames.join(", "),
      updatedAt: student.updatedAt || student.createdAt || null,
    };
  });

export default function RequirementsPage({ onNavigate }) {
  const [students, setStudents] = useState(cloneStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [missingOnly, setMissingOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const rows = useMemo(() => getRows(students), [students]);

  const gradeOptions = useMemo(
    () => [...new Set(rows.map((row) => row.grade).filter(Boolean))],
    [rows]
  );
  const sectionOptions = useMemo(
    () => [...new Set(rows.map((row) => row.section).filter(Boolean))],
    [rows]
  );
  const statusOptions = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter(Boolean))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) =>
        rowMatchesSearch(
          row,
          ["studentId", "fullName", "grade", "section", "status", "missingNames"],
          searchTerm
        )
      )
      .filter((row) => (gradeFilter === "all" ? true : row.grade === gradeFilter))
      .filter((row) => (sectionFilter === "all" ? true : row.section === sectionFilter))
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
      .filter((row) => (missingOnly ? row.missingCount > 0 : true));
  }, [rows, searchTerm, gradeFilter, sectionFilter, statusFilter, missingOnly]);

  const { pageRows, totalPages, currentPage } = paginateRows(filteredRows, page, pageSize);
  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.rowId));

  const verifyStudents = (studentIds) => {
    if (!studentIds.length) return;
    const selectedMap = new Set(studentIds);
    const now = new Date().toISOString();

    setStudents((currentStudents) =>
      currentStudents.map((student) => {
        const studentId = getStudentId(student);
        if (!selectedMap.has(studentId)) return student;

        const requirements = requiredTypes.map((type) => {
          const requirement = getRequirement(student, type.id);
          return {
            ...requirement,
            requirementTypeId: type.id,
            status: "Verified",
            verifiedAt: now,
            notes: requirement.notes || "Verified from requirements monitoring.",
          };
        });

        return {
          ...student,
          requirements,
          updatedAt: now,
        };
      })
    );
  };

  const handleBulkVerify = () => {
    if (!selectedIds.size) return;
    verifyStudents([...selectedIds]);
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    exportRowsToCsv("missing-requirements-report.csv", filteredRows, [
      { key: "studentId", label: "Student ID" },
      { key: "fullName", label: "Full Name" },
      { key: "grade", label: "Grade" },
      { key: "section", label: "Section" },
      { key: "status", label: "Status" },
      { key: "missingLabel", label: "Missing Documents" },
      { key: "missingNames", label: "Missing Requirement Names" },
      { key: "updatedAt", label: "Last Updated" },
    ]);
  };

  const openStudents = () => {
    if (typeof onNavigate === "function") onNavigate("students");
  };

  return (
    <section className="sa-module">
      <PageHeader
        title="Requirements Monitoring"
        subtitle="Track students with missing requirements, apply bulk verification, and export compliance reports."
        actions={
          <div className="sa-action-group">
            <button type="button" className="sa-btn sa-btn-secondary" onClick={handleExport}>
              Export Report
            </button>
            <button type="button" className="sa-btn sa-btn-primary" onClick={handleBulkVerify}>
              Mark Selected as Verified
            </button>
          </div>
        }
      />

      <div className="sa-panel sa-stack-gap">
        <div className="sa-toolbar-main">
          <label className="sa-toolbar-search">
            <span className="sa-toolbar-label">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search student ID, name, grade, section, status..."
            />
          </label>

          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Grade</span>
            <select
              value={gradeFilter}
              onChange={(event) => {
                setGradeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Section</span>
            <select
              value={sectionFilter}
              onChange={(event) => {
                setSectionFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </label>

          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Rows</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="sa-toolbar-bulk">
          <label className="sa-toggle">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={() => {
                setMissingOnly((current) => !current);
                setPage(1);
              }}
            />
            <span>Show missing docs only</span>
          </label>

          <span className="sa-muted-text">Selected: {selectedIds.size}</span>
        </div>

        <AdminTable
          columns={[
            "Select",
            "Student ID",
            "Full Name",
            "Grade-Section",
            "Student Status",
            "Missing Docs",
            "Last Updated",
            "Actions",
          ]}
          minWidth={1240}
        >
          {pageRows.map((row) => (
            <tr key={row.rowId}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.rowId)}
                  onChange={() => setSelectedIds((current) => toggleSelection(current, row.rowId))}
                />
              </td>
              <td>{row.studentId}</td>
              <td>{row.fullName}</td>
              <td>{row.gradeSection}</td>
              <td>
                <StatusBadge status={row.status} />
              </td>
              <td>
                <div className="sa-requirement-badge">
                  <StatusBadge status={row.missingCount === 0 ? "Complete" : "Missing"} />
                  <span className="sa-muted-inline">{row.missingLabel}</span>
                </div>
              </td>
              <td>{formatDate(row.updatedAt)}</td>
              <td>
                <div className="sa-action-group">
                  <button
                    type="button"
                    className="sa-btn sa-btn-secondary"
                    onClick={() => verifyStudents([row.rowId])}
                    disabled={row.missingCount === 0}
                  >
                    Mark Verified
                  </button>
                  <button type="button" className="sa-btn sa-btn-ghost" onClick={openStudents}>
                    Open Student
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>

        <div className="sa-table-meta-row">
          <label className="sa-table-select-all">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (allVisibleSelected) {
                    pageRows.forEach((row) => next.delete(row.rowId));
                  } else {
                    pageRows.forEach((row) => next.add(row.rowId));
                  }
                  return next;
                })
              }
            />
            <span>Select page</span>
          </label>

          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            onPageChange={setPage}
          />
        </div>
      </div>
    </section>
  );
}
