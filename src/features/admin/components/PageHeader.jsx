import React from "react";

export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <header className="sa-page-header">
      <div>
        <h1 className="sa-page-title">{title}</h1>
        {subtitle ? <p className="sa-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="sa-page-actions">{actions}</div> : null}
    </header>
  );
}
