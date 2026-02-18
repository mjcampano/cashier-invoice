import React, { useCallback, useMemo, useState, useEffect } from "react";
import { createTeacher, listTeachers, updateTeacher } from "../../../api/adminRecords";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import TableToolbar from "../components/TableToolbar";
import { seedTeachers } from "../data/seedData";
import {
  buildComparator,
  exportRowsToCsv,
  paginateRows,
  rowMatchesSearch,
  toggleSelection,
} from "../utils/tableHelpers";

const teacherTabs = [
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "logs", label: "Logs" },
];

const teacherSortOptions = [
  {
    value: "newest",
    label: "Newest",
    compare: (a, b) => new Date(b.createdDate) - new Date(a.createdDate),
  },
  {
    value: "name",
    label: "Name",
    compare: (a, b) => a.fullName.localeCompare(b.fullName),
  },
  {
    value: "amount",
    label: "Amount",
    compare: (a, b) => (b.classes?.length ?? 0) - (a.classes?.length ?? 0),
  },
];

const blankTeacherForm = {
  fullName: "",
  email: "",
  phone: "",
  department: "",
  subject: "",
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

function normalizeTeacherRow(teacher) {
  return {
    id: teacher._id || teacher.id || teacher.teacherCode || "",
    teacherCode: teacher.teacherCode || teacher.id || "-",
    fullName: teacher.fullName || "",
    email: teacher.email || "",
    phone: teacher.phone || "",
    department: teacher.department || "",
    subject: teacher.subject || "",
    status: teacher.status || "Active",
    createdDate:
      teacher.createdDate ||
      toIsoDateString(teacher.createdAt || teacher.hiredAt || new Date().toISOString()),
    profile: {
      employeeNo: teacher.profile?.employeeNo || "Not set",
      advisoryClass: teacher.profile?.advisoryClass || "To be assigned",
      qualification: teacher.profile?.qualification || "Not set",
      address: teacher.profile?.address || "Not set",
    },
    classes:
      Array.isArray(teacher.classes) && teacher.classes.length
        ? teacher.classes
        : ["No classes assigned"],
    attendance: {
      rate: teacher.attendance?.rate || "N/A",
      recent: teacher.attendance?.recent || "No attendance data yet",
    },
  };
}

function mapTeacherToForm(teacher) {
  return {
    fullName: teacher.fullName,
    email: teacher.email,
    phone: teacher.phone,
    department: teacher.department,
    subject: teacher.subject,
    status: teacher.status,
  };
}

function nextTeacherCode(teachers) {
  const numbers = teachers
    .map((teacher) => Number.parseInt(String(teacher.teacherCode || "").replace("TCH-", ""), 10))
    .filter((value) => Number.isFinite(value));

  const highest = numbers.length ? Math.max(...numbers) : 1000;
  return `TCH-${highest + 1}`;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [view, setView] = useState("table");
  const [formMode, setFormMode] = useState("add");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState(blankTeacherForm);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const loadTeachers = useCallback(async (preferredTeacherId = "") => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await listTeachers({ limit: 500 });
      const rows = Array.isArray(response?.items)
        ? response.items.map(normalizeTeacherRow)
        : [];

      setTeachers(rows);
      setSelectedTeacherId((current) => {
        const candidate = preferredTeacherId || current;
        if (candidate && rows.some((teacher) => teacher.id === candidate)) {
          return candidate;
        }
        return rows[0]?.id || "";
      });
    } catch (error) {
      const fallbackRows = seedTeachers.map(normalizeTeacherRow);
      setTeachers(fallbackRows);
      setSelectedTeacherId((current) => {
        if (current && fallbackRows.some((teacher) => teacher.id === current)) {
          return current;
        }
        return fallbackRows[0]?.id || "";
      });
      setLoadError(error?.message || "Failed to load teachers from backend. Showing local data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === selectedTeacherId) || null,
    [selectedTeacherId, teachers]
  );

  const classOptions = useMemo(
    () =>
      [
        ...new Set(
          teachers
            .flatMap((teacher) => [teacher.profile?.advisoryClass, ...(teacher.classes || [])])
            .filter(Boolean)
        ),
      ],
    [teachers]
  );

  const filteredTeachers = useMemo(() => {
    const comparator = buildComparator(sortValue, teacherSortOptions);
    return [...teachers]
      .filter((teacher) =>
        rowMatchesSearch(
          teacher,
          ["teacherCode", "fullName", "email", "phone", "department", "subject"],
          searchTerm
        )
      )
      .filter((teacher) => (statusFilter === "all" ? true : teacher.status === statusFilter))
      .filter((teacher) =>
        classFilter === "all"
          ? true
          : teacher.profile?.advisoryClass === classFilter || (teacher.classes || []).includes(classFilter)
      )
      .filter((teacher) => (dateFilter ? teacher.createdDate === dateFilter : true))
      .sort(comparator);
  }, [teachers, searchTerm, statusFilter, classFilter, dateFilter, sortValue]);

  const { pageRows: pagedTeachers, totalPages, currentPage } = paginateRows(
    filteredTeachers,
    page,
    pageSize
  );

  const allVisibleSelected =
    pagedTeachers.length > 0 && pagedTeachers.every((teacher) => selectedIds.has(teacher.id));

  const handleOpenView = (teacherId) => {
    setSelectedTeacherId(teacherId);
    setActiveTab("profile");
    setView("view");
  };

  const handleOpenAdd = () => {
    setFormMode("add");
    setFormData(blankTeacherForm);
    setView("form");
  };

  const handleOpenEdit = (teacher) => {
    setFormMode("edit");
    setSelectedTeacherId(teacher.id);
    setFormData(mapTeacherToForm(teacher));
    setView("form");
  };

  const handleDisableTeacher = async (teacherId) => {
    const current = teachers.find((teacher) => teacher.id === teacherId);
    if (!current) return;

    const nextStatus = current.status === "Active" ? "Inactive" : "Active";

    try {
      await updateTeacher(teacherId, { status: nextStatus });
      setTeachers((currentTeachers) =>
        currentTeachers.map((teacher) =>
          teacher.id === teacherId
            ? {
                ...teacher,
                status: nextStatus,
              }
            : teacher
        )
      );
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Failed to update teacher status.");
    }
  };

  const handleBulkArchive = async () => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];

    try {
      await Promise.all(ids.map((id) => updateTeacher(id, { status: "Inactive" })));
      setTeachers((currentTeachers) =>
        currentTeachers.map((teacher) =>
          ids.includes(teacher.id) ? { ...teacher, status: "Inactive" } : teacher
        )
      );
      setSelectedIds(new Set());
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Failed to archive selected teachers.");
    }
  };

  const handleBulkPublish = async () => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];

    try {
      await Promise.all(ids.map((id) => updateTeacher(id, { status: "Active" })));
      setTeachers((currentTeachers) =>
        currentTeachers.map((teacher) =>
          ids.includes(teacher.id) ? { ...teacher, status: "Active" } : teacher
        )
      );
      setSelectedIds(new Set());
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Failed to publish selected teachers.");
    }
  };

  const handleExportSelected = () => {
    if (!selectedIds.size) return;
    const selectedRows = teachers.filter((teacher) => selectedIds.has(teacher.id));
    exportRowsToCsv("teachers-export.csv", selectedRows, [
      { key: "teacherCode", label: "Teacher ID" },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Department" },
      { key: "subject", label: "Subject" },
      { key: "status", label: "Status" },
      { key: "createdDate", label: "Created Date" },
    ]);
  };

  const handleSaveTeacher = async (event) => {
    event.preventDefault();

    try {
      if (formMode === "edit") {
        const updatedTeacher = await updateTeacher(selectedTeacherId, {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          subject: formData.subject,
          status: formData.status,
        });

        const normalized = normalizeTeacherRow(updatedTeacher);
        setTeachers((currentTeachers) =>
          currentTeachers.map((teacher) =>
            teacher.id === selectedTeacherId
              ? {
                  ...teacher,
                  ...normalized,
                }
              : teacher
          )
        );
      } else {
        const createdTeacher = await createTeacher({
          teacherCode: nextTeacherCode(teachers),
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          subject: formData.subject,
          status: formData.status,
        });

        const normalized = normalizeTeacherRow(createdTeacher);
        setTeachers((currentTeachers) => [normalized, ...currentTeachers]);
        setSelectedTeacherId(normalized.id);
      }

      setLoadError("");
      setView("table");
    } catch (error) {
      setLoadError(error?.message || "Failed to save teacher.");
    }
  };

  const viewLogs = selectedTeacher
    ? [
        `${formatDate(selectedTeacher.createdDate)}: Teacher record created`,
        `${formatDate(selectedTeacher.createdDate)}: Profile verified by Admin`,
        `${formatDate(new Date())}: Last reviewed in admin module`,
      ]
    : [];

  return (
    <section className="sa-module">
      {view === "table" ? (
        <>
          <PageHeader
            title="Teachers"
            subtitle="Manage faculty records with persistent backend data, standard filters, sorting, pagination, and bulk actions."
            actions={
              <div className="sa-action-group">
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => loadTeachers()}>
                  Refresh
                </button>
                <button type="button" className="sa-btn sa-btn-primary" onClick={handleOpenAdd}>
                  Add Teacher
                </button>
              </div>
            }
          />

          {loadError ? <p className="sa-error-text">{loadError}</p> : null}
          {isLoading ? <p className="sa-muted-text">Loading teachers...</p> : null}

          <TableToolbar
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            searchPlaceholder="Search teacher ID, name, email, phone..."
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
                ],
              },
              {
                key: "class",
                label: "Class",
                value: classFilter,
                onChange: (value) => {
                  setClassFilter(value);
                  setPage(1);
                },
                options: [
                  { value: "all", label: "All Classes" },
                  ...classOptions.map((className) => ({
                    value: className,
                    label: className,
                  })),
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
                  ...[...new Set(teachers.map((teacher) => teacher.createdDate).filter(Boolean))].map(
                    (date) => ({
                      value: date,
                      label: formatDate(date),
                    })
                  ),
                ],
              },
            ]}
            sortOptions={teacherSortOptions.map(({ value, label }) => ({ value, label }))}
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
              { label: "Export", tone: "sa-btn-secondary", onClick: handleExportSelected },
            ]}
          />

          <AdminTable
            columns={[
              "Select",
              "Teacher ID",
              "Full Name",
              "Email / Phone",
              "Department / Subject",
              "Status",
              "Created Date",
              "Actions",
            ]}
            minWidth={1220}
          >
            {pagedTeachers.map((teacher) => (
              <tr key={teacher.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(teacher.id)}
                    onChange={() => setSelectedIds((current) => toggleSelection(current, teacher.id))}
                  />
                </td>
                <td>{teacher.teacherCode}</td>
                <td>{teacher.fullName}</td>
                <td>
                  <div className="sa-cell-stack">
                    <span>{teacher.email}</span>
                    <span className="sa-muted-inline">{teacher.phone}</span>
                  </div>
                </td>
                <td>
                  <div className="sa-cell-stack">
                    <span>{teacher.department}</span>
                    <span className="sa-muted-inline">{teacher.subject}</span>
                  </div>
                </td>
                <td>
                  <StatusBadge status={teacher.status} />
                </td>
                <td>{formatDate(teacher.createdDate)}</td>
                <td>
                  <div className="sa-action-group">
                    <button
                      type="button"
                      className="sa-btn sa-btn-ghost"
                      onClick={() => handleOpenView(teacher.id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn-ghost"
                      onClick={() => handleOpenEdit(teacher)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn-danger"
                      onClick={() => handleDisableTeacher(teacher.id)}
                    >
                      {teacher.status === "Active" ? "Archive" : "Publish"}
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
                      pagedTeachers.forEach((teacher) => next.delete(teacher.id));
                    } else {
                      pagedTeachers.forEach((teacher) => next.add(teacher.id));
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
              totalItems={filteredTeachers.length}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      {view === "view" && selectedTeacher ? (
        <>
          <PageHeader
            title={`Teacher: ${selectedTeacher.fullName}`}
            subtitle={`${selectedTeacher.teacherCode} • ${selectedTeacher.department}`}
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <div className="sa-panel">
            <DetailTabs tabs={teacherTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "profile" ? (
              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Email</p>
                  <p className="sa-value">{selectedTeacher.email}</p>
                </div>
                <div>
                  <p className="sa-label">Phone</p>
                  <p className="sa-value">{selectedTeacher.phone}</p>
                </div>
                <div>
                  <p className="sa-label">Employee Number</p>
                  <p className="sa-value">{selectedTeacher.profile.employeeNo}</p>
                </div>
                <div>
                  <p className="sa-label">Advisory Class</p>
                  <p className="sa-value">{selectedTeacher.profile.advisoryClass}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="sa-stack-gap">
                <p className="sa-label">Class Assignments</p>
                <ul className="sa-list">
                  {selectedTeacher.classes.map((className) => (
                    <li key={className}>{className}</li>
                  ))}
                </ul>
                <p className="sa-label">Attendance Summary</p>
                <p className="sa-value">
                  {selectedTeacher.attendance.rate} • {selectedTeacher.attendance.recent}
                </p>
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
            title={formMode === "add" ? "Add Teacher" : "Edit Teacher"}
            subtitle="Fill in teacher profile details then save to return to the table."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          {loadError ? <p className="sa-error-text">{loadError}</p> : null}

          <form className="sa-panel sa-form" onSubmit={handleSaveTeacher}>
            <div className="sa-form-grid">
              <label className="sa-field">
                <span>Full Name</span>
                <input
                  required
                  value={formData.fullName}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, fullName: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, email: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Phone</span>
                <input
                  required
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, phone: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Department</span>
                <input
                  required
                  value={formData.department}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, department: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Subject</span>
                <input
                  required
                  value={formData.subject}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, subject: event.target.value }))
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
                </select>
              </label>
            </div>

            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Cancel
              </button>
              <button type="submit" className="sa-btn sa-btn-primary">
                Save Teacher
              </button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
