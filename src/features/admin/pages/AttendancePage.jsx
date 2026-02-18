import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import TableToolbar from "../components/TableToolbar";
import { attendanceRoster, seedAttendance } from "../data/seedData";
import {
  buildComparator,
  exportRowsToCsv,
  paginateRows,
  rowMatchesSearch,
  toggleSelection,
} from "../utils/tableHelpers";

const statusOptions = ["Present", "Absent", "Late", "Excused"];

const detailTabs = [
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "logs", label: "Logs" },
];

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function createGridRows(classSection) {
  return attendanceRoster
    .filter((student) => student.section === classSection)
    .map((student) => ({
      studentId: student.studentId,
      studentName: student.name,
      status: "Present",
      notes: "",
    }));
}

function downloadPdf(records) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  pdf.setFontSize(14);
  pdf.text("Attendance Report", 36, 36);

  pdf.setFontSize(10);
  let y = 56;

  records.forEach((record, index) => {
    const line = `${index + 1}. ${record.date} | ${record.classSection} | ${record.studentName} (${record.studentId}) | ${record.status} | ${record.markedBy}`;

    if (y > 540) {
      pdf.addPage();
      y = 40;
    }

    pdf.text(line, 36, y);
    if (record.notes) {
      y += 12;
      pdf.text(`Notes: ${record.notes}`, 48, y);
    }

    y += 18;
  });

  pdf.save(`attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState(seedAttendance);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const classSections = useMemo(
    () => [...new Set(attendanceRoster.map((student) => student.section))],
    []
  );
  const initialClassSection = classSections[0] || "";
  const [selectedClassSection, setSelectedClassSection] = useState(initialClassSection);
  const [gridRows, setGridRows] = useState(() => createGridRows(initialClassSection));
  const [editingRowId, setEditingRowId] = useState("");
  const [editingDraft, setEditingDraft] = useState({ status: "Present", notes: "" });
  const [submitMessage, setSubmitMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [activeRecordId, setActiveRecordId] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const activeRecord = useMemo(
    () => attendanceRecords.find((record) => record.id === activeRecordId) || null,
    [attendanceRecords, activeRecordId]
  );
  const recordCountByStudent = useMemo(
    () =>
      attendanceRecords.reduce((counts, record) => {
        counts[record.studentId] = (counts[record.studentId] || 0) + 1;
        return counts;
      }, {}),
    [attendanceRecords]
  );
  const attendanceSortOptions = useMemo(
    () => [
      {
        value: "newest",
        label: "Newest",
        compare: (a, b) => new Date(b.date) - new Date(a.date),
      },
      {
        value: "name",
        label: "Name",
        compare: (a, b) => a.studentName.localeCompare(b.studentName),
      },
      {
        value: "amount",
        label: "Amount",
        compare: (a, b) =>
          (recordCountByStudent[b.studentId] || 0) - (recordCountByStudent[a.studentId] || 0),
      },
    ],
    [recordCountByStudent]
  );

  const filteredRecords = useMemo(() => {
    const comparator = buildComparator(sortValue, attendanceSortOptions);
    return [...attendanceRecords]
      .filter((record) =>
        rowMatchesSearch(
          record,
          ["studentName", "studentId", "classSection", "markedBy", "notes"],
          searchTerm
        )
      )
      .filter((record) => (statusFilter === "all" ? true : record.status === statusFilter))
      .filter((record) => (classFilter === "all" ? true : record.classSection === classFilter))
      .filter((record) => (dateFilter ? record.date === dateFilter : true))
      .sort(comparator);
  }, [
    attendanceRecords,
    searchTerm,
    statusFilter,
    classFilter,
    dateFilter,
    sortValue,
    attendanceSortOptions,
  ]);

  const { pageRows: pagedRecords, totalPages, currentPage } = paginateRows(
    filteredRecords,
    page,
    pageSize
  );

  const allVisibleSelected =
    pagedRecords.length > 0 && pagedRecords.every((record) => selectedIds.has(record.id));

  const handleClassSectionChange = (nextClassSection) => {
    setSelectedClassSection(nextClassSection);
    setGridRows(createGridRows(nextClassSection));
    setSubmitMessage("");
  };

  const handleGridChange = (studentId, field, value) => {
    setGridRows((currentRows) =>
      currentRows.map((row) =>
        row.studentId === studentId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleSubmitAttendance = () => {
    if (!selectedDate || !selectedClassSection || !gridRows.length) {
      setSubmitMessage("Select date and class first.");
      return;
    }

    const nowId = Date.now();
    const newRecords = gridRows.map((row, rowIndex) => ({
      id: `ATT-${nowId + rowIndex}`,
      date: selectedDate,
      classSection: selectedClassSection,
      studentName: row.studentName,
      studentId: row.studentId,
      status: row.status,
      markedBy: "Class Adviser",
      notes: row.notes || "-",
    }));

    setAttendanceRecords((currentRecords) => [...newRecords, ...currentRecords]);
    setSubmitMessage(`Submitted ${newRecords.length} attendance record(s).`);
  };

  const handleEditRecord = (record) => {
    setEditingRowId(record.id);
    setEditingDraft({ status: record.status, notes: record.notes });
  };

  const handleSaveRecordEdit = (recordId) => {
    setAttendanceRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === recordId
          ? {
              ...record,
              status: editingDraft.status,
              notes: editingDraft.notes,
            }
          : record
      )
    );

    setEditingRowId("");
  };

  const handleBulkArchive = () => {
    if (!selectedIds.size) return;
    setAttendanceRecords((currentRecords) =>
      currentRecords.map((record) =>
        selectedIds.has(record.id)
          ? { ...record, status: "Absent", notes: `${record.notes} (Archived in bulk)`.trim() }
          : record
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkPublish = () => {
    if (!selectedIds.size) return;
    setAttendanceRecords((currentRecords) =>
      currentRecords.map((record) =>
        selectedIds.has(record.id)
          ? { ...record, status: "Present", notes: `${record.notes} (Published in bulk)`.trim() }
          : record
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    if (!selectedIds.size) return;
    exportRowsToCsv(
      "attendance-selected.csv",
      attendanceRecords.filter((record) => selectedIds.has(record.id)),
      [
        { key: "date", label: "Date" },
        { key: "classSection", label: "Class/Section" },
        { key: "studentName", label: "Student Name" },
        { key: "studentId", label: "Student ID" },
        { key: "status", label: "Status" },
        { key: "markedBy", label: "Marked By" },
        { key: "notes", label: "Notes" },
      ]
    );
  };

  const historyRows = activeRecord
    ? attendanceRecords
        .filter((record) => record.studentId === activeRecord.studentId)
        .slice(0, 5)
        .map((record) => `${formatDate(record.date)} • ${record.status} • ${record.classSection}`)
    : [];

  return (
    <section className="sa-module">
      <PageHeader
        title="Attendance"
        subtitle="Mark attendance by date and class, then manage records with standard table controls."
      />

      <div className="sa-panel sa-stack-gap">
        <h3 className="sa-panel-title">Mark Attendance</h3>
        <div className="sa-form-grid">
          <label className="sa-field">
            <span>Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>

          <label className="sa-field">
            <span>Class / Section</span>
            <select
              value={selectedClassSection}
              onChange={(event) => handleClassSectionChange(event.target.value)}
            >
              {classSections.map((classSection) => (
                <option key={classSection} value={classSection}>
                  {classSection}
                </option>
              ))}
            </select>
          </label>
        </div>

        <AdminTable columns={["Student Name / ID", "Status", "Notes"]} minWidth={700}>
          {gridRows.map((row) => (
            <tr key={row.studentId}>
              <td>
                <div className="sa-cell-stack">
                  <span>{row.studentName}</span>
                  <span className="sa-muted-inline">{row.studentId}</span>
                </div>
              </td>
              <td>
                <select
                  value={row.status}
                  onChange={(event) => handleGridChange(row.studentId, "status", event.target.value)}
                >
                  {statusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  value={row.notes}
                  placeholder="Optional note"
                  onChange={(event) => handleGridChange(row.studentId, "notes", event.target.value)}
                />
              </td>
            </tr>
          ))}
        </AdminTable>

        <div className="sa-action-group">
          <button type="button" className="sa-btn sa-btn-primary" onClick={handleSubmitAttendance}>
            Submit
          </button>
          {submitMessage ? <p className="sa-success-text">{submitMessage}</p> : null}
        </div>
      </div>

      <div className="sa-panel sa-stack-gap">
        <div className="sa-panel-row">
          <h3 className="sa-panel-title">Attendance Reports</h3>
          <div className="sa-action-group">
            <button
              type="button"
              className="sa-btn sa-btn-secondary"
              onClick={() =>
                exportRowsToCsv("attendance-report.csv", filteredRecords, [
                  { key: "date", label: "Date" },
                  { key: "classSection", label: "Class/Section" },
                  { key: "studentName", label: "Student Name" },
                  { key: "studentId", label: "Student ID" },
                  { key: "status", label: "Status" },
                  { key: "markedBy", label: "Marked By" },
                  { key: "notes", label: "Notes" },
                ])
              }
            >
              Export CSV
            </button>
            <button
              type="button"
              className="sa-btn sa-btn-secondary"
              onClick={() => downloadPdf(filteredRecords)}
            >
              Export PDF
            </button>
          </div>
        </div>

        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          searchPlaceholder="Search student, class, notes, marker..."
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
                ...statusOptions.map((status) => ({ value: status, label: status })),
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
                ...classSections.map((classSection) => ({ value: classSection, label: classSection })),
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
                ...[...new Set(attendanceRecords.map((record) => record.date))].map((date) => ({
                  value: date,
                  label: formatDate(date),
                })),
              ],
            },
          ]}
          sortOptions={attendanceSortOptions.map(({ value, label }) => ({ value, label }))}
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
            "Date",
            "Class/Section",
            "Student Name / ID",
            "Status",
            "Marked By",
            "Notes",
            "Actions",
          ]}
          minWidth={1280}
        >
          {pagedRecords.map((record) => (
            <tr key={record.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => setSelectedIds((current) => toggleSelection(current, record.id))}
                />
              </td>
              <td>{formatDate(record.date)}</td>
              <td>{record.classSection}</td>
              <td>
                <div className="sa-cell-stack">
                  <span>{record.studentName}</span>
                  <span className="sa-muted-inline">{record.studentId}</span>
                </div>
              </td>
              <td>
                {editingRowId === record.id ? (
                  <select
                    value={editingDraft.status}
                    onChange={(event) =>
                      setEditingDraft((currentDraft) => ({
                        ...currentDraft,
                        status: event.target.value,
                      }))
                    }
                  >
                    {statusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={record.status} />
                )}
              </td>
              <td>{record.markedBy}</td>
              <td>
                {editingRowId === record.id ? (
                  <input
                    value={editingDraft.notes}
                    onChange={(event) =>
                      setEditingDraft((currentDraft) => ({
                        ...currentDraft,
                        notes: event.target.value,
                      }))
                    }
                  />
                ) : (
                  record.notes
                )}
              </td>
              <td>
                <div className="sa-action-group">
                  <button
                    type="button"
                    className="sa-btn sa-btn-ghost"
                    onClick={() => {
                      setActiveRecordId(record.id);
                      setActiveTab("profile");
                    }}
                  >
                    View
                  </button>
                  {editingRowId === record.id ? (
                    <>
                      <button
                        type="button"
                        className="sa-btn sa-btn-primary"
                        onClick={() => handleSaveRecordEdit(record.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn-ghost"
                        onClick={() => setEditingRowId("")}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="sa-btn sa-btn-ghost"
                      onClick={() => handleEditRecord(record)}
                    >
                      Edit
                    </button>
                  )}
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
                    pagedRecords.forEach((record) => next.delete(record.id));
                  } else {
                    pagedRecords.forEach((record) => next.add(record.id));
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
            totalItems={filteredRecords.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      {activeRecord ? (
        <div className="sa-panel sa-stack-gap">
          <div className="sa-panel-row">
            <h3 className="sa-panel-title">
              View Attendance: {activeRecord.studentName} ({activeRecord.studentId})
            </h3>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setActiveRecordId("")}>
              Close View
            </button>
          </div>

          <DetailTabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "profile" ? (
            <div className="sa-detail-grid">
              <div>
                <p className="sa-label">Date</p>
                <p className="sa-value">{formatDate(activeRecord.date)}</p>
              </div>
              <div>
                <p className="sa-label">Class/Section</p>
                <p className="sa-value">{activeRecord.classSection}</p>
              </div>
              <div>
                <p className="sa-label">Status</p>
                <p className="sa-value">{activeRecord.status}</p>
              </div>
              <div>
                <p className="sa-label">Marked By</p>
                <p className="sa-value">{activeRecord.markedBy}</p>
              </div>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <ul className="sa-list">
              {historyRows.map((historyRow) => (
                <li key={historyRow}>{historyRow}</li>
              ))}
            </ul>
          ) : null}

          {activeTab === "logs" ? (
            <ul className="sa-list">
              <li>{formatDate(activeRecord.date)}: Attendance entry created.</li>
              <li>{formatDate(new Date())}: Entry reviewed in admin reports.</li>
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
