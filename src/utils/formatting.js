/**
 * Format number as Philippine Peso currency
 */
export const peso = (n) =>
  new Intl.NumberFormat("en-PH", { 
    style: "currency", 
    currency: "PHP" 
  }).format(Number(n || 0));

/**
 * Generate unique identifier
 */
export const uid = () => Math.random().toString(16).slice(2);
