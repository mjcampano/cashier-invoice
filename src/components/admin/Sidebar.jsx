import React from "react";
import "../../styles/admin/sidebar.css";

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  setMode,
  isCollapsed = false,
  onToggle,
}) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "DB" },
    { id: "inbox", label: "Inbox", icon: "IN" },
    { id: "calendar", label: "Calendar", icon: "CL" },
    { id: "students", label: "Students", icon: "ST" },
    { id: "requirements", label: "Requirements", icon: "RQ" },
    { id: "reports", label: "Reports", icon: "RP" },
    { id: "finance", label: "Finance", icon: "FN" },
    { id: "notice", label: "Notice Board", icon: "NT" },
  ];

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    // Keep sidebar and workspace in sync
    if (setMode) {
      setMode(menuId === "finance" ? "invoice" : "admin");
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">SC</span>
          <span className="logo-text">Schola</span>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="sidebar-toggle-icon">{isCollapsed ? ">" : "<"}</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${activeMenu === item.id ? "active" : ""}`}
            onClick={() => handleMenuClick(item.id)}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" type="button" title={isCollapsed ? "Logout" : undefined}>
          <span className="logout-icon">LG</span>
          <span className="logout-label">Logout</span>
        </button>
      </div>
    </div>
  );
}
