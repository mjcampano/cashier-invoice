import React, { useMemo, useState } from "react";
import { peso } from "../utils";

export default function DataEntry({
  data,
  setData,
  onGoPreview,
  uid,
  PROGRAMS,
  onApplySchoolTemplate,
  onSaveInvoice,
  onLoadLatest,
  saveStatus,
  saveDisabled,
  loadDisabled,
  apiStatus,
  apiMessage,
  apiCheckedAt,
  onCheckApi,
  invoiceList = [],
  invoiceListStatus,
  listDisabled,
  onRefreshInvoices,
  onLoadInvoice,
  onDeleteInvoice,
  onNewInvoice,
  onRunDeleteApiTest,
  deleteApiTestDisabled,
  isDeleteApiTestRunning,
  activeInvoiceId,
  activeInvoiceActionId,
}) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState({});
  const [expandedPaymentIds, setExpandedPaymentIds] = useState({});

  const subTotal = useMemo(
    () =>
      data.items.reduce(
        (sum, it) => sum + Number(it.qty || 0) * Number(it.unitPrice || 0),
        0
      ),
    [data.items]
  );

  const paymentsTotal = useMemo(
    () => data.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [data.payments]
  );

  const balance = subTotal - paymentsTotal;

  const apiStatusLabel =
    apiStatus === "ok"
      ? "Connected"
      : apiStatus === "checking"
        ? "Checking..."
        : apiStatus === "error"
          ? "Offline"
          : "Unknown";
  const hasSystemTools = Boolean(onCheckApi || onRunDeleteApiTest);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const setBusiness = (k, v) =>
    setData((d) => ({ ...d, business: { ...d.business, [k]: v } }));
  const setCustomer = (k, v) =>
    setData((d) => ({ ...d, customer: { ...d.customer, [k]: v } }));
  const setInvoice = (k, v) =>
    setData((d) => ({ ...d, invoice: { ...d.invoice, [k]: v } }));
  const setNotes = (v) => setData((d) => ({ ...d, notes: v }));

  const addItem = () => {
    const id = uid();
    setData((d) => ({
      ...d,
      items: [...d.items, { id, description: "", qty: 1, unitPrice: 0 }],
    }));
    setExpandedItemIds((prev) => ({ ...prev, [id]: true }));
  };

  const updateItem = (id, k, v) =>
    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, [k]: v } : it)),
    }));

  const removeItem = (id) => {
    setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));
    setExpandedItemIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addPayment = () => {
    const id = uid();
    setData((d) => ({
      ...d,
      payments: [
        ...d.payments,
        { id, date: "", reference: "", method: "Cash", amount: 0 },
      ],
    }));
    setExpandedPaymentIds((prev) => ({ ...prev, [id]: true }));
  };

  const updatePayment = (id, k, v) =>
    setData((d) => ({
      ...d,
      payments: d.payments.map((p) => (p.id === id ? { ...p, [k]: v } : p)),
    }));

  const removePayment = (id) => {
    setData((d) => ({ ...d, payments: d.payments.filter((p) => p.id !== id) }));
    setExpandedPaymentIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleItemDetails = (id) =>
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const togglePaymentDetails = (id) =>
    setExpandedPaymentIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const openNewEditor = () => {
    if (onNewInvoice) onNewInvoice();
    setIsEditorOpen(true);
  };

  const openLatestInEditor = async () => {
    if (!onLoadLatest) return;
    setIsEditorLoading(true);
    try {
      await onLoadLatest();
      setIsEditorOpen(true);
    } finally {
      setIsEditorLoading(false);
    }
  };

  const openEditEditor = async (id) => {
    if (!onLoadInvoice) return;
    setIsEditorOpen(true);
    setIsEditorLoading(true);
    try {
      await onLoadInvoice(id);
    } finally {
      setIsEditorLoading(false);
    }
  };

  const closeEditor = () => setIsEditorOpen(false);

  const goPreviewFromEditor = () => {
    setIsEditorOpen(false);
    onGoPreview();
  };

  return (
    <div className="dataEntryPage">
      <section className="card">
        <div className="financeSectionHeader">
          <div>
            <h3 className="h3">Finance Records</h3>
            <div className="smallMuted">
              Manage student invoices with a cleaner admin workflow.
            </div>
          </div>
        </div>

        <div className="financeToolbar">
          <div className="financeToolbarMain">
            <button
              className="actionBtn success financePrimaryAction"
              onClick={openNewEditor}
              type="button"
              disabled={saveDisabled || isEditorLoading}
            >
              Add Student
            </button>
            {onLoadLatest && (
              <button
                className="actionBtn"
                onClick={openLatestInEditor}
                type="button"
                disabled={loadDisabled || isEditorLoading}
              >
                Open Latest
              </button>
            )}
            {onRefreshInvoices && (
              <button
                className="actionBtn"
                onClick={onRefreshInvoices}
                type="button"
                disabled={listDisabled || isEditorLoading}
              >
                Refresh List
              </button>
            )}
          </div>

          {hasSystemTools && (
            <details className="financeToolsPanel">
              <summary className="financeToolsToggle">System Tools</summary>
              <div className="financeToolsBody">
                {onCheckApi && (
                  <button
                    className="actionBtn"
                    onClick={onCheckApi}
                    type="button"
                    disabled={apiStatus === "checking"}
                  >
                    Check API
                  </button>
                )}
                {onRunDeleteApiTest && (
                  <button
                    className="actionBtn warning"
                    onClick={onRunDeleteApiTest}
                    type="button"
                    disabled={deleteApiTestDisabled || isEditorLoading}
                  >
                    {isDeleteApiTestRunning ? "Testing Delete..." : "Test Delete API"}
                  </button>
                )}
              </div>
            </details>
          )}
        </div>

        {onCheckApi && (
          <div className="apiStatusRow">
            <div className={`apiStatusBadge ${apiStatus}`}>API: {apiStatusLabel}</div>
            {apiCheckedAt && (
              <div className="apiStatusTime">
                Last checked: {new Date(apiCheckedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {saveStatus && <div className="smallMuted">{saveStatus}</div>}
        {apiStatus === "error" && apiMessage && <div className="smallMuted">{apiMessage}</div>}
      </section>

      <section className="card">
        <h3 className="h3">Saved Students</h3>
        {invoiceListStatus && <div className="smallMuted">{invoiceListStatus}</div>}

        {invoiceList.length === 0 ? (
          <div className="smallMuted">No students saved yet. Click Add Student to create one.</div>
        ) : (
          <div className="savedInvoicesTableWrap">
            <table className="savedInvoicesTable">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Course</th>
                  <th>Term</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.map((entry) => {
                  const isBusy = activeInvoiceActionId === entry.id || isEditorLoading;
                  const isCurrent = activeInvoiceId === entry.id;

                  return (
                    <tr key={entry.id} className={isCurrent ? "activeRow" : ""}>
                      <td>{entry.customer?.name || "-"}</td>
                      <td>{entry.customer?.accountNo || "-"}</td>
                      <td>{entry.invoice?.cashierName || "-"}</td>
                      <td>{entry.invoice?.billingMonth || "-"}</td>
                      <td>{formatDateTime(entry.updatedAt)}</td>
                      <td>
                        <div className="savedInvoicesActions">
                          {onLoadInvoice && (
                            <button
                              className="actionBtn tableActionBtn"
                              type="button"
                              onClick={() => openEditEditor(entry.id)}
                              disabled={listDisabled || isBusy}
                            >
                              {isBusy ? "Loading..." : "Edit"}
                            </button>
                          )}
                          {onDeleteInvoice && (
                            <button
                              className="dangerBtn tableActionBtn"
                              type="button"
                              onClick={() => onDeleteInvoice(entry.id)}
                              disabled={listDisabled || isBusy}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isEditorOpen && (
        <div className="invoiceEditorModalBackdrop" onClick={closeEditor}>
          <div className="invoiceEditorModal" onClick={(e) => e.stopPropagation()}>
            <div className="invoiceEditorHeader">
              <div>
                <h3 className="invoiceEditorTitle">
                  {activeInvoiceId ? "Edit Student Invoice" : "New Student Invoice"}
                </h3>
                <div className="smallMuted">
                  Fill out the student profile, invoice details, items, and payments.
                </div>
              </div>
              <div className="invoiceEditorHeaderActions">
                <button className="actionBtn" onClick={closeEditor} type="button">
                  Back to Records
                </button>
              </div>
            </div>

            {isEditorLoading ? (
              <div className="invoiceEditorLoading">Loading invoice data...</div>
            ) : (
              <div className="invoiceEditorBody">
                <section className="card">
                  <h3 className="h3">Business</h3>
                  <FormRow label="Business Name">
                    <input
                      className="input"
                      value={data.business.name}
                      onChange={(e) => setBusiness("name", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Address">
                    <input
                      className="input"
                      value={data.business.address}
                      onChange={(e) => setBusiness("address", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Phone">
                    <input
                      className="input"
                      value={data.business.phone}
                      onChange={(e) => setBusiness("phone", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="TIN">
                    <input
                      className="input"
                      value={data.business.tin}
                      onChange={(e) => setBusiness("tin", e.target.value)}
                    />
                  </FormRow>

                  <hr className="hr" />

                  <h3 className="h3">Customer</h3>
                  <FormRow label="Student Name">
                    <input
                      className="input"
                      value={data.customer.name}
                      onChange={(e) => setCustomer("name", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Address">
                    <input
                      className="input"
                      value={data.customer.address}
                      onChange={(e) => setCustomer("address", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Contact">
                    <input
                      className="input"
                      value={data.customer.contact}
                      onChange={(e) => setCustomer("contact", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Student ID">
                    <input
                      className="input"
                      value={data.customer.accountNo}
                      onChange={(e) => setCustomer("accountNo", e.target.value)}
                    />
                  </FormRow>

                  <hr className="hr" />

                  <h3 className="h3">Invoice Info</h3>
                  <FormRow label="Billing Month">
                    <input
                      className="input"
                      value={data.invoice.billingMonth}
                      onChange={(e) => setInvoice("billingMonth", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Statement #">
                    <input
                      className="input"
                      value={data.invoice.statementNo}
                      onChange={(e) => setInvoice("statementNo", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Date Issued">
                    <input
                      className="input"
                      type="date"
                      value={data.invoice.dateIssued}
                      onChange={(e) => setInvoice("dateIssued", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Due Date">
                    <input
                      className="input"
                      type="date"
                      value={data.invoice.dueDate}
                      onChange={(e) => setInvoice("dueDate", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Course">
                    <input
                      className="input"
                      value={data.invoice.cashierName}
                      onChange={(e) => setInvoice("cashierName", e.target.value)}
                    />
                  </FormRow>
                  <FormRow label="Major">
                    <input
                      className="input"
                      value={data.invoice.cashierId}
                      onChange={(e) => setInvoice("cashierId", e.target.value)}
                    />
                  </FormRow>

                  <hr className="hr" />

                  <h3 className="h3">Notes</h3>
                  <textarea
                    className="input"
                    style={{ minHeight: 90, resize: "vertical" }}
                    value={data.notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </section>

                <section className="card">
                  <h3 className="h3">School Program Template</h3>
                  {PROGRAMS && onApplySchoolTemplate && (
                    <>
                      <FormRow label="Program">
                        <select
                          className="input"
                          value={data.school?.programKey || "MA"}
                          onChange={(e) =>
                            setData((d) => ({
                              ...d,
                              school: {
                                ...d.school,
                                programKey: e.target.value,
                                trackKey: Object.keys(PROGRAMS[e.target.value].tracks)[0],
                              },
                            }))
                          }
                        >
                          {Object.entries(PROGRAMS).map(([key, program]) => (
                            <option key={key} value={key}>
                              {program.label}
                            </option>
                          ))}
                        </select>
                      </FormRow>

                      <FormRow label="Track">
                        <select
                          className="input"
                          value={data.school?.trackKey || ""}
                          onChange={(e) =>
                            setData((d) => ({
                              ...d,
                              school: { ...d.school, trackKey: e.target.value },
                            }))
                          }
                        >
                          {data.school?.programKey &&
                            PROGRAMS[data.school.programKey]?.tracks &&
                            Object.entries(PROGRAMS[data.school.programKey].tracks).map(
                              ([key, track]) => (
                                <option key={key} value={key}>
                                  {track.label}
                                </option>
                              )
                            )}
                        </select>
                      </FormRow>

                      <div style={{ marginTop: 8 }}>
                        <button className="smallBtn" onClick={onApplySchoolTemplate} type="button">
                          Apply Template
                        </button>
                      </div>
                    </>
                  )}

                  <hr className="hr" />

                  <h3 className="h3">Charges</h3>
                  <div className="financeSummaryGrid">
                    <div className="financeSummaryCard">
                      <div className="financeSummaryLabel">Subtotal</div>
                      <div className="financeSummaryValue">{peso(subTotal)}</div>
                    </div>
                    <div className="financeSummaryCard">
                      <div className="financeSummaryLabel">Payments</div>
                      <div className="financeSummaryValue">{peso(paymentsTotal)}</div>
                    </div>
                    <div className={`financeSummaryCard ${balance > 0 ? "isDue" : "isSettled"}`}>
                      <div className="financeSummaryLabel">Balance</div>
                      <div className="financeSummaryValue">{peso(balance)}</div>
                    </div>
                  </div>

                  <div className="dataEntryToolbar financeActionBar">
                    <button className="smallBtn" onClick={addItem} type="button">
                      Add Item
                    </button>
                    {onSaveInvoice && (
                      <button
                        className="smallBtn"
                        onClick={onSaveInvoice}
                        type="button"
                        disabled={saveDisabled}
                      >
                        Save Invoice
                      </button>
                    )}
                    {onNewInvoice && (
                      <button
                        className="actionBtn warning"
                        onClick={onNewInvoice}
                        type="button"
                        disabled={saveDisabled}
                      >
                        Reset Form
                      </button>
                    )}
                    <button
                      className="actionBtn"
                      onClick={goPreviewFromEditor}
                      type="button"
                    >
                      Preview
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {data.items.map((it, index) => {
                      const amount = Number(it.qty || 0) * Number(it.unitPrice || 0);
                      const isExpanded = Boolean(expandedItemIds[it.id]);

                      return (
                      <div key={it.id} className="rowCard">
                        <div className="compactRowHead">
                          <div>
                            <div className="compactRowTitle">
                              {it.description || `Charge ${index + 1}`}
                            </div>
                            <div className="compactRowMeta">
                              Qty {it.qty || 0} x {peso(Number(it.unitPrice || 0))}
                            </div>
                          </div>
                          <div className="compactRowAmountBlock">
                            <div className="smallMuted">Amount</div>
                            <div className="compactRowAmount">{peso(amount)}</div>
                          </div>
                        </div>

                        <div className="compactRowActions">
                          <button
                            className="actionBtn"
                            onClick={() => toggleItemDetails(it.id)}
                            type="button"
                          >
                            {isExpanded ? "Hide Details" : "Show Details"}
                          </button>
                          <button
                            className="dangerBtn"
                            onClick={() => removeItem(it.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="compactRowDetails">
                            <FormRow label="Description">
                              <input
                                className="input"
                                value={it.description}
                                onChange={(e) => updateItem(it.id, "description", e.target.value)}
                              />
                            </FormRow>

                            <div className="row3">
                              <FormRow label="Qty">
                                <input
                                  className="input"
                                  type="number"
                                  value={it.qty}
                                  onChange={(e) => updateItem(it.id, "qty", e.target.value)}
                                />
                              </FormRow>
                              <FormRow label="Unit Price">
                                <input
                                  className="input"
                                  type="number"
                                  value={it.unitPrice}
                                  onChange={(e) => updateItem(it.id, "unitPrice", e.target.value)}
                                />
                              </FormRow>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>

                  <hr className="hr" />

                  <h3 className="h3">Payments</h3>
                  <div className="dataEntryToolbar financeActionBar">
                    <button className="smallBtn" onClick={addPayment} type="button">
                      Add Payment
                    </button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {data.payments.map((payment, index) => {
                      const isExpanded = Boolean(expandedPaymentIds[payment.id]);

                      return (
                      <div key={payment.id} className="rowCard">
                        <div className="compactRowHead">
                          <div>
                            <div className="compactRowTitle">
                              {payment.reference || `Payment ${index + 1}`}
                            </div>
                            <div className="compactRowMeta">
                              {payment.method || "Cash"} {payment.date ? `- ${payment.date}` : ""}
                            </div>
                          </div>
                          <div className="compactRowAmountBlock">
                            <div className="smallMuted">Amount</div>
                            <div className="compactRowAmount">
                              {peso(Number(payment.amount || 0))}
                            </div>
                          </div>
                        </div>

                        <div className="compactRowActions">
                          <button
                            className="actionBtn"
                            onClick={() => togglePaymentDetails(payment.id)}
                            type="button"
                          >
                            {isExpanded ? "Hide Details" : "Show Details"}
                          </button>
                          <button
                            className="dangerBtn"
                            onClick={() => removePayment(payment.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="compactRowDetails">
                            <div className="row3">
                              <FormRow label="Date">
                                <input
                                  className="input"
                                  type="date"
                                  value={payment.date}
                                  onChange={(e) =>
                                    updatePayment(payment.id, "date", e.target.value)
                                  }
                                />
                              </FormRow>
                              <FormRow label="Reference">
                                <input
                                  className="input"
                                  value={payment.reference}
                                  onChange={(e) =>
                                    updatePayment(payment.id, "reference", e.target.value)
                                  }
                                />
                              </FormRow>
                              <FormRow label="Method">
                                <select
                                  className="input"
                                  value={payment.method}
                                  onChange={(e) =>
                                    updatePayment(payment.id, "method", e.target.value)
                                  }
                                >
                                  <option>Cash</option>
                                  <option>GCash</option>
                                  <option>Bank Transfer</option>
                                  <option>Card</option>
                                </select>
                              </FormRow>
                            </div>

                            <FormRow label="Amount">
                              <input
                                className="input"
                                type="number"
                                value={payment.amount}
                                onChange={(e) =>
                                  updatePayment(payment.id, "amount", e.target.value)
                                }
                              />
                            </FormRow>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <label className="formRow">
      <div className="label">{label}</div>
      <div>{children}</div>
    </label>
  );
}

