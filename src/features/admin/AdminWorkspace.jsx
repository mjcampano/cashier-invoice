import React from "react";
import AttendancePage from "./pages/AttendancePage";
import CalendarPage from "./pages/CalendarPage";
import DashboardPage from "./pages/DashboardPage";
import InboxPage from "./pages/InboxPage";
import NoticeBoardPage from "./pages/NoticeBoardPage";
import StudentsPage from "./pages/StudentsPage";
import TeachersPage from "./pages/TeachersPage";
import "./adminModules.css";

const moduleMap = {
  dashboard: DashboardPage,
  teachers: TeachersPage,
  students: StudentsPage,
  attendance: AttendancePage,
  notice: NoticeBoardPage,
  inbox: InboxPage,
  calendar: CalendarPage,
};

export default function AdminWorkspace({ activeMenu }) {
  const CurrentModule = moduleMap[activeMenu] || DashboardPage;

  return (
    <div className="sa-workspace">
      <CurrentModule />
    </div>
  );
}
