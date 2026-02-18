import React from "react";

const toneByStatus = {
  Active: "success",
  Published: "success",
  Paid: "success",
  Present: "success",
  Open: "warning",
  Pending: "warning",
  Scheduled: "warning",
  "In Progress": "info",
  Late: "warning",
  Excused: "info",
  Draft: "muted",
  Inactive: "muted",
  Archived: "muted",
  Absent: "danger",
  Closed: "muted",
};

export default function StatusBadge({ status }) {
  const tone = toneByStatus[status] || "default";

  return <span className={`sa-status sa-status--${tone}`}>{status}</span>;
}
