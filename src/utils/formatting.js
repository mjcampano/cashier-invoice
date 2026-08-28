/**
 * Safely convert currency-like values into numbers.
 * Handles strings such as "₱96,000.00", "96000", "1,234.50", and empty values.
 */
export const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;

  const normalized = String(value).trim();
  if (!normalized) return fallback;

  const cleaned = normalized.replace(/,/g, "").replace(/[^0-9.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return fallback;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Format number as Philippine Peso currency
 */
export const peso = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(toNumber(n));

/**
 * Generate unique identifier
 */
export const uid = () => Math.random().toString(16).slice(2);
