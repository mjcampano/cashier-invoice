import React from "react";
import { seedEvents, seedMessages, seedNotices, seedStudents, seedTeachers } from "../data/seedData";

const cards = [
  {
    id: "teachers",
    label: "Teachers",
    value: seedTeachers.filter((teacher) => teacher.status === "Active").length,
    suffix: "active",
  },
  {
    id: "students",
    label: "Students",
    value: seedStudents.filter((student) => student.status === "Active").length,
    suffix: "active",
  },
  {
    id: "notices",
    label: "Published Notices",
    value: seedNotices.filter((notice) => notice.status === "Published").length,
    suffix: "live",
  },
  {
    id: "inbox",
    label: "Open Inbox",
    value: seedMessages.filter((message) => message.status === "Open").length,
    suffix: "tickets",
  },
  {
    id: "calendar",
    label: "Upcoming Events",
    value: seedEvents.length,
    suffix: "scheduled",
  },
];

const quickModules = [
  "Teachers",
  "Students",
  "Attendance",
  "Notice Board",
  "Inbox",
  "Calendar",
];

export default function DashboardPage() {
  return (
    <section className="sa-module">
      <header className="sa-page-header">
        <div>
          <h1 className="sa-page-title">School Administration</h1>
          <p className="sa-page-subtitle">
            Centralized view for faculty, students, attendance, notices, messages, and calendar.
          </p>
        </div>
      </header>

      <div className="sa-stats-grid">
        {cards.map((card) => (
          <article key={card.id} className="sa-stat-card">
            <p className="sa-stat-label">{card.label}</p>
            <h2 className="sa-stat-value">{card.value}</h2>
            <p className="sa-stat-subtitle">{card.suffix}</p>
          </article>
        ))}
      </div>

      <div className="sa-panel">
        <h3 className="sa-panel-title">Available Modules</h3>
        <p className="sa-muted-text">
          Use the left sidebar to open each module. Every section now has structured tables and action flows.
        </p>
        <div className="sa-chip-list">
          {quickModules.map((moduleName) => (
            <span key={moduleName} className="sa-chip">
              {moduleName}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
