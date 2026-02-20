// src/components/ProofOfPayment.jsx
/* eslint-disable no-useless-escape */
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Tesseract from "tesseract.js";

/** ---------- Helpers ---------- */

function makeRefNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const short = uuidv4().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `POP-${y}${m}${day}-${short}`;
}

function guessAmountFromFilename(name) {
  const cleaned = String(name || "").replaceAll(",", "");
  const match = cleaned.match(/(\d+(\.\d{1,2})?)/);
  return match ? match[1] : "";
}

function normalizeOCR(text = "") {
  return text
    .replace(/\u20b1/g, "PHP") // ₱ -> PHP
    .replace(/[|]/g, "I") // | -> I
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

// Reusable light-weight styles to keep JSX tidy
const ui = {
  page: { maxWidth: 1000, margin: "30px auto", padding: 16 },
  headerRow: { display: "flex", alignItems: "center", gap: 10 },
  statsRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10,
  },
  cardGrid: { display: "grid", gap: 16 },
  card: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 16,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
  },
  thumb: { width: 180, height: 180, objectFit: "cover", borderRadius: 8 },
  meta: { fontSize: 12, marginTop: 6, wordBreak: "break-all" },
  formGrid: { display: "grid", gap: 10 },
  labelInputGrid: { display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 },
  buttonRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  tip: { fontSize: 12, opacity: 0.8 },
  ocrText: { fontSize: 12, opacity: 0.9 },
  pill: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #ccc",
    backgroundColor: "#f5f5f5",
  },
  authenticityBox: (isAuthentic) => ({
    padding: "8px 10px",
    borderRadius: 8,
    backgroundColor: isAuthentic ? "#e8f5e9" : "#fff3e0",
    border: `2px solid ${isAuthentic ? "#4caf50" : "#ff9800"}`,
  }),
  authenticityTitle: (isAuthentic) => ({
    fontWeight: "bold",
    color: isAuthentic ? "#2e7d32" : "#e65100",
  }),
  warningBox: {
    padding: "8px 10px",
    borderRadius: 6,
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    fontSize: 12,
    maxHeight: "100px",
    overflowY: "auto",
  },
};

const EMPTY_ITEMS = [];

/**
 * ✅ Smart character cleanup for numbers:
 * Used specifically when extracting numbers to fix OCR misreads
 */

/**
 * ✅ AMOUNT extraction (enhanced):
 * 1) Look for currency "PHP <amount>" - prioritize larger amounts (transfer amount)
 * 2) Look for "Transfer Amount", "Amount:", etc.
 * 3) Filter out small amounts (< 100) and invalid amounts
 * 4) Validate amount is reasonable (between 100 and 999,999)
 */
function extractAmount(text = "") {
  const t = normalizeOCR(text);

  // Step 1: Find all PHP currency amounts
  const currencyMatches = [
    ...t.matchAll(
      /(?:PHP|P)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi
    ),
  ]
    .map((m) => m[1].replace(/,/g, ""))
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v >= 100 && v <= 999999); // Valid range

  // Step 2: If we have multiple amounts, look for context clues
  if (currencyMatches.length > 0) {
    // Look for "Transfer Amount" or similar high-value indicator
    const transferMatch = t.match(
      /(?:transfer\s*amount|paid|amount\s*paid)\s*[:\-]?\s*(?:PHP|P)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
    );
    if (transferMatch?.[1]) {
      const val = Number(transferMatch[1].replace(/,/g, ""));
      if (Number.isFinite(val) && val >= 100 && val <= 999999) {
        return val.toFixed(2);
      }
    }

    // Otherwise, pick the largest valid amount
    const max = Math.max(...currencyMatches);
    if (max >= 100) return max.toFixed(2);
  }

  // Step 3: Fallback to labeled amounts
  const patterns = [
    /transfer\s*amount[:\-]?\s*(?:PHP|P)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /amount\s*paid[:\-]?\s*(?:PHP|P)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:amount|total)[:\-]?\s*(?:PHP|P)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) {
      const val = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(val) && val >= 100 && val <= 999999) {
        return val.toFixed(2);
      }
    }
  }

  return "";
}

/**
 * ✅ Reference extraction (enhanced - v2):
 * 1. Looks for "Reference" label and captures text/numbers with better accuracy
 * 2. Handles formats: RRN, TxnID, Reference No, Receipt No, Transaction ID, etc.
 * 3. Prioritizes longer reference numbers (more reliable than short ones)
 * 4. Returns ONLY numeric characters (removes all letters and symbols)
 * 5. Validates extracted reference before returning
 */
