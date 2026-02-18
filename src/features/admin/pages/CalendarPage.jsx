import React, { useMemo, useState } from "react";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import TableToolbar from "../components/TableToolbar";
import { seedEvents } from "../data/seedData";
import {
  buildComparator,
  exportRowsToCsv,
  paginateRows,
  rowMatchesSearch,
  toggleSelection,
} from "../utils/tableHelpers";

const blankEventForm = {
  title: "",
  type: "Exam",
  start: "",
  end: "",
  location: "",
  classSection: "General",
  audience: "All",
  status: "Published",
};

const detailTabs = [
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "logs", label: "Logs" },
];

const eventSortOptions = [
  {
    value: "newest",
    label: "Newest",
    compare: (a, b) => new Date(b.start) - new Date(a.start),
  },
  {
    value: "name",
    label: "Name",
    compare: (a, b) => a.title.localeCompare(b.title),
  },
  {
    value: "amount",
    label: "Amount",
    compare: (a, b) => {
      const durationA = Math.max(0, new Date(a.end) - new Date(a.start));
      const durationB = Math.max(0, new Date(b.end) - new Date(b.start));
      return durationB - durationA;
    },
  },
];

function formatDateTime(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextEventId(events) {
  const highest = events.reduce((max, event) => {
    const parsed = Number.parseInt(String(event.id).replace("EVT-", ""), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 6000);

  return `EVT-${highest + 1}`;
}

export default function CalendarPage() {
  const [events, setEvents] = useState(seedEvents);
  const [view, setView] = useState("table");
  const [formMode, setFormMode] = useState("add");
  const [editingEventId, setEditingEventId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(seedEvents[0]?.id || "");
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState(blankEventForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const filteredEvents = useMemo(() => {
    const comparator = buildComparator(sortValue, eventSortOptions);
    return [...events]
      .filter(
        (event) =>
          rowMatchesSearch(
            event,
            ["id", "title", "type", "location", "audience", "classSection", "status"],
            searchTerm
          )
      )
      .filter((event) => (statusFilter === "all" ? true : event.status === statusFilter))
      .filter((event) => (classFilter === "all" ? true : event.classSection === classFilter))
      .filter((event) => (dateFilter ? String(event.start).slice(0, 10) === dateFilter : true))
      .sort(comparator);
  }, [events, searchTerm, statusFilter, classFilter, dateFilter, sortValue]);

  const { pageRows: pagedEvents, totalPages, currentPage } = paginateRows(filteredEvents, page, pageSize);

  const allVisibleSelected =
    pagedEvents.length > 0 && pagedEvents.every((event) => selectedIds.has(event.id));

  const openAdd = () => {
    setFormMode("add");
    setEditingEventId("");
    setFormData(blankEventForm);
    setView("form");
  };

  const openEdit = (event) => {
    setFormMode("edit");
    setEditingEventId(event.id);
    setFormData({
      title: event.title,
      type: event.type,
      start: event.start,
      end: event.end,
      location: event.location,
      classSection: event.classSection || "General",
      audience: event.audience,
      status: event.status || "Published",
    });
    setView("form");
  };

  const openView = (eventId) => {
    setSelectedEventId(eventId);
    setActiveTab("profile");
    setView("view");
  };

  const handleSaveEvent = (submitEvent) => {
    submitEvent.preventDefault();

    if (formMode === "edit") {
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === editingEventId
            ? {
                ...event,
                ...formData,
              }
            : event
        )
      );
    } else {
      const newEvent = {
        id: nextEventId(events),
        ...formData,
      };
      setEvents((currentEvents) => [newEvent, ...currentEvents]);
    }

    setView("table");
  };

  const handleArchive = (eventId) => {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: "Archived",
            }
          : event
      )
    );
  };

  const handlePublish = (eventId) => {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: "Published",
            }
          : event
      )
    );
  };

  const handleBulkArchive = () => {
    if (!selectedIds.size) return;
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        selectedIds.has(event.id)
          ? {
              ...event,
              status: "Archived",
            }
          : event
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkPublish = () => {
    if (!selectedIds.size) return;
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        selectedIds.has(event.id)
          ? {
              ...event,
              status: "Published",
            }
          : event
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    if (!selectedIds.size) return;
    exportRowsToCsv(
      "calendar-events-selected.csv",
      events.filter((event) => selectedIds.has(event.id)),
      [
        { key: "id", label: "Event ID" },
        { key: "title", label: "Event Title" },
        { key: "type", label: "Type" },
        { key: "classSection", label: "Class" },
        { key: "status", label: "Status" },
        { key: "start", label: "Start" },
        { key: "end", label: "End" },
        { key: "location", label: "Location" },
        { key: "audience", label: "Audience" },
      ]
    );
  };

  return (
    <section className="sa-module">
      {view === "table" ? (
        <>
          <PageHeader
            title="Calendar"
            subtitle="Track events with standard search, filters, sorting, pagination, and bulk actions."
            actions={
              <button type="button" className="sa-btn sa-btn-primary" onClick={openAdd}>
                Add Event
              </button>
            }
          />

          <TableToolbar
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            searchPlaceholder="Search event, status, class, date, audience..."
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
                  ...[...new Set(events.map((event) => event.classSection).filter(Boolean))].map(
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
                  ...[...new Set(events.map((event) => String(event.start).slice(0, 10)).filter(Boolean))].map(
                    (date) => ({
                      value: date,
                      label: date,
                    })
                  ),
                ],
              },
            ]}
            sortOptions={eventSortOptions.map(({ value, label }) => ({ value, label }))}
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
              "Event Title",
              "Type",
              "Class",
              "Status",
              "Start-End",
              "Location",
              "Audience",
              "Actions",
            ]}
            minWidth={1220}
          >
            {pagedEvents.map((event) => (
              <tr key={event.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(event.id)}
                    onChange={() => setSelectedIds((current) => toggleSelection(current, event.id))}
                  />
                </td>
                <td>{event.title}</td>
                <td>{event.type}</td>
                <td>{event.classSection || "-"}</td>
                <td>
                  <StatusBadge status={event.status} />
                </td>
                <td>
                  <div className="sa-cell-stack">
                    <span>{formatDateTime(event.start)}</span>
                    <span className="sa-muted-inline">to {formatDateTime(event.end)}</span>
                  </div>
                </td>
                <td>{event.location}</td>
                <td>{event.audience}</td>
                <td>
                  <div className="sa-action-group">
                    <button type="button" className="sa-btn sa-btn-ghost" onClick={() => openView(event.id)}>
                      View
                    </button>
                    <button type="button" className="sa-btn sa-btn-ghost" onClick={() => openEdit(event)}>
                      Edit
                    </button>
                    {event.status === "Archived" ? (
                      <button
                        type="button"
                        className="sa-btn sa-btn-secondary"
                        onClick={() => handlePublish(event.id)}
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sa-btn sa-btn-danger"
                        onClick={() => handleArchive(event.id)}
                      >
                        Archive
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
                      pagedEvents.forEach((event) => next.delete(event.id));
                    } else {
                      pagedEvents.forEach((event) => next.add(event.id));
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
              totalItems={filteredEvents.length}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      {view === "view" && selectedEvent ? (
        <>
          <PageHeader
            title={`Event: ${selectedEvent.title}`}
            subtitle={`${selectedEvent.type} • ${selectedEvent.audience}`}
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
                  <p className="sa-label">Type</p>
                  <p className="sa-value">{selectedEvent.type}</p>
                </div>
                <div>
                  <p className="sa-label">Audience</p>
                  <p className="sa-value">{selectedEvent.audience}</p>
                </div>
                <div>
                  <p className="sa-label">Class</p>
                  <p className="sa-value">{selectedEvent.classSection || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Status</p>
                  <p className="sa-value">{selectedEvent.status}</p>
                </div>
                <div>
                  <p className="sa-label">Start</p>
                  <p className="sa-value">{formatDateTime(selectedEvent.start)}</p>
                </div>
                <div>
                  <p className="sa-label">End</p>
                  <p className="sa-value">{formatDateTime(selectedEvent.end)}</p>
                </div>
                <div>
                  <p className="sa-label">Location</p>
                  <p className="sa-value">{selectedEvent.location}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <ul className="sa-list">
                <li>Event scheduled from {formatDateTime(selectedEvent.start)}</li>
                <li>Event ends at {formatDateTime(selectedEvent.end)}</li>
              </ul>
            ) : null}

            {activeTab === "logs" ? (
              <ul className="sa-list">
                <li>{formatDateTime(selectedEvent.start)}: Event draft created.</li>
                <li>{new Date().toLocaleString()}: Last reviewed in calendar module.</li>
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {view === "form" ? (
        <>
          <PageHeader
            title={formMode === "add" ? "Create Calendar Event" : "Edit Calendar Event"}
            subtitle="Save to return to event records table."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <form className="sa-panel sa-form" onSubmit={handleSaveEvent}>
            <div className="sa-form-grid">
              <label className="sa-field">
                <span>Event Title</span>
                <input
                  required
                  value={formData.title}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, title: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Type</span>
                <select
                  value={formData.type}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, type: event.target.value }))
                  }
                >
                  <option value="Exam">Exam</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </label>

              <label className="sa-field">
                <span>Start</span>
                <input
                  required
                  type="datetime-local"
                  value={formData.start}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, start: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>End</span>
                <input
                  required
                  type="datetime-local"
                  value={formData.end}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, end: event.target.value }))
                  }
                />
              </label>

              <label className="sa-field">
                <span>Location</span>
                <input
                  required
                  value={formData.location}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, location: event.target.value }))
                  }
                />
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
                <span>Audience</span>
                <select
                  value={formData.audience}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, audience: event.target.value }))
                  }
                >
                  <option value="All">All</option>
                  <option value="Teachers">Teachers</option>
                  <option value="Students">Students</option>
                  <option value="Class">Class</option>
                </select>
              </label>

              <label className="sa-field">
                <span>Status</span>
                <select
                  value={formData.status}
                  onChange={(event) =>
                    setFormData((currentData) => ({ ...currentData, status: event.target.value }))
                  }
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Cancel
              </button>
              <button type="submit" className="sa-btn sa-btn-primary">
                Save Event
              </button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
