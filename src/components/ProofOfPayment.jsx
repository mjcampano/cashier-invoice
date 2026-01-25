// src/components/ProofOfPayment.jsx
import { useEffect, useMemo } from "react";
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
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ✅ AMOUNT extraction:
 * 1) Look for currency "PHP <amount>" values and choose the largest (usually the transfer amount).
 * 2) If none, try "amount/total" labels.
 */
function extractAmount(text = "") {
  const t = normalizeOCR(text);

  const currencyMatches = [
    ...t.matchAll(
      /(?:PHP)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi
    ),
  ]
    .map((m) => m[1].replace(/,/g, ""))
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (currencyMatches.length) {
    const max = Math.max(...currencyMatches);
    return max.toFixed(2);
  }

  const label = t.match(
    /(?:amount|total)\s*[:\-]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i
  );
  if (label?.[1]) return Number(label[1].replace(/,/g, "")).toFixed(2);

  return "";
}

/**
 * ✅ Reference extraction:
 * Looks specifically near the word "reference" and captures digits (5-20).
 * This avoids picking account numbers.
 */
function extractReference(text = "") {
  const t = normalizeOCR(text);
  const lower = t.toLowerCase();

  const idx = lower.indexOf("reference");
  if (idx !== -1) {
    const slice = t.slice(idx, idx + 160);

    // "Reference Number 774996"
    const m1 = slice.match(
      /reference(?:\s*number|\s*no\.?)?\s*[:\-]?\s*([0-9]{5,20})/i
    );
    if (m1?.[1]) return m1[1];

    // fallback: any 5-20 digits near "reference"
    const m2 = slice.match(/([0-9]{5,20})/);
    if (m2?.[1]) return m2[1];
  }

  return "";
}

/** ---------- Component ---------- */
/**
 * Props:
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
  const items = Array.isArray(uploads) ? uploads : [];
  const setItems = typeof setUploads === "function" ? setUploads : () => {};

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
      return {
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
        ocrProgress: 0,

        method: "GCash",
        date: new Date().toISOString().slice(0, 10),
        note: "",
        status: "Pending",
      };
    });

    setItems((prev) => [...mapped, ...(prev || [])]);
    e.target.value = "";
  };

  const verifyItem = (id) => updateItem(id, { status: "Verified" });
  const rejectItem = (id) => updateItem(id, { status: "Rejected" });

  // ✅ OCR reader
  const autoReadOCR = async (it) => {
    updateItem(it.id, { status: "Reading OCR...", ocrProgress: 0 });

    try {
      const result = await Tesseract.recognize(it.url, "eng", {
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

      updateItem(it.id, {
        ocrAmount: amount,
        ocrReference: ref,
        amount: amount || it.amount,
        status: amount || ref ? "Auto-filled (OCR)" : "OCR Failed",
        note: ref ? `OCR Ref: ${ref}` : it.note,
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
    <div style={{ maxWidth: 1000, margin: "30px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Proof of Payment Verification</h2>
        {typeof onGoPreview === "function" && (
          <button type="button" onClick={onGoPreview} style={{ marginLeft: "auto" }}>
            Back to Preview
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <input type="file" accept="image/*" multiple onChange={onPickFiles} />
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
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 16,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 10,
              }}
            >
              <div>
                <img
                  src={it.url}
                  alt="proof"
                  style={{
                    width: "180px",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
                <div style={{ fontSize: 12, marginTop: 6, wordBreak: "break-all" }}>
                  {it.file?.name || "—"}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 }}>
                  <label><b>Reference No:</b></label>
                  <input value={it.refNo} readOnly />

                  <label><b>Amount Paid:</b></label>
                  <input
                    value={it.amount}
                    onChange={(e) => updateItem(it.id, { amount: e.target.value })}
                    placeholder="Auto from filename or OCR, or type manually"
                  />

                  <label><b>Method:</b></label>
                  <select
                    value={it.method}
                    onChange={(e) => updateItem(it.id, { method: e.target.value })}
                  >
                    <option value="GCash">GCash</option>
                    <option value="Maya">Maya</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>

                  <label><b>Date:</b></label>
                  <input
                    type="date"
                    value={it.date}
                    onChange={(e) => updateItem(it.id, { date: e.target.value })}
                  />

                  <label><b>Status:</b></label>
                  <div style={{ paddingTop: 6 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #ccc" }}>
                      {it.status}
                    </span>
                    {String(it.status || "").startsWith("Reading OCR") && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        OCR: {it.ocrProgress}%
                      </div>
                    )}
                  </div>

                  <label><b>Note:</b></label>
                  <input
                    value={it.note}
                    onChange={(e) => updateItem(it.id, { note: e.target.value })}
                    placeholder="Optional remarks"
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => autoReadOCR(it)}>Auto Read OCR</button>
                  <button type="button" onClick={() => addToPayments(it)}>Add to Payments</button>
                  <button type="button" onClick={() => verifyItem(it.id)}>Verify</button>
                  <button type="button" onClick={() => rejectItem(it.id)}>Reject</button>
                  <button type="button" onClick={() => removeItem(it.id)}>Remove</button>
                </div>

                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Tip: For instant auto-fill without OCR, rename files like <b>gcash_1250.jpg</b> or{" "}
                  <b>paid-999.50.png</b>.
                </div>

                {(it.ocrAmount || it.ocrReference) && (
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    <b>OCR Result:</b>{" "}
                    {it.ocrAmount ? `Amount=${it.ocrAmount}` : "Amount=—"}{" "}
                    {it.ocrReference ? ` | Ref=${it.ocrReference}` : " | Ref=—"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
