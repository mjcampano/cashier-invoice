import React from "react";

export default function Tabs({ tab, setTab }) {
  return (
    <div className="tabs">
      <button
        className={`tabBtn ${tab === "form" ? "active" : ""}`}
        onClick={() => setTab("form")}
        type="button"
      >
        Data Entry
      </button>

      <button
        className={`tabBtn ${tab === "preview" ? "active" : ""}`}
        onClick={() => setTab("preview")}
        type="button"
      >
        Invoice Preview
      </button>

      {/* ✅ NEW: Proof of Payment Tab */}
      <button
        className={`tabBtn ${tab === "proof" ? "active" : ""}`}
        onClick={() => setTab("proof")}
        type="button"
      >
        Proof of Payment
      </button>
    </div>
  );
}
