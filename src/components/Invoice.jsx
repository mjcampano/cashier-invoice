import React, { forwardRef } from "react";

const peso = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const Invoice = forwardRef(function Invoice(
  { business, customer, invoice, items, payments, notes },
  ref
) {
  const subTotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = subTotal - paymentTotal;

  return (
    <div ref={ref} style={styles.page}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <div style={styles.businessName}>{business.name}</div>
          <div style={styles.muted}>{business.address}</div>
          <div style={styles.muted}>Phone: {business.phone}</div>
          <div style={styles.muted}>TIN: {business.tin}</div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={styles.title}>BILLING STATEMENT</div>
          <div style={styles.muted}>Statement Month: {invoice.billingMonth}</div>
          <div style={styles.muted}>Statement #: {invoice.statementNo}</div>
          <div style={styles.muted}>Date Issued: {invoice.dateIssued}</div>
          <div style={styles.muted}>Due Date: {invoice.dueDate}</div>
        </div>
      </div>

      {/* Customer */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Bill To</div>
        <div style={styles.grid2}>
          <div>
            <div style={styles.bold}>{customer.name}</div>
            <div style={styles.muted}>{customer.address}</div>
            <div style={styles.muted}>Contact: {customer.contact}</div>
          </div>
          <div>
            <div style={styles.muted}>Account/Unit: {customer.accountNo}</div>
            <div style={styles.muted}>Cashier: {invoice.cashierName}</div>
            <div style={styles.muted}>Cashier ID: {invoice.cashierId}</div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Charges</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>Description</th>
              <th style={styles.thCenter}>Qty</th>
              <th style={styles.thRight}>Unit Price</th>
              <th style={styles.thRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={styles.tdLeft}>{it.description}</td>
                <td style={styles.tdCenter}>{it.qty}</td>
                <td style={styles.tdRight}>{peso(it.unitPrice)}</td>
                <td style={styles.tdRight}>{peso(it.qty * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={styles.totalsWrap}>
          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <span style={styles.muted}>Subtotal</span>
              <span style={styles.bold}>{peso(subTotal)}</span>
            </div>
            <div style={styles.totalRow}>
              <span style={styles.muted}>Payments</span>
              <span style={styles.bold}>- {peso(paymentTotal)}</span>
            </div>
            <div style={styles.hr} />
            <div style={styles.totalRow}>
              <span style={{ ...styles.bold, fontSize: 14 }}>Balance Due</span>
              <span style={{ ...styles.bold, fontSize: 14 }}>{peso(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Payments Received</div>
        {payments.length === 0 ? (
          <div style={styles.muted}>No payments recorded.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thLeft}>Date</th>
                <th style={styles.thLeft}>Reference</th>
                <th style={styles.thLeft}>Method</th>
                <th style={styles.thRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, idx) => (
                <tr key={idx}>
                  <td style={styles.tdLeft}>{p.date}</td>
                  <td style={styles.tdLeft}>{p.reference}</td>
                  <td style={styles.tdLeft}>{p.method}</td>
                  <td style={styles.tdRight}>{peso(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Notes */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Notes</div>
        <div style={styles.muted}>{notes}</div>
      </div>

      <div style={styles.footer}>
        <div style={styles.muted}>
          This document is computer-generated and valid without signature.
        </div>
      </div>
    </div>
  );
});

const styles = {
  page: {
    width: "794px", // ~A4 width @ 96dpi
    minHeight: "1123px", // ~A4 height @ 96dpi
    padding: 28,
    background: "#fff",
    color: "#111",
    fontFamily: "Arial, sans-serif",
    border: "1px solid #eaeaea",
  },
  headerRow: { display: "flex", justifyContent: "space-between", gap: 16 },
  businessName: { fontSize: 18, fontWeight: 800 },
  title: { fontSize: 18, fontWeight: 800, letterSpacing: 0.5 },
  muted: { fontSize: 11, color: "#444", lineHeight: 1.5 },
  bold: { fontWeight: 700 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 12, fontWeight: 800, marginBottom: 8 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 11 },
  thLeft: { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" },
  thCenter: { textAlign: "center", borderBottom: "1px solid #ddd", padding: "8px 6px" },
  thRight: { textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 6px" },
  tdLeft: { padding: "8px 6px", borderBottom: "1px solid #f0f0f0" },
  tdCenter: { padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #f0f0f0" },
  tdRight: { padding: "8px 6px", textAlign: "right", borderBottom: "1px solid #f0f0f0" },
  totalsWrap: { display: "flex", justifyContent: "flex-end", marginTop: 12 },
  totalsBox: { width: 280, border: "1px solid #eee", padding: 12, borderRadius: 8 },
  totalRow: { display: "flex", justifyContent: "space-between", margin: "6px 0" },
  hr: { height: 1, background: "#eee", margin: "10px 0" },
  footer: { marginTop: 22, paddingTop: 10, borderTop: "1px solid #eee" },
};

export default Invoice;
