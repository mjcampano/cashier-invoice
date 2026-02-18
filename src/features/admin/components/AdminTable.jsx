import React from "react";

export default function AdminTable({ columns, children, minWidth = 960, emptyMessage = "No records found." }) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <div className="sa-table-wrap">
      <table className="sa-table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            children
          ) : (
            <tr>
              <td className="sa-table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
