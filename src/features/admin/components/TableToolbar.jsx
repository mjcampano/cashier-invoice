import React from "react";

export default function TableToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  sortOptions = [],
  sortValue = "",
  onSortChange,
  pageSizeOptions = [5, 10, 20],
  pageSize = 10,
  onPageSizeChange,
  selectedCount = 0,
  bulkActions = [],
}) {
  return (
    <div className="sa-toolbar">
      <div className="sa-toolbar-main">
        <label className="sa-toolbar-search">
          <span className="sa-toolbar-label">Search</span>
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>

        {filters.map((filter) => (
          <label key={filter.key} className="sa-toolbar-filter">
            <span className="sa-toolbar-label">{filter.label}</span>
            <select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {sortOptions.length ? (
          <label className="sa-toolbar-filter">
            <span className="sa-toolbar-label">Sort</span>
            <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="sa-toolbar-filter">
          <span className="sa-toolbar-label">Rows</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sa-toolbar-bulk">
        <span className="sa-muted-text">Selected: {selectedCount}</span>
        {bulkActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`sa-btn ${action.tone || "sa-btn-secondary"}`}
            disabled={selectedCount === 0}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
