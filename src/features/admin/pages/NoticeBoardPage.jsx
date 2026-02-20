import React, { useMemo, useState } from "react";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import TableToolbar from "../components/TableToolbar";
import { seedNotices } from "../data/seedData";
import {
  buildComparator,
  exportRowsToCsv,
  paginateRows,
  rowMatchesSearch,
  toggleSelection,
} from "../utils/tableHelpers";

const blankNoticeForm = {
  title: "",
  audience: "All",
  classSection: "General",
  publishDate: "",
  createdBy: "",
  content: "",
};

const detailTabs = [
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "logs", label: "Logs" },
];

const noticeSortOptions = [
  {
    value: "newest",
    label: "Newest",
    compare: (a, b) => new Date(b.publishDate || b.createdAt || 0) - new Date(a.publishDate || a.createdAt || 0),
  },
  {
    value: "name",
    label: "Name",
    compare: (a, b) => a.title.localeCompare(b.title),
  },
  {
    value: "amount",
    label: "Amount",
    compare: (a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0),
  },
];

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nextNoticeId(notices) {
  const highest = notices.reduce((max, notice) => {
    const parsed = Number.parseInt(String(notice.id).replace("NTC-", ""), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 4000);

  return `NTC-${highest + 1}`;
}

export default function NoticeBoardPage() {
  const [notices, setNotices] = useState(seedNotices);
  const [view, setView] = useState("table");
  const [formData, setFormData] = useState(blankNoticeForm);
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [selectedNoticeId, setSelectedNoticeId] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice.id === selectedNoticeId) || null,
    [notices, selectedNoticeId]
  );

  const filteredNotices = useMemo(() => {
    const comparator = buildComparator(sortValue, noticeSortOptions);
    return [...notices]
      .filter(
        (notice) =>
          rowMatchesSearch(
            notice,
            ["title", "audience", "classSection", "status", "createdBy"],
            searchTerm
          )
      )
      .filter((notice) => (statusFilter === "all" ? true : notice.status === statusFilter))
      .filter((notice) => (classFilter === "all" ? true : notice.classSection === classFilter))
      .filter((notice) => (dateFilter ? notice.publishDate === dateFilter : true))
      .sort(comparator);
  }, [notices, searchTerm, statusFilter, classFilter, dateFilter, sortValue]);

  const { pageRows: pagedNotices, totalPages, currentPage } = paginateRows(
    filteredNotices,
    page,
    pageSize
  );

  const allVisibleSelected =
    pagedNotices.length > 0 && pagedNotices.every((notice) => selectedIds.has(notice.id));

  const openCreate = () => {
    setFormData(blankNoticeForm);
    setEditingNoticeId("");
    setView("create");
  };

  const openEdit = (notice) => {
    setFormData({
      title: notice.title,
      audience: notice.audience,
      classSection: notice.classSection || "General",
      publishDate: notice.publishDate,
      createdBy: notice.createdBy,
      content: notice.content,
    });
    setEditingNoticeId(notice.id);
    setView("create");
  };

  const openView = (noticeId) => {
    setSelectedNoticeId(noticeId);
    setActiveTab("profile");
    setView("view");
  };

  const upsertNotice = (nextStatus) => {
    const normalizedPublishDate =
      nextStatus === "Published"
        ? new Date().toISOString().slice(0, 10)
        : nextStatus === "Scheduled"
          ? formData.publishDate || new Date().toISOString().slice(0, 10)
          : "";

    if (editingNoticeId) {
      setNotices((currentNotices) =>
        currentNotices.map((notice) =>
          notice.id === editingNoticeId
            ? {
                ...notice,
                ...formData,
                status: nextStatus,
                publishDate: normalizedPublishDate,
              }
            : notice
        )
      );
    } else {
      const newNotice = {
        id: nextNoticeId(notices),
        ...formData,
        status: nextStatus,
        publishDate: normalizedPublishDate,
      };

      setNotices((currentNotices) => [newNotice, ...currentNotices]);
    }

    setView("table");
  };

  const handlePublish = (noticeId) => {
    setNotices((currentNotices) =>
      currentNotices.map((notice) =>
        notice.id === noticeId
          ? {
              ...notice,
              status: "Published",
              publishDate: new Date().toISOString().slice(0, 10),
            }
          : notice
      )
    );
  };

  const handleUnpublish = (noticeId) => {
    setNotices((currentNotices) =>
      currentNotices.map((notice) =>
        notice.id === noticeId
          ? {
              ...notice,
              status: "Archived",
            }
          : notice
      )
    );
  };

  const handleBulkArchive = () => {
    if (!selectedIds.size) return;
    setNotices((currentNotices) =>
      currentNotices.map((notice) =>
        selectedIds.has(notice.id)
          ? {
              ...notice,
              status: "Archived",
            }
          : notice
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkPublish = () => {
    if (!selectedIds.size) return;
    setNotices((currentNotices) =>
      currentNotices.map((notice) =>
        selectedIds.has(notice.id)
          ? {
              ...notice,
              status: "Published",
              publishDate: new Date().toISOString().slice(0, 10),
            }
          : notice
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    if (!selectedIds.size) return;
    exportRowsToCsv(
      "notice-board-selected.csv",
      notices.filter((notice) => selectedIds.has(notice.id)),
      [
        { key: "id", label: "Notice ID" },
        { key: "title", label: "Title" },
        { key: "audience", label: "Audience" },
        { key: "classSection", label: "Class" },
        { key: "status", label: "Status" },
        { key: "publishDate", label: "Publish Date" },
        { key: "createdBy", label: "Created By" },
      ]
    );
  };

  return (
    <section className="sa-module">
      {view === "table" ? (
        <>
          <PageHeader
            title="Notice Board"
            subtitle="Create and manage announcements with standard table controls and bulk actions."
            actions={
              <button type="button" className="sa-btn sa-btn-primary" onClick={openCreate}>
                Create Notice
              </button>
            }
          />

          <TableToolbar
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            searchPlaceholder="Search title, audience, class, status, creator..."
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
                  { value: "Draft", label: "Draft" },
                  { value: "Published", label: "Published" },
                  { value: "Scheduled", label: "Scheduled" },
                  { value: "Archived", label: "Archived" },
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
                  ...[...new Set(notices.map((notice) => notice.classSection).filter(Boolean))].map(
                    (classSection) => ({
                      value: classSection,
                      label: classSection,
                    })
                  ),
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
                  ...[...new Set(notices.map((notice) => notice.publishDate).filter(Boolean))].map((date) => ({
                    value: date,
                    label: formatDate(date),
                  })),
                ],
              },
            ]}
            sortOptions={noticeSortOptions.map(({ value, label }) => ({ value, label }))}
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
              "Title",
              "Audience",
              "Class",
              "Status",
              "Publish Date",
              "Created By",
              "Actions",
            ]}
            minWidth={1180}
          >
            {pagedNotices.map((notice) => (
              <tr key={notice.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notice.id)}
                    onChange={() => setSelectedIds((current) => toggleSelection(current, notice.id))}
                  />
                </td>
                <td>{notice.title}</td>
                <td>{notice.audience}</td>
                <td>{notice.classSection || "-"}</td>
                <td>
                  <StatusBadge status={notice.status} />
                </td>
                <td>{formatDate(notice.publishDate)}</td>
                <td>{notice.createdBy}</td>
                <td>
                  <div className="sa-action-group">
                    <button type="button" className="sa-btn sa-btn-ghost" onClick={() => openView(notice.id)}>
                      View
                    </button>
                    <button type="button" className="sa-btn sa-btn-ghost" onClick={() => openEdit(notice)}>
                      Edit
                    </button>
                    {notice.status === "Published" ? (
                      <button
                        type="button"
                        className="sa-btn sa-btn-danger"
                        onClick={() => handleUnpublish(notice.id)}
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sa-btn sa-btn-secondary"
                        onClick={() => handlePublish(notice.id)}
                      >
                        Publish
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
                      pagedNotices.forEach((notice) => next.delete(notice.id));
                    } else {
                      pagedNotices.forEach((notice) => next.add(notice.id));
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
              totalItems={filteredNotices.length}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      {view === "view" && selectedNotice ? (
        <>
          <PageHeader
            title={`Notice: ${selectedNotice.title}`}
            subtitle={`${selectedNotice.id} • ${selectedNotice.audience}`}
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <div className="sa-panel">
            <DetailTabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "profile" ? (
              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Title</p>
                  <p className="sa-value">{selectedNotice.title}</p>
                </div>
                <div>
                  <p className="sa-label">Audience</p>
                  <p className="sa-value">{selectedNotice.audience}</p>
                </div>
                <div>
                  <p className="sa-label">Class</p>
                  <p className="sa-value">{selectedNotice.classSection || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Status</p>
                  <p className="sa-value">{selectedNotice.status}</p>
                </div>
                <div>
                  <p className="sa-label">Publish Date</p>
                  <p className="sa-value">{formatDate(selectedNotice.publishDate)}</p>
                </div>
                <div>
                  <p className="sa-label">Created By</p>
                  <p className="sa-value">{selectedNotice.createdBy}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <ul className="sa-list">
                <li>{formatDate(selectedNotice.publishDate)}: Status set to {selectedNotice.status}</li>
                <li>{formatDate(new Date())}: Viewed in notice board module.</li>
              </ul>
            ) : null}

            {activeTab === "logs" ? (
              <div className="sa-preview-card">
                <p>{selectedNotice.content}</p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {view === "create" ? (
        <>
          <PageHeader
            title={editingNoticeId ? "Edit Notice" : "Create Notice"}
            subtitle="Complete the notice details, then preview before publishing or scheduling."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <form
            className="sa-panel sa-form"
            onSubmit={(event) => {
              event.preventDefault();
              setView("preview");
            }}
          >
            <div className="sa-form-grid">
              <label className="sa-field">
                <span>Title</span>
                <input
                  required
                  value={formData.title}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, title: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Audience</span>
                <select
                  value={formData.audience}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, audience: event.target.value }))
                  }
                >
                  <option value="All">All</option>
                  <option value="Students">Students</option>
                  <option value="Class">Class</option>
                </select>
              </label>

              <label className="sa-field">
                <span>Class</span>
                <input
                  value={formData.classSection}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, classSection: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Publish Date (for scheduling)</span>
                <input
                  type="date"
                  value={formData.publishDate}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, publishDate: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Created By</span>
                <input
                  required
                  value={formData.createdBy}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, createdBy: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="sa-field">
              <span>Notice Content</span>
              <textarea
                required
                rows={5}
                value={formData.content}
                onChange={(event) =>
                  setFormData((currentData) => ({ ...currentData, content: event.target.value }))
                }
              />
            </label>

            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Cancel
              </button>
              <button type="submit" className="sa-btn sa-btn-primary">
                Preview
              </button>
            </div>
          </form>
        </>
      ) : null}

      {view === "preview" ? (
        <>
          <PageHeader
            title="Notice Preview"
            subtitle="Review and publish, schedule, or save as draft."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("create")}>
                Back to Edit
              </button>
            }
          />

          <div className="sa-panel sa-stack-gap">
            <div className="sa-preview-card">
              <h3>{formData.title}</h3>
              <p className="sa-muted-text">
                Audience: {formData.audience} • Created By: {formData.createdBy}
              </p>
              <p className="sa-muted-text">Class: {formData.classSection || "-"}</p>
              <p>{formData.content}</p>
              {formData.publishDate ? (
                <p className="sa-muted-text">Scheduled date: {formatDate(formData.publishDate)}</p>
              ) : null}
            </div>

            <div className="sa-action-group">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => upsertNotice("Draft")}>
                Save Draft
              </button>
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => upsertNotice("Scheduled")}>
                Publish/Schedule
              </button>
              <button type="button" className="sa-btn sa-btn-primary" onClick={() => upsertNotice("Published")}>
                Publish Now
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
