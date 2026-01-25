import React, { useMemo } from "react";
import {
  uid,
  makeRefNo,
  guessAmountFromFilename,
  guessMethodFromFilename,
  guessDateFromFilename,
  runOcrWorker,
} from "../utils";

export default function ProofOfPayment({ data, setData, uploads, setUploads }) {
  const totalUploaded = useMemo(
    () => uploads.reduce((sum, u) => sum + (Number(u.amount) || 0), 0),
    [uploads]
  );

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const mapped = files.map((file) => {
      const url = URL.createObjectURL(file);
      return {
        id: uid(),
        file,
        url,
        refNo: makeRefNo(),
        amount: guessAmountFromFilename(file.name),
        method: guessMethodFromFilename(file.name),
        date: guessDateFromFilename(file.name),
        status: "Pending",
        ocrProgress: 0,
      };
    });

    setUploads((prev) => [...mapped, ...prev]);
    e.target.value = "";
    mapped.forEach(runOcr);
  };

  const updateUpload = (id, patch) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const removeUpload = (id) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((u) => u.id !== id);
    });
  };

  const runOcr = async (upload) => {
    updateUpload(upload.id, { status: "Reading OCR", ocrProgress: 5 });
    try {
      const parsed = await runOcrWorker(upload.file, (progress) => {
        updateUpload(upload.id, { ocrProgress: progress });
      });

      const finalAmount = parsed.amount || guessAmountFromFilename(upload.file.name) || "";
      const finalRef = parsed.reference || makeRefNo();
      const finalDate = parsed.date || guessDateFromFilename(upload.file.name) || new Date().toISOString().slice(0, 10);

      updateUpload(upload.id, {
        ocrProgress: 100,
        status: "Pending",
        amount: finalAmount,
        refNo: finalRef,
        date: finalDate,
      });
    } catch (err) {
      console.error("OCR failed", err);
      updateUpload(upload.id, { status: "Pending", ocrProgress: 0 });
    }
  };

  const addToPayments = (upload) => {
    setData((d) => ({
      ...d,
      payments: [
        {
          id: uid(),
          date: upload.date,
          reference: upload.refNo,
          method: upload.method,
          amount: Number(upload.amount) || 0,
          proofUrl: upload.url,
          proofFileName: upload.file?.name || "",
          proofStatus: upload.status,
        },
        ...(d.payments || []),
      ],
    }));
    updateUpload(upload.id, { status: "Added" });
  };

  const verifyUpload = (upload) => {
    updateUpload(upload.id, { status: "Verified" });
    setData((d) => ({
      ...d,
      payments: (d.payments || []).map((p) =>
        p.reference === upload.refNo ? { ...p, proofStatus: "Verified" } : p
      ),
    }));
  };

  const rejectUpload = (upload) => {
    updateUpload(upload.id, { status: "Rejected" });
    setData((d) => ({
      ...d,
      payments: (d.payments || []).map((p) =>
        p.reference === upload.refNo ? { ...p, proofStatus: "Rejected" } : p
      ),
    }));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.h2}>Proof of Payment</h2>

      <div style={styles.controlsRow}>
        <input type="file" accept="image/*" multiple onChange={onPickFiles} />
        <div>
          <b>Total (Uploads):</b> {totalUploaded.toFixed(2)}
        </div>
        <div>
          <b>Payments Count:</b> {(data.payments || []).length}
        </div>
      </div>

      <hr style={styles.divider} />

      {uploads.length === 0 ? (
        <p>No uploads yet. Choose image files above.</p>
      ) : (
        <div style={styles.uploadsGrid}>
          {uploads.map((u) => (
            <UploadCard
              key={u.id}
              upload={u}
              onUpdate={updateUpload}
              onRemove={removeUpload}
              onAddPayment={addToPayments}
              onVerify={verifyUpload}
              onReject={rejectUpload}
            />
          ))}
        </div>
      )}

      <hr style={styles.divider} />

      <h3>Current Payments (data.payments)</h3>
      <PaymentsTable payments={data.payments || []} />
    </div>
  );
}

