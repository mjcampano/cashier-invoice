import React, { useMemo, useState } from "react";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import TableToolbar from "../components/TableToolbar";
import { seedMessages } from "../data/seedData";
import {
  buildComparator,
  exportRowsToCsv,
  paginateRows,
  rowMatchesSearch,
  toggleSelection,
} from "../utils/tableHelpers";

const detailTabs = [
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "logs", label: "Logs" },
];

const messageSortOptions = [
  {
    value: "newest",
    label: "Newest",
    compare: (a, b) => new Date(b.createdDate || b.created) - new Date(a.createdDate || a.created),
  },
  {
    value: "name",
    label: "Name",
    compare: (a, b) => a.sender.localeCompare(b.sender),
  },
  {
    value: "amount",
    label: "Amount",
    compare: (a, b) => {
      const score = { High: 3, Medium: 2, Low: 1 };
      return (score[b.priority] || 0) - (score[a.priority] || 0);
    },
  },
];

export default function InboxPage() {
  const [messages, setMessages] = useState(seedMessages);
  const [selectedMessageId, setSelectedMessageId] = useState(seedMessages[0]?.id || "");
  const [view, setView] = useState("table");
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) || null,
    [messages, selectedMessageId]
  );

  const filteredMessages = useMemo(() => {
    const comparator = buildComparator(sortValue, messageSortOptions);
    return [...messages]
      .filter((message) =>
        rowMatchesSearch(
          message,
          [
            "id",
            "sender",
            "classSection",
            "category",
            "priority",
            "status",
            "subject",
            "message",
          ],
          searchTerm
        )
      )
      .filter((message) => (statusFilter === "all" ? true : message.status === statusFilter))
      .filter((message) => (classFilter === "all" ? true : message.classSection === classFilter))
      .filter((message) =>
        dateFilter ? (message.createdDate || String(message.created || "").slice(0, 10)) === dateFilter : true
      )
      .sort(comparator);
  }, [messages, searchTerm, statusFilter, classFilter, dateFilter, sortValue]);

  const { pageRows: pagedMessages, totalPages, currentPage } = paginateRows(
    filteredMessages,
    page,
    pageSize
  );

  const allVisibleSelected =
    pagedMessages.length > 0 && pagedMessages.every((message) => selectedIds.has(message.id));

  const handleOpen = (messageId) => {
    setSelectedMessageId(messageId);
    setReplyText("");
    setActiveTab("profile");
    setView("open");
  };

  const handleReply = () => {
    if (!selectedMessageId || !replyText.trim()) return;

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === selectedMessageId
          ? {
              ...message,
              status: message.status === "Closed" ? "In Progress" : message.status,
              message: `${message.message}\n\nAdmin Reply: ${replyText.trim()}`,
            }
          : message
      )
    );

    setReplyText("");
  };

  const handleClose = (messageId) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              status: "Closed",
            }
          : message
      )
    );
  };

  const handlePublish = (messageId) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              status: "Open",
            }
          : message
      )
    );
  };

  const handleBulkArchive = () => {
    if (!selectedIds.size) return;
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        selectedIds.has(message.id) ? { ...message, status: "Closed" } : message
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkPublish = () => {
    if (!selectedIds.size) return;
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        selectedIds.has(message.id) ? { ...message, status: "Open" } : message
      )
    );
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    if (!selectedIds.size) return;
    exportRowsToCsv(
      "inbox-selected.csv",
      messages.filter((message) => selectedIds.has(message.id)),
      [
        { key: "id", label: "Ticket ID" },
        { key: "sender", label: "Sender" },
        { key: "classSection", label: "Class" },
        { key: "category", label: "Category" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
        { key: "created", label: "Created" },
        { key: "subject", label: "Subject" },
      ]
    );
  };

  return (
    <section className="sa-module">
      {view === "table" ? (
        <>
          <PageHeader
            title="Inbox"
            subtitle="Messages, support tickets, and requests with standard table controls and bulk actions."
          />

          <TableToolbar
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            searchPlaceholder="Search ticket, sender, class, subject, message..."
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
                  { value: "Open", label: "Open" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Closed", label: "Closed" },
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
                  ...[...new Set(messages.map((message) => message.classSection).filter(Boolean))].map(
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
                  ...[
                    ...new Set(
                      messages
                        .map((message) => message.createdDate || String(message.created || "").slice(0, 10))
                        .filter(Boolean)
                    ),
                  ].map((date) => ({
                    value: date,
                    label: date,
                  })),
                ],
              },
            ]}
            sortOptions={messageSortOptions.map(({ value, label }) => ({ value, label }))}
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
              "Ticket/Msg ID",
              "Sender",
              "Class",
              "Category",
              "Priority",
              "Status",
              "Created",
              "Actions",
            ]}
            minWidth={1240}
          >
            {pagedMessages.map((message) => (
              <tr key={message.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(message.id)}
                    onChange={() => setSelectedIds((current) => toggleSelection(current, message.id))}
                  />
                </td>
                <td>{message.id}</td>
                <td>{message.sender}</td>
                <td>{message.classSection || "-"}</td>
                <td>{message.category}</td>
                <td>{message.priority}</td>
                <td>
                  <StatusBadge status={message.status} />
                </td>
                <td>{message.created}</td>
                <td>
                  <div className="sa-action-group">
                    <button type="button" className="sa-btn sa-btn-ghost" onClick={() => handleOpen(message.id)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn-secondary"
                      onClick={() => handleOpen(message.id)}
                    >
                      Reply
                    </button>
                    {message.status === "Closed" ? (
                      <button
                        type="button"
                        className="sa-btn sa-btn-secondary"
                        onClick={() => handlePublish(message.id)}
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sa-btn sa-btn-danger"
                        onClick={() => handleClose(message.id)}
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
                      pagedMessages.forEach((message) => next.delete(message.id));
                    } else {
                      pagedMessages.forEach((message) => next.add(message.id));
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
              totalItems={filteredMessages.length}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      {view === "open" && selectedMessage ? (
        <>
          <PageHeader
            title={`Ticket ${selectedMessage.id}`}
            subtitle={`${selectedMessage.category} • ${selectedMessage.sender}`}
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Table
              </button>
            }
          />

          <div className="sa-panel sa-stack-gap">
            <DetailTabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "profile" ? (
              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Subject</p>
                  <p className="sa-value">{selectedMessage.subject}</p>
                </div>
                <div>
                  <p className="sa-label">Priority</p>
                  <p className="sa-value">{selectedMessage.priority}</p>
                </div>
                <div>
                  <p className="sa-label">Class</p>
                  <p className="sa-value">{selectedMessage.classSection || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Status</p>
                  <p className="sa-value">
                    <StatusBadge status={selectedMessage.status} />
                  </p>
                </div>
                <div>
                  <p className="sa-label">Created</p>
                  <p className="sa-value">{selectedMessage.created}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <ul className="sa-list">
                <li>{selectedMessage.created}: Ticket opened</li>
                <li>{new Date().toLocaleString()}: Last viewed in admin inbox</li>
              </ul>
            ) : null}

            {activeTab === "logs" ? (
              <div className="sa-preview-card">
                <h3 className="sa-panel-title">Message Thread</h3>
                <p>{selectedMessage.message}</p>
              </div>
            ) : null}

            <label className="sa-field">
              <span>Reply</span>
              <textarea
                rows={4}
                placeholder="Type your response..."
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
              />
            </label>

            <div className="sa-action-group">
              <button type="button" className="sa-btn sa-btn-primary" onClick={handleReply}>
                Send Reply
              </button>
              <button
                type="button"
                className="sa-btn sa-btn-danger"
                onClick={() => handleClose(selectedMessage.id)}
              >
                Close Ticket
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
