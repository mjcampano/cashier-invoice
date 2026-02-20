import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { seedAuditLogs, seedStudents } from "../data/seedData";
import { getStatus } from "../../../api/adminRecords";

const MAX_LIST_ITEMS = 5;
const RECENT_UPDATE_DAYS = 14;

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeName = (student) => student.fullName || student.name || "Unknown Student";

const missingCountForStudent = (student) =>
  (student.requirements || []).filter((requirement) => requirement.status !== "Verified").length;

const recentlyUpdated = (student) => {
  const updatedAt = new Date(student.updatedAt || student.createdAt || 0);
  const ageMs = Date.now() - updatedAt.getTime();
  return ageMs <= RECENT_UPDATE_DAYS * 24 * 60 * 60 * 1000;
};

const SYSTEM_COUNT_CONFIG = [
  { key: "students", label: "Students" },
  { key: "notices", label: "Notices" },
  { key: "invoices", label: "Invoices" },
  { key: "users", label: "Users" },
];

const FALLBACK_COUNTS = {
  students: seedStudents.length,
};

const formatSystemCount = (value) =>
  value === undefined || value === null ? "-" : value;

const dbStateTone = (state) => {
  if (!state) return "muted";
  switch (state) {
    case "connected":
      return "success";
    case "connecting":
      return "info";
    case "disconnecting":
      return "warning";
    case "disconnected":
      return "danger";
    default:
      return "warning";
  }
};