function extractReference(text = "") {
  const t = normalizeOCR(text);
  const lower = t.toLowerCase();

  let foundRef = "";

  // Strategy 1: Look for explicit reference labels with better context
  const refLabels = [
    "reference no",
    "reference number",
    "reference",
    "ref no",
    "ref number",
    "ref",
    "transaction id",
    "txn id",
    "txn",
    "receipt no",
    "receipt number",
    "rrn",
    "transaction reference",
  ];

  for (const label of refLabels) {
    const idx = lower.indexOf(label);
    if (idx !== -1) {
      // Get the text right after the label (up to 150 chars)
      const afterLabel = t.slice(idx + label.length, idx + label.length + 150);
      
      // Look for patterns after colon, dash, equals, or space
      // Match 1: "Reference No: 123456789" or "Reference: 123456789"
      let match = afterLabel.match(/[\s:\-=]+([0-9A-Z\-]{5,30})(?:\s|$|\n|Amount|Date|Time|Phone|Email)/i);
      if (match?.[1]) {
        const candidate = match[1].trim();
        // Prefer longer references (more reliable)
        if (candidate.length >= 5 && candidate.length <= 30 && !candidate.match(/^(Amount|Date|Time|Phone)/i)) {
          foundRef = candidate;
          break;
        }
      }

      // Match 2: Just pure digits after label
      match = afterLabel.match(/[\s:\-=]+([0-9]{5,20})(?:\s|$|\n)/);
      if (match?.[1] && !foundRef) {
        const candidate = match[1];
        if (candidate.length >= 5) {
          foundRef = candidate;
          break;
        }
      }
    }
  }

  // Strategy 2: Look for standalone reference patterns (very common in receipts)
  if (!foundRef) {
    const patterns = [
      // Pattern: "RRN: 123456789012" or "RRN 123456789012"
      /RRN[\s:\-=]*([0-9]{10,20})/i,
      // Pattern: "TxnID: ABC123DEF456" or "Transaction ID: ..."
      /(?:TxnID|Transaction\s*ID|Txn\s*ID)[\s:\-=]*([0-9A-Z\-]{5,30})/i,
      // Pattern: "Reference: POP-20260127-4ED276"
      /(?:Reference|Ref)[\s:\-=]*([POP\-0-9A-Z]{5,30})/i,
      // Pattern: Receipt or transaction numbers
      /(?:Receipt|Transaction)\s*No\.?[\s:\-=]*([0-9]{5,20})/i,
    ];

    for (const pattern of patterns) {
      const match = t.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].trim();
        if (candidate.length >= 5 && candidate.length <= 30) {
          foundRef = candidate;
          break;
        }
      }
    }
  }

  // Strategy 3: Look for common reference prefixes
  if (!foundRef) {
    const prefixPatterns = [
      /POP-[0-9]{8}-[A-Z0-9]{6}/i,  // POP-20260127-4ED276
      /TXN-[A-Z0-9\-]{5,30}/i,      // TXN-xxxxx
      /REF-[A-Z0-9\-]{5,30}/i,      // REF-xxxxx
      /TX-[0-9]{5,20}/i,            // TX-xxxxx
      /RCP-[0-9]{5,20}/i,           // RCP-xxxxx (Receipt)
    ];

    for (const pattern of prefixPatterns) {
      const match = t.match(pattern);
      if (match) {
        foundRef = match[0];
        break;
      }
    }
  }

  // Strategy 4: Last resort - look for long sequences of digits/alphanumeric
  if (!foundRef) {
    // Find any substantial numeric sequence (at least 8-12 digits)
    const digitMatch = t.match(/\b([0-9]{10,20})\b/);
    if (digitMatch?.[1]) {
      // Verify it's not in a larger context (like a phone number)
      const candidate = digitMatch[1];
      const context = t.slice(Math.max(0, t.indexOf(candidate) - 30), t.indexOf(candidate) + candidate.length + 30).toLowerCase();
      
      // Avoid extracting if it looks like amount, date, or phone
      if (!context.match(/php|₱|amount|date|phone|mobile|contact/i)) {
        foundRef = candidate;
      }
    }
  }

  // ✅ EXTRACT NUMBERS ONLY - Return only numeric digits from the reference
  if (foundRef) {
    // Remove all non-numeric characters
    const numbersOnly = foundRef.replace(/[^0-9]/g, "");
    
    // Return if we have a reasonable length (at least 5 digits, at most 20)
    if (numbersOnly.length >= 5 && numbersOnly.length <= 20) {
      return numbersOnly;
    }
  }

  return "";
}

/**
 * ✅ Destination Account extraction (enhanced):
 * Extracts recipient/payee account with multiple strategies for accuracy
 * Handles: names, email, mobile numbers, account numbers, bank names
 */
