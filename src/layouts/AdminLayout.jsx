import React from "react";
import Sidebar from "../components/admin/Sidebar";
import "../styles/admin/layout.css";

export default function AdminLayout({ children, setMode, activeMenu, setActiveMenu }) {
  return (
    <div className="admin-layout">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} setMode={setMode} />
      <main className="admin-content">
        <div className="content-wrapper">{children}</div>
      </main>
    </div>
  );
}
