import React from "react";

export default function TablePagination({ page, totalPages, totalItems, onPageChange }) {
  return (
    <div className="sa-pagination">
      <span className="sa-muted-text">
        Page {page} of {totalPages} - {totalItems} item(s)
      </span>
      <div className="sa-action-group">
        <button
          type="button"
          className="sa-btn sa-btn-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="sa-btn sa-btn-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
