import React from "react";
import CalendarPage from "./pages/CalendarPage";
import DashboardPage from "./pages/DashboardPage";
import InboxPage from "./pages/InboxPage";
import NoticeBoardPage from "./pages/NoticeBoardPage";
import ReportsPage from "./pages/ReportsPage";
import RequirementsPage from "./pages/RequirementsPage";
import StudentsPage from "./pages/StudentsPage";
import "./adminModules.css";

const moduleMap = {
  dashboard: DashboardPage,
  students: StudentsPage,
  requirements: RequirementsPage,
  reports: ReportsPage,
  notice: NoticeBoardPage,
  inbox: InboxPage,
  calendar: CalendarPage,
};

export default function AdminWorkspace({ activeMenu, onNavigate }) {
  const CurrentModule = moduleMap[activeMenu] || DashboardPage;

  return (
    <div className="sa-workspace">
      <CurrentModule onNavigate={onNavigate} />
    </div>
  );
}
