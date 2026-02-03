import React, { forwardRef } from "react";
import { peso } from "../utils";
import logo from "../assets/logo.png";

const Invoice = forwardRef(function Invoice(
  { business, customer, invoice, items, payments, notes },
  ref
) {
  const subTotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = subTotal - paymentTotal;

  return (
    <div ref={ref} style={styles.page}>
      {/* Watermark Logo */}
      <div style={styles.watermark}>
        <img src={logo} alt="Watermark" style={styles.watermarkImage} />
      </div>

      {/* Professional College Header */}
      <div style={styles.headerTop}>
        <div style={styles.headerContainer}>
          {/* Left: Logo and School Name */}
          <div style={styles.leftSection}>
            <div style={styles.logoSection}>
              <img src={logo} alt="School Logo" style={styles.logo} />
            </div>
            <div style={styles.schoolNameOnly}>
              <div style={styles.schoolNameHeader}>{business.name}</div>
              <div style={styles.schoolTagline}>Sambulawan, Datu Salibo, Maguindanao Del Sur</div>
            </div>
          </div>

          {/* Right: Office of Registrar and Contact Info */}
          <div style={styles.rightSectionWrapper}>
            <div style={styles.rightSection}>
              <div style={styles.registrarTitle}>Office of the Registrar</div>
              <div style={styles.contactBlock}>
                <div style={styles.contactItem}>{business.address}</div>
                <div style={styles.contactItem}>Email: mail@sandigancolleges.edu.ph</div>
                <div style={styles.contactItem}>Phone: {business.phone}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.dividerLine}></div>

      {/* Document Title and Meta */}
      <div style={styles.documentMeta}>
        <div style={styles.documentTitle}>STUDENT BILLING STATEMENT</div>
        <div style={styles.metaGrid}>
          <div>
            <span style={styles.metaLabel}>Statement #:</span> {invoice.statementNo}
          </div>
          <div>
            <span style={styles.metaLabel}>Academic Term:</span> {invoice.billingMonth}
          </div>
          <div>
            <span style={styles.metaLabel}>Date Issued:</span> {invoice.dateIssued}
          </div>
          <div>
            <span style={styles.metaLabel}>Due Date:</span> {invoice.dueDate}
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div style={styles.studentInfoBox}>
        <div style={styles.studentInfoTitle}>Student Information</div>
        <div style={styles.studentInfoGrid}>
          <div>
            <span style={styles.infoLabel}>Student Name:</span>
            <div style={styles.infoValue}>{customer.name}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>Student ID:</span>
            <div style={styles.infoValue}>{customer.accountNo}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>Address:</span>
            <div style={styles.infoValue}>{customer.address}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>Contact:</span>
            <div style={styles.infoValue}>{customer.contact}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>Course:</span>
            <div style={styles.infoValue}>{invoice.cashierName}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>Major:</span>
            <div style={styles.infoValue}>{invoice.cashierId}</div>
          </div>
        </div>
      </div>

      {/* Tuition & Fees */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Tuition & Fees Charges</div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.thLeft}>Description</th>
              <th style={styles.thCenter}>Units/QTY</th>
              <th style={styles.thRight}>Unit Price</th>
              <th style={styles.thRight}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={idx % 2 === 0 ? { backgroundColor: "#fafafa" } : {}}>
                <td style={styles.tdLeft}>{it.description}</td>
                <td style={styles.tdCenter}>{it.qty}</td>
                <td style={styles.tdRight}>{peso(it.unitPrice)}</td>
                <td style={styles.tdRight}>{peso(it.qty * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Box */}
        <div style={styles.totalsWrap}>
          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total Charges</span>
              <span style={styles.totalAmount}>{peso(subTotal)}</span>
            </div>
            <div style={styles.hr} />
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total Payments</span>
              <span style={styles.totalAmount}>- {peso(paymentTotal)}</span>
            </div>
            <div style={styles.hrThick} />
            <div style={styles.balanceRow}>
              <span style={styles.balanceLabel}>Balance Due</span>
              <span style={styles.balanceAmount}>{peso(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Payment History</div>
        {payments.length === 0 ? (
          <div style={styles.noPaymentsText}>No payments recorded.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.thLeft}>Payment Date</th>
                <th style={styles.thLeft}>Reference Number</th>
                <th style={styles.thLeft}>Payment Method</th>
                <th style={styles.thRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, idx) => (
                <tr key={idx} style={idx % 2 === 0 ? { backgroundColor: "#fafafa" } : {}}>
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
        <div style={styles.sectionTitle}>Remarks</div>
        <div style={styles.remarksBox}>{notes || "No remarks."}</div>
      </div>

      {/* Payment Instructions */}
      <div style={styles.paymentInstructions}>
        <div style={styles.instructionsTitle}>Payment Instructions</div>
        <ul style={styles.instructionsList}>
          <li>Payment is due on the due date specified above.</li>
          <li>Please bring this statement to the Finance/Cashier Office for payment.</li>
          <li>Accepted payment methods: Cash, Check, Bank Transfer, Credit/Debit Card</li>
          <li>For inquiries, contact the Finance Office.</li>
        </ul>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          This document is a computer-generated official statement from the Office of the Registrar and is valid without a signature.
        </div>
        <div style={styles.footerDate}>
          Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
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
    backgroundImage: "radial-gradient(circle at 95% 5%, rgba(0, 51, 102, 0.03) 0%, transparent 50%), radial-gradient(circle at 5% 95%, rgba(0, 153, 76, 0.02) 0%, transparent 50%)",
    color: "#1a1a1a",
    fontFamily: "'Arial', 'Calibri', sans-serif",
    border: "1px solid #e0e0e0",
    position: "relative",
  },
  
  // Watermark
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  watermarkImage: {
    width: 600,
    height: 600,
    objectFit: "contain",
    opacity: 0.04,
  },
  
  // Professional Header
  headerTop: {
    marginBottom: 12,
    paddingBottom: 8,
    position: "relative",
    zIndex: 1,
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 0,
  },
  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexGrow: 0,
  },
  logoSection: {
    flexShrink: 0,
  },
  logo: {
    height: 90,
    width: 90,
    objectFit: "contain",
  },
  schoolNameOnly: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  schoolNameHeader: {
    fontSize: 18,
    fontWeight: 900,
    color: "#009944",
    letterSpacing: 0.3,
  },
  schoolTagline: {
    fontSize: 11,
    color: "#555",
    marginTop: 3,
    fontWeight: 500,
  },
  rightSectionWrapper: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  rightSection: {
    textAlign: "right",
    flex: 1,
  },
  registrarTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#009944",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  divisionText: {
    fontSize: 10,
    color: "#666",
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  schoolNameSection: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  contactBlock: {
    fontSize: 10,
    color: "#444",
    lineHeight: 1.8,
  },
  contactItem: {
    marginBottom: 2,
  },
  spacer: {
    flex: 1,
  },
  headerContactSection: {
    flex: 1,
    paddingLeft: 20,
    borderLeft: "1px solid #ddd",
  },
  dividerLine: {
    height: 3,
    background: "#009944",
    marginBottom: 12,
  },
  
  // Document Meta
  documentMeta: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: "1px solid #ddd",
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#009944",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    fontSize: 11,
  },
  metaLabel: {
    fontWeight: 700,
    color: "#333",
  },
  
  // Student Info Box
  studentInfoBox: {
    backgroundColor: "#f0f7f3",
    border: "2px solid #009944",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  studentInfoTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#009944",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  studentInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    fontSize: 11,
  },
  infoLabel: {
    display: "block",
    fontWeight: 700,
    color: "#333",
    marginBottom: 4,
  },
  infoValue: {
    color: "#666",
    lineHeight: 1.4,
  },
  
  // Section
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#009944",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "2px solid #009944",
    paddingBottom: 4,
  },
  
  // Table
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    marginBottom: 12,
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
  },
  thLeft: {
    textAlign: "left",
    borderBottom: "2px solid #009944",
    borderTop: "2px solid #009944",
    padding: "10px 6px",
    fontWeight: 700,
    color: "#009944",
  },
  thCenter: {
    textAlign: "center",
    borderBottom: "2px solid #009944",
    borderTop: "2px solid #009944",
    padding: "10px 6px",
    fontWeight: 700,
    color: "#009944",
  },
  thRight: {
    textAlign: "right",
    borderBottom: "2px solid #009944",
    borderTop: "2px solid #009944",
    padding: "10px 6px",
    fontWeight: 700,
    color: "#009944",
  },
  tdLeft: {
    padding: "8px 6px",
    borderBottom: "1px solid #eee",
  },
  tdCenter: {
    padding: "8px 6px",
    textAlign: "center",
    borderBottom: "1px solid #eee",
  },
  tdRight: {
    padding: "8px 6px",
    textAlign: "right",
    borderBottom: "1px solid #eee",
  },
  
  // Totals
  totalsWrap: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  totalsBox: {
    width: 300,
    border: "2px solid #009944",
    padding: 14,
    borderRadius: 6,
    backgroundColor: "#f0f7f3",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    margin: "8px 0",
    fontSize: 11,
  },
  totalLabel: {
    fontWeight: 700,
    color: "#555",
  },
  totalAmount: {
    fontWeight: 700,
    color: "#333",
  },
  hr: {
    height: 1,
    background: "#ddd",
    margin: "10px 0",
  },
  hrThick: {
    height: 2,
    background: "#009944",
    margin: "10px 0",
  },
  balanceRow: {
    display: "flex",
    justifyContent: "space-between",
    margin: "8px 0",
    fontSize: 13,
  },
  balanceLabel: {
    fontWeight: 800,
    color: "#009944",
  },
  balanceAmount: {
    fontWeight: 800,
    color: "#c41e3a",
    fontSize: 13,
  },
  
  // No Payments
  noPaymentsText: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
    padding: "10px 0",
  },
  
  // Remarks
  remarksBox: {
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    padding: 10,
    borderRadius: 4,
    fontSize: 11,
    color: "#333",
    lineHeight: 1.6,
    minHeight: 40,
  },
  
  // Payment Instructions
  paymentInstructions: {
    backgroundColor: "#f0f7f3",
    border: "1px solid #009944",
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: "#009944",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  instructionsList: {
    margin: "0 0 0 20px",
    padding: 0,
    fontSize: 10,
    color: "#444",
    lineHeight: 1.6,
  },
  
  // Footer
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTop: "2px solid #ddd",
    textAlign: "center",
    fontSize: 9,
    color: "#666",
  },
  footerText: {
    margin: "6px 0",
    fontStyle: "italic",
  },
  footerDate: {
    margin: "6px 0",
  },
};

export default Invoice;