function extractDestination(text = "") {
  const t = normalizeOCR(text);
  const lower = t.toLowerCase();
  const lines = t.split('\n');

  // Strategy 1: Look for explicit "To" / "Payee" / "Recipient" labels
  const destLabels = [
    "to",
    "payee",
    "recipient", 
    "destination account",
    "receiving account",
    "pay to",
  ];

  for (const label of destLabels) {
    const idx = lower.indexOf(label);
    if (idx !== -1) {
      const afterLabel = t.slice(idx + label.length, idx + label.length + 500);
      
      // Extract name after colon/dash/equals
      let match = afterLabel.match(/[\s:\-=]+([A-Z][A-Za-z\s\.\-\']*(?:Bank|Account|Inc|Ltd|LLC|Corp)?[A-Za-z\s\.\-\']*?)(?:\n|Mobile|Account|Email|Tel|Phone|\||Address|$)/i);
      if (match?.[1]) {
        const dest = match[1].trim().replace(/\s+/g, ' ');
        if (dest.length > 3 && dest.length < 150 && !dest.match(/^\d{10}/)) {
          return dest;
        }
      }

      // Fallback: Get text on same line after label
      const sameLine = afterLabel.split('\n')[0];
      const sameLineMatch = sameLine.match(/[\s:\-=]+([A-Za-z][^|*\n]{3,80})(?:\||$)/);
      if (sameLineMatch?.[1]) {
        const dest = sameLineMatch[1].trim();
        if (dest.length > 3 && dest.length < 100 && !dest.match(/^Account|^Ref|^Amount/i)) {
          return dest;
        }
      }
    }
  }

  // Strategy 2: Look for common account patterns in text
  // "Sandigan Colleges Learning Support Center" pattern
  const namePattern = /([A-Z][A-Za-z\s\.\-\']*(?:School|College|University|Bank|Center|Support|Care|Service|Inc|Ltd|Company|Corp)?[A-Za-z\s\.\-\']*)/g;
  const matches = [...t.matchAll(namePattern)];
  
  for (const match of matches) {
    const candidate = match[0].trim();
    // Look for longer, more substantial names (likely business/institution names)
    if (candidate.length > 10 && 
        candidate.length < 150 && 
        !candidate.match(/^(?:From|To|Date|Amount|Time|Phone|Email|Account|Reference|Receipt|Transaction|Reference)/i) &&
        candidate.split(' ').length >= 2) {
      // Check if it appears near "To" or comes after recipient-related context
      const indexOf = t.indexOf(candidate);
      const contextBefore = t.slice(Math.max(0, indexOf - 50), indexOf).toLowerCase();
      
      if (contextBefore.includes('to') || contextBefore.includes('payee') || contextBefore.includes('recipient')) {
        return candidate;
      }
    }
  }

  // Strategy 3: Check line content (accounts often on dedicated lines)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineLower = line.toLowerCase();
    
    if ((lineLower.includes('to') || lineLower.includes('payee') || lineLower.includes('recipient')) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length > 3 && nextLine.match(/^[A-Z]/) && !nextLine.match(/^\d/) && nextLine.length < 150) {
        return nextLine;
      }
    }
  }

  return "";
}

/**
 * ✅ Source Account extraction (enhanced):
 * Extracts sender/source account with multiple strategies for accuracy
 * Handles: names, email, mobile numbers, account numbers, bank names
 */
function extractSource(text = "") {
  const t = normalizeOCR(text);
  const lower = t.toLowerCase();
  const lines = t.split('\n');

  // Strategy 1: Look for explicit "From" / "Sender" / "Source" labels
  const sourceLabels = [
    "from",
    "sender",
    "source account",
    "sending account",
    "pay from",
  ];

  for (const label of sourceLabels) {
    const idx = lower.indexOf(label);
    if (idx !== -1) {
      const afterLabel = t.slice(idx + label.length, idx + label.length + 500);
      
      // Extract name after colon/dash/equals
      let match = afterLabel.match(/[\s:\-=]+([A-Z][A-Za-z\s\.\-\']*(?:Bank|Account|Inc|Ltd|LLC|Corp)?[A-Za-z\s\.\-\']*?)(?:\n|To|Mobile|Account|Email|Tel|Phone|\||Address|$)/i);
      if (match?.[1]) {
        const source = match[1].trim().replace(/\s+/g, ' ');
        if (source.length > 3 && source.length < 150 && !source.match(/^\d{10}/)) {
          return source;
        }
      }

      // Fallback: Get text on same line after label
      const sameLine = afterLabel.split('\n')[0];
      const sameLineMatch = sameLine.match(/[\s:\-=]+([A-Za-z][^|*\n]{3,80})(?:\||$)/);
      if (sameLineMatch?.[1]) {
        const source = sameLineMatch[1].trim();
        if (source.length > 3 && source.length < 100 && !source.match(/^To|^Account|^Ref|^Amount/i)) {
          return source;
        }
      }
    }
  }

  // Strategy 2: Look for account names in text
  const namePattern = /([A-Z][A-Za-z\s\.\-\']*(?:School|College|University|Bank|Center|Support|Care|Service|Inc|Ltd|Company|Corp)?[A-Za-z\s\.\-\']*)/g;
  const matches = [...t.matchAll(namePattern)];
  
  for (const match of matches) {
    const candidate = match[0].trim();
    // Look for longer, more substantial names
    if (candidate.length > 10 && 
        candidate.length < 150 && 
        !candidate.match(/^(?:To|From|Date|Amount|Time|Phone|Email|Account|Reference|Receipt|Transaction|Recipient|Payee)/i) &&
        candidate.split(' ').length >= 2) {
      // Check if it appears near "From" or comes before recipient-related context
      const indexOf = t.indexOf(candidate);
      const contextAfter = t.slice(indexOf + candidate.length, indexOf + candidate.length + 100).toLowerCase();
      
      if (contextAfter.includes('to') || contextAfter.includes('payee') || contextAfter.includes('recipient')) {
        return candidate;
      }
    }
  }

  // Strategy 3: Check line content (often first account mentioned is source)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineLower = line.toLowerCase();
    
    if ((lineLower.includes('from') || lineLower.includes('sender') || lineLower.includes('source')) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length > 3 && nextLine.match(/^[A-Z]/) && !nextLine.match(/^\d/) && nextLine.length < 150) {
        return nextLine;
      }
    }
  }

  return "";
}

/**
 * ✅ Date extraction (enhanced):
 * Looks for transaction date in multiple formats commonly found in receipts
 */
function extractDate(text = "") {
  const t = normalizeOCR(text);

  // Month name mapping
  const monthMap = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
  };

  // Patterns for date (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
  const datePatterns = [
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, groups: [1, 2, 3], format: "mdy" },  // 01/27/2026
    { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, groups: [1, 2, 3], format: "ymd" },    // 2026-01-27
    { regex: /(\d{1,2})-(\d{1,2})-(\d{2,4})/, groups: [1, 2, 3], format: "dmy" },  // 27-01-26 or 27-01-2026
    { regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, groups: [1, 2, 3], format: "dmy_text" },  // 27 Jan 2026
    { regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i, groups: [1, 2, 3], format: "mdy_text" }, // January 27, 2026
  ];

  for (const pattern of datePatterns) {
    const match = t.match(pattern.regex);
    if (match) {
      try {
        let month, day, year;

        if (pattern.format === "ymd") {
          year = parseInt(match[pattern.groups[0]]);
          month = parseInt(match[pattern.groups[1]]);
          day = parseInt(match[pattern.groups[2]]);
        } else if (pattern.format === "dmy_text") {
          day = parseInt(match[pattern.groups[0]]);
          const monthName = match[pattern.groups[1]].toLowerCase();
          month = monthMap[monthName] || 1;
          year = parseInt(match[pattern.groups[2]]);
        } else if (pattern.format === "mdy_text") {
          const monthName = match[pattern.groups[0]].toLowerCase();
          month = monthMap[monthName] || 1;
          day = parseInt(match[pattern.groups[1]]);
          year = parseInt(match[pattern.groups[2]]);
        } else if (pattern.format === "dmy") {
          day = parseInt(match[pattern.groups[0]]);
          month = parseInt(match[pattern.groups[1]]);
          year = parseInt(match[pattern.groups[2]]);
          // Handle 2-digit years
          if (year < 100) {
            year += year > 50 ? 1900 : 2000;
          }
        } else {
          // mdy format (MM/DD/YYYY)
          month = parseInt(match[pattern.groups[0]]);
          day = parseInt(match[pattern.groups[1]]);
          year = parseInt(match[pattern.groups[2]]);
          
          // If month > 12, swap (it's actually DD/MM/YYYY)
          if (month > 12) {
            [month, day] = [day, month];
          }
        }

        // Validate the date
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day);
          // Double-check the date is valid
          if (date.getMonth() === month - 1 && date.getDate() === day) {
            return date.toISOString().slice(0, 10); // YYYY-MM-DD
          }
        }
      } catch {
        // Skip on error
      }
    }
  }

  return "";
}

/**
 * ✅ Time extraction (enhanced):
 * Looks for transaction time in formats commonly found in receipts
 */
function extractTime(text = "") {
  const t = normalizeOCR(text);

  // Patterns for time - check 24-hour format first, then 12-hour
  const timePatterns = [
    // 24-hour format: 14:34, 14:34:56
    { regex: /\b([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/, is12Hour: false },
    // 12-hour format: 2:34 PM, 2:34:56 PM, 02:34 AM
    { regex: /\b(0?[1-9]|1[0-2]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/i, is12Hour: true },
    // Less strict 24-hour (allows leading zeros or no zeros)
    { regex: /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i, is12Hour: true },
  ];

  for (const pattern of timePatterns) {
    const match = t.match(pattern.regex);
    if (match) {
      try {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3] || 0);
        const ampm = match[4]?.toUpperCase();

        // Validate time values
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
          continue;
        }

        // For 12-hour format with AM/PM, validate
        if (pattern.is12Hour && ampm) {
          if (hours < 1 || hours > 12) continue;
          // Format with leading zeros: HH:MM:SS AM/PM
          return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${ampm}`;
        }

        // For 24-hour format
        if (!pattern.is12Hour || !ampm) {
          // Format with leading zeros: HH:MM:SS
          return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }
      } catch {
        // Skip on error
      }
    }
  }

  return "";
}

/**
 * ✅ Payment Method extraction (enhanced):
 * Identifies the payment method used in the transaction
 * Detects: GCash, Maya, Bank Transfer, Credit/Debit Cards, PayPal, etc.
 * Returns the most likely payment method
 */
function extractPaymentMethod(text = "") {
  const t = normalizeOCR(text);
  const lower = t.toLowerCase();

  // Payment method patterns (ordered by specificity)
  const paymentMethods = [
    // Mobile wallets (Philippines)
    { 
      patterns: [/\bgcash\b/i, /g-cash/i, /gcash transaction/i],
      method: "GCash"
    },
    {
      patterns: [/\bmaya\b/i, /paymaya/i, /pay maya/i, /maya wallet/i],
      method: "Maya"
    },
    {
      patterns: [/paypal/i, /pay pal/i],
      method: "PayPal"
    },

    // Bank transfers (Philippines)
    {
      patterns: [/\bbdo\b/i, /banco de oro/i, /bdo transfer/i],
      method: "BDO Bank"
    },
    {
      patterns: [/metrobank/i, /metro bank/i],
      method: "Metrobank"
    },
    {
      patterns: [/rcbc/i, /rizal bank/i],
      method: "RCBC Bank"
    },
    {
      patterns: [/\bpnb\b/i, /philippine national bank/i],
      method: "PNB Bank"
    },
    {
      patterns: [/unionbank/i, /union bank/i],
      method: "UnionBank"
    },
    {
      patterns: [/bpi bank/i, /bank of the philippine islands/i],
      method: "BPI Bank"
    },
    {
      patterns: [/landbank/i, /land bank/i],
      method: "Landbank"
    },
    {
      patterns: [/\besl\b/i, /equitable pci/i],
      method: "EastWest Bank"
    },

    // Generic bank/transfer
    {
      patterns: [/bank transfer/i, /inter-bank transfer/i, /interbank/i, /wire transfer/i],
      method: "Bank Transfer"
    },

    // Credit/Debit cards
    {
      patterns: [/visa/i, /visa card/i, /visa credit/i],
      method: "Visa Card"
    },
    {
      patterns: [/mastercard/i, /master card/i],
      method: "Mastercard"
    },
    {
      patterns: [/american express/i, /amex/i],
      method: "American Express"
    },
    {
      patterns: [/debit card/i, /debit|credit card/i],
      method: "Debit Card"
    },
    {
      patterns: [/credit card/i],
      method: "Credit Card"
    },

    // Other methods
    {
      patterns: [/cash/i, /cash payment/i],
      method: "Cash"
    },
    {
      patterns: [/cheque/i, /check/i],
      method: "Cheque"
    },
    {
      patterns: [/installment/i, /installment plan/i],
      method: "Installment"
    },
    {
      patterns: [/promissory/i, /post-dated/i],
      method: "Promissory Note"
    },
  ];

  // Search for payment methods in order of specificity
  for (const paymentMethod of paymentMethods) {
    for (const pattern of paymentMethod.patterns) {
      if (pattern.test(t)) {
        return paymentMethod.method;
      }
    }
  }

  // Fallback: check for common keywords near payment-related terms
  if (lower.includes("payment") || lower.includes("paid") || lower.includes("transaction")) {
    // Look for any mentioned method nearby
    const paymentSection = t.slice(Math.max(0, t.indexOf("payment") - 100), t.indexOf("payment") + 200);
    
    for (const paymentMethod of paymentMethods) {
      for (const pattern of paymentMethod.patterns) {
        if (pattern.test(paymentSection)) {
          return paymentMethod.method;
        }
      }
    }
  }

  return ""; // No method detected
}

/**
 * ✅ Security Check (Authenticity Verification):
 * Analyzes OCR data and text patterns to determine if image is a legitimate receipt
 * Returns: { isAuthentic: boolean, confidence: 0-100, warnings: [] }
 */
function verifyAuthenticity(text = "", ocrConfidence = 0) {
  const t = normalizeOCR(text);

  const warnings = [];
  let authenticityScore = 0;

  // 1. Check for essential receipt indicators
  const hasAmount = /(?:PHP|P|₱)\s*\d+/.test(t);
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(t);
  const hasReference = /(?:Reference|Ref|RRN|Transaction ID|Receipt No)[:\s]*[0-9A-Za-z\-]{5,}/.test(t);
  const hasTime = /\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?/.test(t);
  const hasPaymentMethod = /(?:GCash|Maya|Bank|Transfer|Cash|Visa|Mastercard|PayPal|Debit)/i.test(t);
  const hasRecipientOrFrom = /(?:From|To|Payee|Recipient|Sender|Destination)/i.test(t);

  // Score based on essential fields
  if (hasAmount) authenticityScore += 20;
  else warnings.push("⚠️ No amount found");

  if (hasDate) authenticityScore += 15;
  else warnings.push("⚠️ No transaction date found");

  if (hasReference) authenticityScore += 20;
  else warnings.push("⚠️ No reference/transaction ID found");

  if (hasTime) authenticityScore += 10;
  else warnings.push("⚠️ No transaction time found");

  if (hasPaymentMethod) authenticityScore += 15;
  else warnings.push("⚠️ No payment method found");

  if (hasRecipientOrFrom) authenticityScore += 10;
  else warnings.push("⚠️ No sender/recipient information found");

  if (Number.isFinite(ocrConfidence)) {
    if (ocrConfidence >= 85) authenticityScore += 10;
    else if (ocrConfidence < 40) {
      warnings.push("⚠️ OCR confidence is low");
      authenticityScore -= 10;
    }
  }

  // 2. Check for suspicious patterns (fake indicators)
  const hasExcessiveNumbers = (t.match(/\d/g) || []).length > 100;
  if (hasExcessiveNumbers) {
    warnings.push("🚨 Excessive numbers detected (possible non-receipt)");
    authenticityScore -= 15;
  }

  const hasBlurredIndicators = /blurr|pixelat|distort|unclear|unreadable/i.test(t);
  if (hasBlurredIndicators) {
    warnings.push("⚠️ Image quality issues detected");
    authenticityScore -= 10;
  }

  const hasGeneratedWatermark = /watermark|draft|copy|fake|template|sample|test/i.test(t);
  if (hasGeneratedWatermark) {
    warnings.push("🚨 Suspicious text found (watermark/draft/fake/template)");
    authenticityScore -= 30;
  }

  const hasLoremIpsum = /lorem ipsum|dolor sit|consectetur/i.test(t);
  if (hasLoremIpsum) {
    warnings.push("🚨 Placeholder text detected (fake document)");
    authenticityScore -= 50;
  }

  // 3. Check text quality and readability
  const textLength = t.length;
  if (textLength < 50) {
    warnings.push("⚠️ Very short document (possible non-receipt)");
    authenticityScore -= 20;
  }

  // 4. Check for common receipt brands/providers
  const hasKnownProvider = /GCash|Maya|Bank of|BDO|Metrobank|RCBC|Sandigancolleges|PayMaya|remit|transfer|electronic|mobile wallet/i.test(t);
  if (hasKnownProvider) {
    authenticityScore += 15;
  }

  // 5. Check for date validity (not future dates, not too old)
  const dateMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dateMatch) {
    try {
      const [, d, m, y] = dateMatch;
      let year = parseInt(y);
      if (year < 100) year += year > 50 ? 1900 : 2000;

      const receiptDate = new Date(year, parseInt(m) - 1, parseInt(d));
      const today = new Date();
      const daysDiff = (today - receiptDate) / (1000 * 60 * 60 * 24);

      if (daysDiff < 0) {
        warnings.push("🚨 Receipt is from future date (impossible)");
        authenticityScore -= 40;
      } else if (daysDiff > 365) {
        warnings.push("⚠️ Receipt is more than 1 year old");
        authenticityScore -= 5;
      }
    } catch {
      // Skip on error
    }
  }

  // Ensure score stays between 0-100
  authenticityScore = Math.max(0, Math.min(100, authenticityScore));

  // Determine if authentic based on score
  const isAuthentic = authenticityScore >= 60 && warnings.filter(w => w.includes("🚨")).length === 0;

  return {
    isAuthentic,
    confidence: authenticityScore,
    warnings: warnings,
    hasAmount,
    hasDate,
    hasReference,
  };
}

/**
 * ✅ Props:
 * - data, setData: pushes into App.jsx data.payments
 * - uploads, setUploads: shared state from App.jsx so uploads persist across tabs
 * - onGoPreview: optional callback button
 */
export default function ProofOfPayment({
  data,
  setData,
  uploads,
  setUploads,
  onGoPreview,
}) {
  // ✅ ATTACHED: Use App uploads as the source of truth
  const items = Array.isArray(uploads) ? uploads : EMPTY_ITEMS;
  const setItems = typeof setUploads === "function" ? setUploads : () => {};
  const [previewItem, setPreviewItem] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  // ✅ cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it?.url) URL.revokeObjectURL(it.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close preview on Escape key
  useEffect(() => {
    if (!previewItem) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPreviewItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewItem]);

  // Reset zoom/pan whenever a new preview is opened
  useEffect(() => {
    if (!previewItem) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragStart(null);
  }, [previewItem]);

  // Lock page scroll and jump to top so the modal is always visible when opened
  useEffect(() => {
    if (!previewItem) {
      document.body.style.overflow = "";
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      document.body.style.overflow = previous;
    };
  }, [previewItem]);

  const updateItem = (id, patch) => {
    setItems((prev) =>
      (prev || []).map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const list = prev || [];
      const found = list.find((x) => x.id === id);
      if (found?.url) URL.revokeObjectURL(found.url);
      return list.filter((it) => it.id !== id);
    });
  };

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((file) => {
      const url = URL.createObjectURL(file);
      const item = {
        id: uuidv4(),
        file,
        url,

        // internal generated ref (always)
        refNo: makeRefNo(),

        // quick auto amount guess from filename
        amount: guessAmountFromFilename(file.name),

        // OCR extracted fields
        ocrAmount: "",
        ocrReference: "",
        ocrDate: "",
        ocrTime: "",
        ocrSource: "",
        ocrDestination: "",
        ocrPaymentMethod: "",
        ocrProgress: 0,

        // Security/Authenticity fields
        isAuthentic: null,
        authenticityScore: 0,
        securityWarnings: [],

        method: "GCash",
        date: new Date().toISOString().slice(0, 10),
        time: "",
        source: "",
        destination: "",
        status: "Pending",
      };
      return item;
    });

    setItems((prev) => [...mapped, ...(prev || [])]);
    
    // Auto-trigger OCR for newly uploaded files
    mapped.forEach((item) => {
      setTimeout(() => autoReadOCR(item), 300);
    });

    e.target.value = "";
  };

  const verifyItem = (id) => updateItem(id, { status: "Verified" });
  const rejectItem = (id) => updateItem(id, { status: "Rejected" });

  // ✅ OCR reader with enhanced settings
  const autoReadOCR = async (it) => {
    updateItem(it.id, { status: "Reading OCR...", ocrProgress: 0 });

    try {
      const result = await Tesseract.recognize(it.url, "eng", {
        // Higher accuracy settings
        corenlp: true,
        tessedit_pagesegmode: Tesseract.PSM.SPARSE_TEXT,
        logger: (m) => {
          if (m.status === "recognizing text") {
            const pct = Math.round((m.progress || 0) * 100);
            updateItem(it.id, {
              ocrProgress: pct,
              status: `Reading OCR (${pct}%)`,
            });
          }
        },
      });

      const text = result?.data?.text || "";
      const amount = extractAmount(text);
      const ref = extractReference(text);
      const ocrDate = extractDate(text);
      const ocrTime = extractTime(text);
      const ocrSource = extractSource(text);
      const ocrDestination = extractDestination(text);
      const ocrPaymentMethod = extractPaymentMethod(text);

      // Verify authenticity
      const authCheck = verifyAuthenticity(text, result?.data?.confidence || 0);

      // Build status message based on what was extracted
      const extractedItems = [];
      if (amount) extractedItems.push("Amount");
      if (ref) extractedItems.push("Reference");
      if (ocrDate) extractedItems.push("Date");
      if (ocrTime) extractedItems.push("Time");
      if (ocrSource) extractedItems.push("From");
      if (ocrDestination) extractedItems.push("To");
      if (ocrPaymentMethod) extractedItems.push("Method");

      const statusMessage = authCheck.isAuthentic
        ? `✅ Auto-filled: ${extractedItems.join(", ")}`
        : `⚠️ Warnings: ${authCheck.warnings.slice(0, 2).join(" | ")}`;

      updateItem(it.id, {
        ocrAmount: amount,
        ocrReference: ref,
        ocrDate: ocrDate,
        ocrTime: ocrTime,
        ocrSource: ocrSource,
        ocrDestination: ocrDestination,
        ocrPaymentMethod: ocrPaymentMethod,
        amount: amount || it.amount,
        date: ocrDate || it.date,
        time: ocrTime || it.time,
        source: ocrSource || it.source,
        destination: ocrDestination || it.destination,
        method: ocrPaymentMethod || it.method,
        isAuthentic: authCheck.isAuthentic,
        authenticityScore: authCheck.confidence,
        securityWarnings: authCheck.warnings,
        status: statusMessage,
      });
    } catch (err) {
      console.error(err);
      updateItem(it.id, { status: "OCR Error" });
    }
  };

  // ✅ push into App.jsx payments
  const addToPayments = (it) => {
    if (!setData) {
      updateItem(it.id, { status: "Added (local only)" });
      return;
    }

    // Prefer OCR-extracted reference, fallback to generated one
    const finalRef = it.ocrReference || it.refNo;

    setData((d) => ({
      ...d,
      payments: [
        {
          id: uuidv4(),
          date: it.date,
          reference: finalRef,
          method: it.method,
          amount: Number(it.amount) || 0,
          proofUrl: it.url,
          proofFileName: it.file?.name || "",
          proofStatus: it.status,
          note: it.note,
        },
        ...(d.payments || []),
      ],
    }));

    updateItem(it.id, { status: "Added to Payments" });
  };

  return (
    <>
    <div style={ui.page}>
      <div style={ui.headerRow}>
        <h2 style={{ margin: 0 }}>Proof of Payment Verification</h2>
        {typeof onGoPreview === "function" && (
          <button
            type="button"
            className="actionBtn"
            onClick={onGoPreview}
            style={{ marginLeft: "auto" }}
          >
            Back to Preview
          </button>
        )}
      </div>

      <div style={ui.statsRow}>
        <label className="uploadBtn">
          <span>⬆️ Upload Proof</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            style={{ display: "none" }}
          />
        </label>
        <div>
          <b>Total Amount:</b> {total.toFixed(2)}
        </div>
        {data?.payments && (
          <div>
            <b>Payments:</b> {data.payments.length}
          </div>
        )}
      </div>

      <hr style={{ margin: "16px 0" }} />

      {items.length === 0 ? (
        <p>No uploads yet.</p>
      ) : (
        <div style={ui.cardGrid}>
          {items.map((it) => (
            <div
              key={it.id}
              style={ui.card}
            >
              <div
                className="pop-thumbWrap"
                onClick={() => {
                  setPreviewItem(it);
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setPreviewItem(it);
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }
                }}
              >
                <img
                  src={it.url}
                  alt="proof"
                  className="pop-thumb"
                  style={ui.thumb}
                />
                <div className="pop-overlay">
                  <div className="pop-overlay__title">{it.file?.name || "Proof"}</div>
                  <div className="pop-overlay__line">Ref: {it.ocrReference || it.refNo || "—"}</div>
                  <div className="pop-overlay__line">Amount: {it.amount || "—"}</div>
                  <div className="pop-overlay__line">Method: {it.method || "—"}</div>
                  <div className="pop-overlay__line">Status: {it.status || "Pending"}</div>
                  <div className="pop-overlay__cta">Open preview ↗</div>
                </div>
                <div style={ui.meta}>
                  {it.file?.name || "—"}
                </div>
              </div>

              <div style={ui.formGrid}>
                <div style={ui.labelInputGrid}>
                  <label><b>Reference No:</b></label>
                  <input 
                    value={it.ocrReference || it.refNo} 
                    onChange={(e) => updateItem(it.id, { ocrReference: e.target.value })}
                    placeholder="Auto-filled from OCR or generated"
                    style={{ backgroundColor: it.ocrReference ? "#e8f5e9" : "#fff" }}
                  />

                  <label><b>Amount Paid:</b></label>
                  <input
                    value={it.amount}
                    onChange={(e) => updateItem(it.id, { amount: e.target.value })}
                    placeholder="Auto from filename or OCR, or type manually"
                  />

                  <label><b>From (Sender):</b></label>
                  <input 
                    value={it.source} 
                    onChange={(e) => updateItem(it.id, { source: e.target.value })}
                    placeholder="Auto-filled from OCR"
                    style={{ backgroundColor: it.ocrSource ? "#e8f5e9" : "#fff" }}
                  />

                  <label><b>To (Recipient):</b></label>
                  <input 
                    value={it.destination} 
                    onChange={(e) => updateItem(it.id, { destination: e.target.value })}
                    placeholder="Auto-filled from OCR"
                    style={{ backgroundColor: it.ocrDestination ? "#e8f5e9" : "#fff" }}
                  />

                  <label><b>Method:</b></label>
                  <select
                    value={it.method}
                    onChange={(e) => updateItem(it.id, { method: e.target.value })}
                    style={{ backgroundColor: it.ocrPaymentMethod ? "#e8f5e9" : "#fff" }}
                  >
                    <option value="GCash">GCash</option>
                    <option value="Maya">Maya</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="BDO Bank">BDO Bank</option>
                    <option value="Metrobank">Metrobank</option>
                    <option value="RCBC Bank">RCBC Bank</option>
                    <option value="PNB Bank">PNB Bank</option>
                    <option value="UnionBank">UnionBank</option>
                    <option value="BPI Bank">BPI Bank</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>

                  <label><b>Date:</b></label>
                  <input
                    type="date"
                    value={it.date}
                    onChange={(e) => updateItem(it.id, { date: e.target.value })}
                    style={{ backgroundColor: it.ocrDate ? "#e8f5e9" : "#fff" }}
                  />

                  <label><b>Time:</b></label>
                  <input
                    type="time"
                    value={it.time}
                    onChange={(e) => updateItem(it.id, { time: e.target.value })}
                    placeholder="HH:MM:SS"
                    style={{ backgroundColor: it.ocrTime ? "#e8f5e9" : "#fff" }}
                  />

                  <label><b>Status:</b></label>
                  <div style={{ paddingTop: 6 }}>
                    <span
                      style={{
                        ...ui.pill,
                        backgroundColor: it.isAuthentic === false ? "#ffebee" : ui.pill.backgroundColor,
                      }}
                    >
                      {it.status}
                    </span>
                    {String(it.status || "").startsWith("Reading OCR") && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        OCR: {it.ocrProgress}%
                      </div>
                    )}
                  </div>

                  {/* Security Authenticity Section */}
                  {it.authenticityScore > 0 && (
                    <>
                      <label><b>🔒 Security Status:</b></label>
                      <div style={{ paddingTop: 6 }}>
                        <div style={ui.authenticityBox(it.isAuthentic)}>
                          <div style={ui.authenticityTitle(it.isAuthentic)}>
                            {it.isAuthentic ? "✅ Authentic Receipt" : "⚠️ Verification Warnings"}
                          </div>
                          <div style={{ fontSize: 12, marginTop: 4, color: "#666" }}>
                            Confidence: {it.authenticityScore}%
                          </div>
                        </div>
                      </div>

                      {/* Display Security Warnings */}
                      {it.securityWarnings.length > 0 && (
                        <>
                          <label><b>⚠️ Alert Details:</b></label>
                          <div style={ui.warningBox}>
                            {it.securityWarnings.map((warning, idx) => (
                              <div key={idx} style={{ marginBottom: "4px", color: "#856404" }}>
                                {warning}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div style={ui.buttonRow}>
                  <button type="button" className="actionBtn" onClick={() => autoReadOCR(it)}>Auto Read OCR</button>
                  <button type="button" className="actionBtn success" onClick={() => addToPayments(it)}>Add to Payments</button>
                  <button type="button" className="actionBtn success" onClick={() => verifyItem(it.id)}>Verify</button>
                  <button type="button" className="actionBtn warning" onClick={() => rejectItem(it.id)}>Reject</button>
                  <button type="button" className="actionBtn danger" onClick={() => removeItem(it.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {previewItem && (
      <div className="pop-modal" onClick={() => setPreviewItem(null)}>
        <div className="pop-modal__dialog" onClick={(e) => e.stopPropagation()}>
          <div className="pop-modal__header">
            <div>
              <div className="pop-modal__title">{previewItem.file?.name || "Proof preview"}</div>
              <div className="pop-modal__meta">Ref: {previewItem.ocrReference || previewItem.refNo || "—"} · {previewItem.method || "—"}</div>
            </div>
            <button type="button" className="smallBtn" onClick={() => setPreviewItem(null)}>Close</button>
          </div>

          <div className="pop-zoomRow">
            <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
            <div className="pop-zoomRow__actions">
              <button type="button" className="pop-zoomBtn" onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}>-</button>
              <button type="button" className="pop-zoomBtn" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}>+</button>
              <button type="button" className="pop-zoomBtn" onClick={() => setZoom(1)}>Reset</button>
            </div>
          </div>

          <div className="pop-modal__body">
            <div
              className={`pop-modal__imgWrap ${dragStart ? "isPanning" : ""}`}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                setZoom((z) => Math.min(3, Math.max(1, Number((z + delta).toFixed(2)))));
              }}
              onDoubleClick={() => {
                setZoom((z) => (z > 1 ? 1 : 2));
                setOffset({ x: 0, y: 0 });
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                const point = { x: e.clientX, y: e.clientY };
                setDragStart({ ...point, originX: offset.x, originY: offset.y, id: e.pointerId });
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!dragStart || dragStart.id !== e.pointerId) return;
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                setOffset({ x: dragStart.originX + dx, y: dragStart.originY + dy });
              }}
              onPointerUp={(e) => {
                if (dragStart && dragStart.id === e.pointerId) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  setDragStart(null);
                }
              }}
              onPointerLeave={() => setDragStart(null)}
            >
              <img
                src={previewItem.url}
                alt="Proof large"
                className="pop-modal__img"
                draggable={false}
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
              />
            </div>
            <div className="pop-modal__details">
              <div><b>Amount:</b> {previewItem.amount || "—"}</div>
              <div><b>Date:</b> {previewItem.date || "—"}</div>
              <div><b>Time:</b> {previewItem.time || "—"}</div>
              <div><b>From:</b> {previewItem.source || "—"}</div>
              <div><b>To:</b> {previewItem.destination || "—"}</div>
              <div><b>Status:</b> {previewItem.status || "Pending"}</div>
              {previewItem.securityWarnings?.length > 0 && (
                <div className="pop-modal__warnings">
                  {previewItem.securityWarnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

