import React, { useState } from "react";
import Sidebar from "../components/admin/Sidebar";
import "../styles/admin/layout.css";

export default function AdminLayout({
  children,
  setMode,
  activeMenu,
  setActiveMenu,
  contentClassName = "",
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`admin-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        setMode={setMode}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <main className="admin-content">
        <div className={`content-wrapper ${contentClassName}`.trim()}>{children}</div>
      </main>
    </div>
  );
}
