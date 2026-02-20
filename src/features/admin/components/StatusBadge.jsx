import React from "react";

const toneByStatus = {
  Active: "success",
  Complete: "success",
  Verified: "success",
  Published: "success",
  Paid: "success",
  Present: "success",
  Open: "warning",
  Missing: "danger",
  Submitted: "info",
  Rejected: "danger",
  Pending: "warning",
  Scheduled: "warning",
  "In Progress": "info",
  Late: "warning",
  Excused: "info",
  Transferred: "info",
  Graduated: "muted",
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
