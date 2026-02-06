import React from "react";
import "../../styles/admin/sidebar.css";

export default function Sidebar({ activeMenu, setActiveMenu, setMode }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "inbox", label: "Inbox", icon: "📥" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "teachers", label: "Teachers", icon: "👨‍🏫" },
    { id: "students", label: "Students", icon: "👨‍🎓" },
    { id: "attendance", label: "Attendance", icon: "✓" },
    { id: "finance", label: "Finance", icon: "💰" },
    { id: "notice", label: "Notice Board", icon: "📋" },
  ];

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    // Switch to invoice mode when Finance is clicked
    if (menuId === "finance" && setMode) {
      setMode("invoice");
    }

    // Student page
    if (menuId === "students" && setMode) {
      setMode("students");
    }

    // Dashboard
    if (menuId === "dashboard" && setMode) {
      setMode("dashboard");
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">Schola</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${activeMenu === item.id ? "active" : ""}`}
            onClick={() => handleMenuClick(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn">🚪 Logout</button>
      </div>
    </div>
  );
}
