export const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

export const rowMatchesSearch = (row, fields, searchTerm) => {
  const term = normalizeText(searchTerm);
  if (!term) return true;

  return fields.some((field) => {
    const value = typeof field === "function" ? field(row) : row[field];
    return normalizeText(value).includes(term);
  });
};

export const buildComparator = (sortValue, strategies) => {
  const selected = strategies.find((strategy) => strategy.value === sortValue);
  return selected?.compare || (() => 0);
};

export const paginateRows = (rows, page, pageSize) => {
  const safeSize = Math.max(1, Number(pageSize) || 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / safeSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    pageRows: rows.slice(start, start + safeSize),
    totalPages,
    currentPage: safePage,
  };
};

export const getPathValue = (row, path) =>
  path.split(".").reduce((current, segment) => current?.[segment], row);

export const exportRowsToCsv = (filename, rows, columns) => {
  const headers = columns.map((column) => column.label).join(",");
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const rawValue =
          typeof column.getValue === "function"
            ? column.getValue(row)
            : getPathValue(row, column.key);
        const escaped = String(rawValue ?? "").replaceAll('"', '""');
        return `"${escaped}"`;
      })
      .join(",")
  );

  const csv = [headers, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const toggleSelection = (selectedSet, id) => {
  const next = new Set(selectedSet);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};
