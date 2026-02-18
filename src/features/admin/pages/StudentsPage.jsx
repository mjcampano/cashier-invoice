import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createStudent, listStudents, updateStudent } from "../../../api/adminRecords";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import TableToolbar from "../components/TableToolbar";
import { seedStudents } from "../data/seedData";
import {
  buildComparator,
  exportRowsToCsv,
  paginateRows,
  rowMatchesSearch,
  toggleSelection,
} from "../utils/tableHelpers";

const studentTabs = [
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "logs", label: "Logs" },
];

const studentSortOptions = [
  {
    value: "newest",
    label: "Newest",
    compare: (a, b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate),
  },
  {
    value: "name",
    label: "Name",
    compare: (a, b) => a.name.localeCompare(b.name),
  },
  {
    value: "amount",
    label: "Amount",
    compare: (a, b) => (b.payments?.balance ?? 0) - (a.payments?.balance ?? 0),
  },
];

const blankStudentForm = {
  name: "",
  gradeYear: "",
  sectionClass: "",
  guardianContact: "",
  status: "Active",
};

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toIsoDateString(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeStudentRow(student) {
  const totalPaid = Number(student.payments?.totalPaid ?? 0);
  const balance = Number(student.payments?.balance ?? 0);

  return {
    id: student._id || student.id || student.studentCode || "",
    studentCode: student.studentCode || student.id || "-",
    name: student.fullName || student.name || "",
    gradeYear: student.gradeYear || "",
    sectionClass: student.sectionClass || "",
    guardianContact: student.guardianContact || "",
    status: student.status || "Active",
    enrollmentDate: toIsoDateString(
      student.enrollmentDate || student.createdAt || new Date().toISOString()
    ),
    profile: {
      birthDate: student.profile?.birthDate || "Not set",
      address: student.profile?.address || "Not set",
      adviser: student.profile?.adviser || "Not assigned",
    },
    payments: {
      totalPaid: Number.isFinite(totalPaid) ? totalPaid : 0,
      balance: Number.isFinite(balance) ? balance : 0,
      lastPayment: toIsoDateString(student.payments?.lastPayment) || "",
    },
    attendance: {
      rate: student.attendance?.rate || "N/A",
      absences: Number.isFinite(student.attendance?.absences)
        ? student.attendance.absences
        : 0,
    },
    grades: {
      average: student.grades?.average || "N/A",
      standing: student.grades?.standing || "Pending",
    },
  };
}

function nextStudentCode(students) {
  const highest = students.reduce((max, student) => {
    const parsed = Number.parseInt(
      String(student.studentCode || student.id || "").replace("STD-", ""),
      10
    );
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 2100);

  return `STD-${highest + 1}`;
}

function highestStudentCode(students) {
  return students.reduce((max, student) => {
    const parsed = Number.parseInt(
      String(student.studentCode || student.id || "").replace("STD-", ""),
      10
    );
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 2100);
}

function mapStudentToForm(student) {
  return {
    name: student.name,
    gradeYear: student.gradeYear,
    sectionClass: student.sectionClass,
    guardianContact: student.guardianContact,
    status: student.status,
  };
}

function parseCsvRows(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const index = {
    studentCode: headers.findIndex((header) =>
      ["student id", "student code", "studentid", "id", "code"].includes(header)
    ),
    name: headers.findIndex((header) => ["name", "student name", "full name"].includes(header)),
    gradeYear: headers.findIndex((header) => ["grade/year", "grade", "year"].includes(header)),
    sectionClass: headers.findIndex((header) => ["section/class", "section", "class"].includes(header)),
    guardianContact: headers.findIndex((header) =>
      ["guardian contact", "guardian", "contact"].includes(header)
    ),
  };

  return lines.slice(1).map((line, lineIndex) => {
    const columns = line.split(",").map((column) => column.trim());
    return {
      studentCode: columns[index.studentCode] || `CSV-${lineIndex + 1}`,
      name: columns[index.name] || "Unknown Student",
      gradeYear: columns[index.gradeYear] || "Not Set",
      sectionClass: columns[index.sectionClass] || "Not Set",
      guardianContact: columns[index.guardianContact] || "Not Set",
    };
  });
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [view, setView] = useState("table");
  const [formMode, setFormMode] = useState("add");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState(blankStudentForm);
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importStep, setImportStep] = useState("upload");
  const [validatedRows, setValidatedRows] = useState([]);
  const [importError, setImportError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const loadStudents = useCallback(async (preferredStudentId = "") => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await listStudents({ limit: 500 });
      const rows = Array.isArray(response?.items)
        ? response.items.map(normalizeStudentRow)
        : [];

      setStudents(rows);
      setSelectedIds((current) => {
        const valid = new Set(rows.map((student) => student.id));
        return new Set([...current].filter((id) => valid.has(id)));
      });
      setSelectedStudentId((current) => {
        const candidate = preferredStudentId || current;
        if (candidate && rows.some((student) => student.id === candidate)) {
          return candidate;
        }
        return rows[0]?.id || "";
      });
    } catch (error) {
      const fallbackRows = seedStudents.map(normalizeStudentRow);
      setStudents(fallbackRows);
      setSelectedIds((current) => {
        const valid = new Set(fallbackRows.map((student) => student.id));
        return new Set([...current].filter((id) => valid.has(id)));
      });
      setSelectedStudentId((current) => {
        if (current && fallbackRows.some((student) => student.id === current)) {
          return current;
        }
        return fallbackRows[0]?.id || "";
      });
      setLoadError(error?.message || "Failed to load students from backend. Showing local data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [selectedStudentId, students]
  );

  const sectionOptions = useMemo(
    () => [...new Set(students.map((student) => student.sectionClass).filter(Boolean))],
    [students]
  );

  const filteredStudents = useMemo(() => {
    const comparator = buildComparator(sortValue, studentSortOptions);
    return [...students]
      .filter((student) =>
        rowMatchesSearch(
          student,
          ["studentCode", "name", "gradeYear", "sectionClass", "guardianContact"],
          searchTerm
        )
      )
      .filter((student) => (statusFilter === "all" ? true : student.status === statusFilter))
      .filter((student) => (sectionFilter === "all" ? true : student.sectionClass === sectionFilter))
      .filter((student) => (dateFilter ? student.enrollmentDate === dateFilter : true))
      .sort(comparator);
  }, [students, searchTerm, statusFilter, sectionFilter, dateFilter, sortValue]);

  const { pageRows: pagedStudents, totalPages, currentPage } = paginateRows(
    filteredStudents,
    page,
    pageSize
  );

  const allVisibleSelected =
    pagedStudents.length > 0 && pagedStudents.every((student) => selectedIds.has(student.id));

  const resetImportFlow = () => {
    setImportText("");
    setImportFileName("");
    setImportStep("upload");
    setValidatedRows([]);
    setImportError("");
  };

  const handleOpenView = (studentId) => {
    setSelectedStudentId(studentId);
    setActiveTab("profile");
    setView("view");
  };

  const handleOpenEdit = (student) => {
    setFormMode("edit");
    setSelectedStudentId(student.id);
    setFormData(mapStudentToForm(student));
    setView("form");
  };

  const handleOpenAdd = () => {
    setFormMode("add");
    setFormData(blankStudentForm);
    setView("form");
  };

  const handleArchiveStudent = async (studentId) => {
    const current = students.find((student) => student.id === studentId);
    if (!current) return;

    const nextStatus = current.status === "Archived" ? "Active" : "Archived";

    try {
      await updateStudent(studentId, { status: nextStatus });
      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === studentId
            ? {
                ...student,
                status: nextStatus,
              }
            : student
        )
      );
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Failed to update student status.");
    }
  };

  const handleBulkArchive = async () => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];

    try {
      await Promise.all(ids.map((id) => updateStudent(id, { status: "Archived" })));
      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          ids.includes(student.id) ? { ...student, status: "Archived" } : student
        )
      );
      setSelectedIds(new Set());
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Failed to archive selected students.");
    }
  };

  const handleBulkPublish = async () => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];

    try {
      await Promise.all(ids.map((id) => updateStudent(id, { status: "Active" })));
      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          ids.includes(student.id) ? { ...student, status: "Active" } : student
        )
      );
      setSelectedIds(new Set());
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Failed to publish selected students.");
    }
  };

  const handleBulkExport = () => {
    if (!selectedIds.size) return;
    exportRowsToCsv(
      "students-export.csv",
      students.filter((student) => selectedIds.has(student.id)),
      [
        { key: "studentCode", label: "Student ID" },
        { key: "name", label: "Name" },
        { key: "gradeYear", label: "Grade/Year" },
        { key: "sectionClass", label: "Section/Class" },
        { key: "guardianContact", label: "Guardian Contact" },
        { key: "status", label: "Status" },
        { key: "enrollmentDate", label: "Enrollment Date" },
      ]
    );
  };

  const handleSaveStudent = async (event) => {
    event.preventDefault();

    try {
      if (formMode === "edit") {
        const updatedStudent = await updateStudent(selectedStudentId, {
          fullName: formData.name,
          gradeYear: formData.gradeYear,
          sectionClass: formData.sectionClass,
          guardianContact: formData.guardianContact,
          status: formData.status,
        });

        const normalized = normalizeStudentRow(updatedStudent);
        setStudents((currentStudents) =>
          currentStudents.map((student) =>
            student.id === selectedStudentId
              ? {
                  ...student,
                  ...normalized,
                }
              : student
          )
        );
      } else {
        const createdStudent = await createStudent({
          studentCode: nextStudentCode(students),
          fullName: formData.name,
          gradeYear: formData.gradeYear,
          sectionClass: formData.sectionClass,
          guardianContact: formData.guardianContact,
          status: formData.status,
        });

        const normalized = normalizeStudentRow(createdStudent);
        setStudents((currentStudents) => [normalized, ...currentStudents]);
        setSelectedStudentId(normalized.id);
      }

      setLoadError("");
      setView("table");
    } catch (error) {
      setLoadError(error?.message || "Failed to save student.");
    }
  };

  const handleCsvFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ""));
      setImportFileName(selectedFile.name);
      setImportStep("upload");
      setValidatedRows([]);
      setImportError("");
    };
    reader.readAsText(selectedFile);
  };

  const handleValidateCsv = () => {
    if (!importText.trim()) {
      setImportError("Please upload a CSV file before validating.");
      return;
    }

    const rows = parseCsvRows(importText);
    if (!rows.length) {
      setImportError("No student rows found. Add a header row and at least one data row.");
      return;
    }

    setValidatedRows(rows);
    setImportStep("validate");
    setImportError("");
  };

  const handleConfirmImport = async () => {
    if (!validatedRows.length) {
      setImportError("No validated rows found.");
      return;
    }

    let codeCounter = highestStudentCode(students);
    const createdRows = [];

    for (let rowIndex = 0; rowIndex < validatedRows.length; rowIndex += 1) {
      const row = validatedRows[rowIndex];
      const fallbackCode = `STD-${++codeCounter}`;
      const studentCode =
        row.studentCode && !row.studentCode.startsWith("CSV-")
          ? row.studentCode
          : fallbackCode;

      try {
        const createdStudent = await createStudent({
          studentCode,
          fullName: row.name,
          gradeYear: row.gradeYear,
          sectionClass: row.sectionClass,
          guardianContact: row.guardianContact,
          status: "Active",
        });
        createdRows.push(normalizeStudentRow(createdStudent));
      } catch (error) {
        if (createdRows.length) {
          setStudents((currentStudents) => [...createdRows, ...currentStudents]);
        }
        setImportError(
          `Import stopped on row ${rowIndex + 1}: ${
            error?.message || "Failed to import students."
          }`
        );
        return;
      }
    }

    setStudents((currentStudents) => [...createdRows, ...currentStudents]);
    setImportStep("confirm");
    setImportError("");
    setLoadError("");

    window.setTimeout(() => {
      resetImportFlow();
      setView("table");
    }, 900);
  };

  const viewLogs = selectedStudent
    ? [
        `${formatDate(selectedStudent.enrollmentDate)}: Student enrolled`,
        `${formatDate(new Date())}: Record viewed by Admin`,
      ]
    : [];

  return (
    <section className="sa-module">
      {view === "table" ? (
        <>
          <PageHeader
            title="Students"
            subtitle="Manage students with persistent backend data, standard search, filters, sorting, pagination, and bulk actions."
            actions={
              <div className="sa-action-group">
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => loadStudents()}>
                  Refresh
                </button>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={handleOpenAdd}>
                  Add Student
                </button>
                <button
                  type="button"
                  className="sa-btn sa-btn-primary"
                  onClick={() => {
                    resetImportFlow();
                    setView("import");
                  }}
                >
                  Bulk Import (CSV)
                </button>
              </div>
            }
          />

          {loadError ? <p className="sa-error-text">{loadError}</p> : null}
          {isLoading ? <p className="sa-muted-text">Loading students...</p> : null}

          <TableToolbar
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            searchPlaceholder="Search student ID, name, grade, section..."
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter,
                onChange: (value) => {
                  setStatusFilter(value);
                  setPage(1);
                },
                options: [
                  { value: "all", label: "All Status" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Archived", label: "Archived" },
                ],
              },
              {
                key: "section",
                label: "Class",
                value: sectionFilter,
                onChange: (value) => {
                  setSectionFilter(value);
                  setPage(1);
                },
                options: [
                  { value: "all", label: "All Classes" },
                  ...sectionOptions.map((section) => ({ value: section, label: section })),
                ],
              },
              {
                key: "date",
                label: "Date",
                value: dateFilter,
                onChange: (value) => {
                  setDateFilter(value);
                  setPage(1);
                },
                options: [
                  { value: "", label: "All Dates" },
                  ...[...new Set(students.map((student) => student.enrollmentDate).filter(Boolean))].map(
                    (date) => ({
                      value: date,
                      label: formatDate(date),
                    })
                  ),
                ],
              },
            ]}
            sortOptions={studentSortOptions.map(({ value, label }) => ({ value, label }))}
            sortValue={sortValue}
            onSortChange={(value) => {
              setSortValue(value);
              setPage(1);
            }}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            selectedCount={selectedIds.size}
            bulkActions={[
              { label: "Archive", tone: "sa-btn-danger", onClick: handleBulkArchive },
              { label: "Publish", tone: "sa-btn-secondary", onClick: handleBulkPublish },
              { label: "Export", tone: "sa-btn-secondary", onClick: handleBulkExport },
            ]}
          />

          <AdminTable
            columns={[
              "Select",
              "Student ID",
              "Name",
              "Grade/Year",
              "Section/Class",
              "Guardian Contact",
              "Status",
              "Enrollment Date",
              "Actions",
            ]}
            minWidth={1280}
          >
            {pagedStudents.map((student) => (
              <tr key={student.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(student.id)}
                    onChange={() => setSelectedIds((current) => toggleSelection(current, student.id))}
                  />
                </td>
                <td>{student.studentCode}</td>
                <td>{student.name}</td>
                <td>{student.gradeYear}</td>
                <td>{student.sectionClass}</td>
                <td>{student.guardianContact}</td>
                <td>
                  <StatusBadge status={student.status} />
                </td>
                <td>{formatDate(student.enrollmentDate)}</td>
                <td>
                  <div className="sa-action-group">
                    <button
                      type="button"
                      className="sa-btn sa-btn-ghost"
                      onClick={() => handleOpenView(student.id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn-ghost"
                      onClick={() => handleOpenEdit(student)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn-danger"
                      onClick={() => handleArchiveStudent(student.id)}
                    >
                      {student.status === "Archived" ? "Restore" : "Archive"}
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
                      pagedStudents.forEach((student) => next.delete(student.id));
                    } else {
                      pagedStudents.forEach((student) => next.add(student.id));
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
              totalItems={filteredStudents.length}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      {view === "view" && selectedStudent ? (
        <>
          <PageHeader
            title={`Student: ${selectedStudent.name}`}
            subtitle={`${selectedStudent.studentCode} | ${selectedStudent.gradeYear} | ${selectedStudent.sectionClass}`}
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <div className="sa-panel">
            <DetailTabs tabs={studentTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "profile" ? (
              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Guardian Contact</p>
                  <p className="sa-value">{selectedStudent.guardianContact}</p>
                </div>
                <div>
                  <p className="sa-label">Birth Date</p>
                  <p className="sa-value">{selectedStudent.profile.birthDate}</p>
                </div>
                <div>
                  <p className="sa-label">Address</p>
                  <p className="sa-value">{selectedStudent.profile.address}</p>
                </div>
                <div>
                  <p className="sa-label">Adviser</p>
                  <p className="sa-value">{selectedStudent.profile.adviser}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Total Paid</p>
                  <p className="sa-value">${selectedStudent.payments.totalPaid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="sa-label">Balance</p>
                  <p className="sa-value">${selectedStudent.payments.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="sa-label">Attendance Rate</p>
                  <p className="sa-value">{selectedStudent.attendance.rate}</p>
                </div>
                <div>
                  <p className="sa-label">Grade Average</p>
                  <p className="sa-value">{selectedStudent.grades.average}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "logs" ? (
              <ul className="sa-list">
                {viewLogs.map((logEntry) => (
                  <li key={logEntry}>{logEntry}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {view === "form" ? (
        <>
          <PageHeader
            title={formMode === "add" ? "Add Student" : "Edit Student"}
            subtitle="Save to return to student records table."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          {loadError ? <p className="sa-error-text">{loadError}</p> : null}

          <form className="sa-panel sa-form" onSubmit={handleSaveStudent}>
            <div className="sa-form-grid">
              <label className="sa-field">
                <span>Name</span>
                <input
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, name: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Grade/Year</span>
                <input
                  required
                  value={formData.gradeYear}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, gradeYear: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Section/Class</span>
                <input
                  required
                  value={formData.sectionClass}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, sectionClass: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Guardian Contact</span>
                <input
                  required
                  value={formData.guardianContact}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, guardianContact: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Status</span>
                <select
                  value={formData.status}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, status: event.target.value }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Cancel
              </button>
              <button type="submit" className="sa-btn sa-btn-primary">
                Save Student
              </button>
            </div>
          </form>
        </>
      ) : null}

      {view === "import" ? (
        <>
          <PageHeader
            title="Bulk Import Students"
            subtitle="Upload CSV, validate rows, then confirm to add students."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <div className="sa-panel sa-stack-gap">
            <div className="sa-form-grid">
              <label className="sa-field">
                <span>CSV File</span>
                <input type="file" accept=".csv" onChange={handleCsvFileChange} />
              </label>
              <div className="sa-inline-note">
                Required headers: <code>Student ID, Name, Grade/Year, Section/Class, Guardian Contact</code>
              </div>
            </div>

            {importFileName ? <p className="sa-muted-text">Loaded file: {importFileName}</p> : null}
            {importError ? <p className="sa-error-text">{importError}</p> : null}

            <div className="sa-action-group">
              <button type="button" className="sa-btn sa-btn-primary" onClick={handleValidateCsv}>
                Validate
              </button>
              <button type="button" className="sa-btn sa-btn-secondary" onClick={resetImportFlow}>
                Reset
              </button>
            </div>

            {importStep !== "upload" ? (
              <>
                <h3 className="sa-panel-title">Validated Rows ({validatedRows.length})</h3>
                <AdminTable
                  columns={["Student ID", "Name", "Grade/Year", "Section/Class", "Guardian Contact"]}
                  minWidth={880}
                >
                  {validatedRows.map((row, rowIndex) => (
                    <tr key={`${row.studentCode}-${rowIndex}`}>
                      <td>{row.studentCode}</td>
                      <td>{row.name}</td>
                      <td>{row.gradeYear}</td>
                      <td>{row.sectionClass}</td>
                      <td>{row.guardianContact}</td>
                    </tr>
                  ))}
                </AdminTable>

                <div className="sa-action-group">
                  <button type="button" className="sa-btn sa-btn-primary" onClick={handleConfirmImport}>
                    Confirm Import
                  </button>
                  {importStep === "confirm" ? (
                    <p className="sa-success-text">Students imported successfully.</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
