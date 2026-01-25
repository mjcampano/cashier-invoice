import { uid } from "./formatting";
import { createWorker } from "tesseract.js";

/**
 * Generate proof of payment reference number
 */
export const makeRefNo = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const short = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `POP-${y}${m}${day}-${short}`;
};

/**
 * Guess payment amount from filename (e.g., gcash_1250.jpg, paid-999.50.png)
 */
export const guessAmountFromFilename = (name) => {
  const cleaned = String(name || "").replaceAll(",", "");
  const match = cleaned.match(/(\d+(\.\d{1,2})?)/);
  return match ? match[1] : "";
};

/**
 * Guess payment method from filename heuristics
 */
export const guessMethodFromFilename = (name) => {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("maya")) return "Maya";
  if (lower.includes("bdo") || lower.includes("bpi") || lower.includes("union")) 
    return "Bank Transfer";
  if (lower.includes("cash")) return "Cash";
  return "GCash";
};

/**
 * Extract date from filename (e.g., 2026-01-25 or 20260125)
 */
export const guessDateFromFilename = (name) => {
  const cleaned = String(name || "");
  const iso = cleaned.match(/(20\d{2})[-_ ]?(\d{2})[-_ ]?(\d{2})/);
  if (iso) {
    const [_, y, m, d] = iso;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
};

/**
 * Preprocess image for better OCR: scale, grayscale, contrast, threshold
 */
export const preprocessImage = async (file) => {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1800;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  
  // Grayscale + stronger contrast + simple threshold
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const contrasted = Math.min(255, Math.max(0, (gray - 128) * 1.3 + 128));
    const bin = contrasted > 150 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = bin;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

/**
 * Parse OCR text for reference number, amount, and date
 */
export const parseOcrText = (text) => {
  const clean = text.replace(/\s+/g, " ").trim();

  // Reference: prefer number after "Reference Number"
  const refLine = clean.match(/reference\s*(?:number|no\.)?[:\-]?\s*([A-Z0-9-]{4,})/i);
  const refAny = clean.match(/([A-Z0-9-]{10,})/);
  const reference = refLine ? refLine[1] : refAny ? refAny[1] : "";

  // Amount: collect all currency-like numbers, choose largest
  const amounts = [];
  const currencyRegex = /(?:php|₱)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})/gi;
  let m;
  while ((m = currencyRegex.exec(clean)) !== null) {
    const num = parseFloat(m[1].replaceAll(",", ""));
    if (!Number.isNaN(num)) amounts.push(num);
  }
  const amount = amounts.length ? Math.max(...amounts) : "";

  // Parse dates like "May 16, 2024" or "2024-05-16"
  const monthNames = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
  const monthRegex = new RegExp(
    `(${monthNames.join("|")})\\.?[a-z]*\\s+([0-9]{1,2}),?\\s+(20[0-9]{2})`,
    "i"
  );
  const dashDate = text.match(/(20[0-9]{2})[-/](\d{2})[-/](\d{2})/);
  const monthMatch = text.match(monthRegex);

  let parsedDate = "";
  if (dashDate) {
    const [, y, m2, d] = dashDate;
    parsedDate = `${y}-${String(m2).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } else if (monthMatch) {
    const [, mon, d, y] = monthMatch;
    const idx = monthNames.findIndex(
      (m3) => m3.toLowerCase() === mon.slice(0, 3).toLowerCase()
    );
    const mm = String(idx + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    parsedDate = `${y}-${mm}-${dd}`;
  }

  return { reference, amount: amount === "" ? "" : String(amount), date: parsedDate };
};

/**
 * Run OCR recognition on uploaded file
 */
export const runOcrWorker = async (file, onProgress) => {
  try {
    const worker = await createWorker({
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      },
    });

    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-₱php ",
      user_defined_dpi: "300",
    });

    const preprocessed = await preprocessImage(file);
    const { data: { text } } = await worker.recognize(preprocessed);
    await worker.terminate();

    return parseOcrText(text || "");
  } catch (err) {
    console.error("OCR failed", err);
    throw err;
  }
};