export default function DashboardPage({ onNavigate }) {
  const stats = useMemo(() => {
    const activeStudents = seedStudents.filter((student) => student.status === "Active").length;
    const now = new Date();
    const newThisMonth = seedStudents.filter((student) => {
      const createdAt = new Date(student.createdAt || 0);
      return (
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth()
      );
    }).length;

    const missingRequirements = seedStudents.filter(
      (student) => missingCountForStudent(student) > 0
    ).length;

    const recentlyUpdatedCount = seedStudents.filter((student) => recentlyUpdated(student)).length;

    return {
      activeStudents,
      newThisMonth,
      missingRequirements,
      recentlyUpdatedCount,
    };
  }, []);

  const quickLists = useMemo(() => {
    const missingRequirements = [...seedStudents]
      .map((student) => ({ student, missingCount: missingCountForStudent(student) }))
      .filter((item) => item.missingCount > 0)
      .sort((a, b) => b.missingCount - a.missingCount)
      .slice(0, MAX_LIST_ITEMS);

    const recentlyAdded = [...seedStudents]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, MAX_LIST_ITEMS);

    const recentlyUpdatedProfiles = [...seedStudents]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, MAX_LIST_ITEMS);

    return {
      missingRequirements,
      recentlyAdded,
      recentlyUpdatedProfiles,
    };
  }, []);

  const latestActivity = useMemo(
    () => [...seedAuditLogs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10),
    []
  );

  const goTo = (menuId) => {
    if (typeof onNavigate === "function") {
      onNavigate(menuId);
    }
  };

  const [systemStatus, setSystemStatus] = useState(null);
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemError, setSystemError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const fetchStatus = async () => {
      setSystemError("");
      setSystemLoading(true);

      try {
        const data = await getStatus();
        if (isCancelled) return;
        setSystemStatus(data);
      } catch (error) {
        if (isCancelled) return;
        setSystemError(error.message || "Unable to reach API.");
        setSystemStatus(null);
      } finally {
        if (isCancelled) return;
        setSystemLoading(false);
      }
    };

    fetchStatus();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dbState = systemStatus?.db?.state || "unknown";
  const dbName = systemStatus?.db?.name || "unknown";
  const statusTone = systemLoading
    ? "info"
    : systemError
      ? "danger"
      : systemStatus?.ok
        ? "success"
        : "warning";
  const statusLabel = systemLoading
    ? "Checking connection..."
    : systemError
      ? "Offline"
      : systemStatus?.ok
        ? "Connected"
        : "Issues detected";
  const systemCounts = SYSTEM_COUNT_CONFIG.map(({ key, label }) => {
    const liveValue =
      systemStatus?.counts && Object.prototype.hasOwnProperty.call(systemStatus.counts, key)
        ? systemStatus.counts[key]
        : undefined;
    const hasLive = liveValue !== undefined && liveValue !== null;
    const fallback = FALLBACK_COUNTS[key] ?? null;
    const value = hasLive ? liveValue : fallback;
    return { key, label, value, isLive: hasLive };
  });

  return (
    <section className="sa-module">
      <PageHeader
        title="Dashboard"
        subtitle="Monitor student status, requirements, updates, and admin activity from one place."
      />

      <div className="sa-stats-grid sa-stats-grid--four">
        <article className="sa-stat-card">
          <p className="sa-stat-label">Students (Active)</p>
          <h2 className="sa-stat-value">{stats.activeStudents}</h2>
          <p className="sa-stat-subtitle">currently active</p>
        </article>
        <article className="sa-stat-card">
          <p className="sa-stat-label">New This Month</p>
          <h2 className="sa-stat-value">{stats.newThisMonth}</h2>
          <p className="sa-stat-subtitle">new student records</p>
        </article>
        <article className="sa-stat-card">
          <p className="sa-stat-label">Missing Requirements</p>
          <h2 className="sa-stat-value">{stats.missingRequirements}</h2>
          <p className="sa-stat-subtitle">students with gaps</p>
        </article>
        <article className="sa-stat-card">
          <p className="sa-stat-label">Recently Updated</p>
          <h2 className="sa-stat-value">{stats.recentlyUpdatedCount}</h2>
          <p className="sa-stat-subtitle">updated in last 14 days</p>
        </article>
      </div>

      <div className="sa-panel sa-stack-gap">
        <div className="sa-panel-row">
          <h3 className="sa-panel-title">System Health</h3>
          <span className={`sa-status sa-status--${statusTone}`}>{statusLabel}</span>
        </div>
        <div className="sa-detail-grid">
          <div>
            <p className="sa-label">Database</p>
            <p className="sa-value">{dbName}</p>
          </div>
          <div>
            <p className="sa-label">DB State</p>
            <p className="sa-value">{dbState}</p>
          </div>
          <div>
            <p className="sa-label">Last checked</p>
            <p className="sa-value">
              {systemStatus?.timestamp ? formatDateTime(systemStatus.timestamp) : "-"}
            </p>
          </div>
        </div>
        {systemError ? (
          <p className="sa-muted-text">API unreachable: {systemError}</p>
        ) : null}
        <div className="sa-stats-grid sa-stats-grid--four">
          {systemCounts.map((item) => (
            <article key={item.key} className="sa-stat-card">
              <p className="sa-stat-label">{item.label}</p>
              <h2 className="sa-stat-value">{formatSystemCount(item.value)}</h2>
              <p className="sa-stat-subtitle">
                {item.isLive ? "Live" : item.value ? "Seed data" : "Awaiting API"}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="sa-dashboard-grid">
        <div className="sa-panel sa-stack-gap">
          <div className="sa-panel-row">
            <h3 className="sa-panel-title">Missing Requirements (Top 5)</h3>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("requirements")}>
              View all
            </button>
          </div>
          <ul className="sa-list sa-list--tight">
            {quickLists.missingRequirements.map(({ student, missingCount }) => (
              <li key={student.studentCode || student.id}>
                <strong>{normalizeName(student)}</strong> - Missing {missingCount}
              </li>
            ))}
          </ul>

          <div className="sa-panel-row">
            <h3 className="sa-panel-title">Recently Added Students</h3>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("students")}>
              View all
            </button>
          </div>
          <ul className="sa-list sa-list--tight">
            {quickLists.recentlyAdded.map((student) => (
              <li key={student.studentCode || student.id}>
                <strong>{normalizeName(student)}</strong> - {student.currentEnrollment?.gradeLevel} {student.currentEnrollment?.section}
              </li>
            ))}
          </ul>

          <div className="sa-panel-row">
            <h3 className="sa-panel-title">Recently Updated Profiles</h3>
            <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("students")}>
              View all
            </button>
          </div>
          <ul className="sa-list sa-list--tight">
            {quickLists.recentlyUpdatedProfiles.map((student) => (
              <li key={student.studentCode || student.id}>
                <strong>{normalizeName(student)}</strong> - {formatDateTime(student.updatedAt || student.createdAt)}
              </li>
            ))}
          </ul>
        </div>

        <div className="sa-panel sa-stack-gap">
          <h3 className="sa-panel-title">Quick Actions</h3>
          <button type="button" className="sa-btn sa-btn-primary" onClick={() => goTo("students")}>
            Add Student
          </button>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("students")}>
            Import Students (CSV)
          </button>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("reports")}>
            Export Masterlist
          </button>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("requirements")}>
            Requirements Report
          </button>
        </div>
      </div>

      <div className="sa-panel">
        <div className="sa-panel-row">
          <h3 className="sa-panel-title">System Activity (Latest 10)</h3>
          <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("reports")}>
            View reports
          </button>
        </div>
        <ul className="sa-list sa-list--tight">
          {latestActivity.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.action.toUpperCase()}</strong> - {entry.details} ({formatDateTime(entry.createdAt)})
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
