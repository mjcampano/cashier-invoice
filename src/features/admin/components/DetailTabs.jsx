import React from "react";

export default function DetailTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="sa-tabs" role="tablist" aria-label="Detail tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`sa-tab ${activeTab === tab.id ? "is-active" : ""}`}
          onClick={() => onChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