function UploadCard({
  upload,
  onUpdate,
  onRemove,
  onAddPayment,
  onVerify,
  onReject,
}) {
  return (
    <div style={styles.uploadCard}>
      <div style={styles.imageSection}>
        <img
          src={upload.url}
          alt="proof"
          style={styles.uploadImage}
        />
        <div style={styles.fileName}>{upload.file?.name}</div>
      </div>

      <div style={styles.detailsSection}>
        <div style={styles.fieldGrid}>
          <label><b>Reference No:</b></label>
          <input value={upload.refNo} readOnly />

          <label><b>Amount Paid:</b></label>
          <input
            value={upload.amount}
            onChange={(e) => onUpdate(upload.id, { amount: e.target.value })}
            placeholder="Auto from filename or type manually"
          />

          <label><b>Method:</b></label>
          <select
            value={upload.method}
            onChange={(e) => onUpdate(upload.id, { method: e.target.value })}
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
            value={upload.date}
            onChange={(e) => onUpdate(upload.id, { date: e.target.value })}
          />

          <label><b>Status:</b></label>
          <div style={styles.statusBadge}>
            <span>{upload.status}</span>
            {upload.ocrProgress > 0 && upload.ocrProgress < 100 && (
              <div style={styles.ocrText}>OCR: {upload.ocrProgress}%</div>
            )}
            {upload.ocrProgress === 100 && (
              <div style={styles.ocrReady}>OCR ready</div>
            )}
          </div>
        </div>

        <div style={styles.actionsRow}>
          <button type="button" onClick={() => onAddPayment(upload)}>
            Add to Payments
          </button>
          <button type="button" onClick={() => onVerify(upload)}>
            Verify
          </button>
          <button type="button" onClick={() => onReject(upload)}>
            Reject
          </button>
          <button type="button" onClick={() => onRemove(upload.id)}>
            Remove
          </button>
        </div>

        <div style={styles.tip}>
          Tip: If you want amount to auto-fill, name files like <b>gcash_1250.jpg</b> or <b>paid-999.50.png</b>.
        </div>
      </div>
    </div>
  );
}

function PaymentsTable({ payments }) {
  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.thLeft}>Date</th>
            <th style={styles.thLeft}>Reference</th>
            <th style={styles.thLeft}>Method</th>
            <th style={styles.thRight}>Amount</th>
            <th style={styles.thLeft}>Proof Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td style={styles.tdLeft}>{p.date}</td>
              <td style={styles.tdLeft}>{p.reference}</td>
              <td style={styles.tdLeft}>{p.method}</td>
              <td style={styles.tdRight}>{Number(p.amount || 0).toFixed(2)}</td>
              <td style={styles.tdLeft}>{p.proofStatus || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1050, margin: "0 auto" },
  h2: { marginTop: 0 },
  controlsRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  divider: { margin: "16px 0" },
  uploadsGrid: { display: "grid", gap: 14 },
  uploadCard: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 14,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 10,
  },
  imageSection: { display: "flex", flexDirection: "column", alignItems: "center" },
  uploadImage: {
    width: 180,
    height: 180,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #eee",
  },
  fileName: { fontSize: 12, marginTop: 6, wordBreak: "break-all" },
  detailsSection: { display: "grid", gap: 10 },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "170px 1fr",
    gap: 10,
  },
  statusBadge: {
    paddingTop: 6,
    display: "flex",
    flexDirection: "column",
  },
  ocrText: { fontSize: 11, marginTop: 4 },
  ocrReady: { fontSize: 11, marginTop: 4, color: "green" },
  actionsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  tip: { fontSize: 12, opacity: 0.8 },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  thLeft: { borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 },
  thRight: { borderBottom: "1px solid #ddd", textAlign: "right", padding: 8 },
  tdLeft: { borderBottom: "1px solid #f1f1f1", padding: 8 },
  tdRight: { borderBottom: "1px solid #f1f1f1", padding: 8, textAlign: "right" },
};
