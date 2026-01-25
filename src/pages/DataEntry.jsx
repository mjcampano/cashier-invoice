import React, { useMemo } from "react";
import { peso, uid } from "../utils";

export default function DataEntry({
  data,
  setData,
  onGoPreview,
  uid,
  PROGRAMS,
  onApplySchoolTemplate,
}) {
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

  const setBusiness = (k, v) =>
    setData((d) => ({ ...d, business: { ...d.business, [k]: v } }));
  const setCustomer = (k, v) =>
    setData((d) => ({ ...d, customer: { ...d.customer, [k]: v } }));
  const setInvoice = (k, v) =>
    setData((d) => ({ ...d, invoice: { ...d.invoice, [k]: v } }));
  const setNotes = (v) => setData((d) => ({ ...d, notes: v }));

  const addItem = () =>
    setData((d) => ({
      ...d,
      items: [...d.items, { id: uid(), description: "", qty: 1, unitPrice: 0 }],
    }));

  const updateItem = (id, k, v) =>
    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, [k]: v } : it)),
    }));

  const removeItem = (id) =>
    setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));

  const addPayment = () =>
    setData((d) => ({
      ...d,
      payments: [
        ...d.payments,
        { id: uid(), date: "", reference: "", method: "Cash", amount: 0 },
      ],
    }));

  const updatePayment = (id, k, v) =>
    setData((d) => ({
      ...d,
      payments: d.payments.map((p) => (p.id === id ? { ...p, [k]: v } : p)),
    }));

  const removePayment = (id) =>
    setData((d) => ({ ...d, payments: d.payments.filter((p) => p.id !== id) }));

  return (
    <div className="grid">
      {/* Left */}
      <section className="card">
        <h3 className="h3">Business</h3>
        <FormRow label="Business Name">
          <input className="input" value={data.business.name} onChange={(e) => setBusiness("name", e.target.value)} />
        </FormRow>
        <FormRow label="Address">
          <input className="input" value={data.business.address} onChange={(e) => setBusiness("address", e.target.value)} />
        </FormRow>
        <FormRow label="Phone">
          <input className="input" value={data.business.phone} onChange={(e) => setBusiness("phone", e.target.value)} />
        </FormRow>
        <FormRow label="TIN">
          <input className="input" value={data.business.tin} onChange={(e) => setBusiness("tin", e.target.value)} />
        </FormRow>

        <hr className="hr" />

        <h3 className="h3">Customer</h3>
        <FormRow label="Customer Name">
          <input className="input" value={data.customer.name} onChange={(e) => setCustomer("name", e.target.value)} />
        </FormRow>
        <FormRow label="Address">
          <input className="input" value={data.customer.address} onChange={(e) => setCustomer("address", e.target.value)} />
        </FormRow>
        <FormRow label="Contact">
          <input className="input" value={data.customer.contact} onChange={(e) => setCustomer("contact", e.target.value)} />
        </FormRow>
        <FormRow label="Account/Unit">
          <input className="input" value={data.customer.accountNo} onChange={(e) => setCustomer("accountNo", e.target.value)} />
        </FormRow>

        <hr className="hr" />

        <h3 className="h3">Invoice Info</h3>
        <FormRow label="Billing Month">
          <input className="input" value={data.invoice.billingMonth} onChange={(e) => setInvoice("billingMonth", e.target.value)} />
        </FormRow>
        <FormRow label="Statement #">
          <input className="input" value={data.invoice.statementNo} onChange={(e) => setInvoice("statementNo", e.target.value)} />
        </FormRow>
        <FormRow label="Date Issued">
          <input className="input" type="date" value={data.invoice.dateIssued} onChange={(e) => setInvoice("dateIssued", e.target.value)} />
        </FormRow>
        <FormRow label="Due Date">
          <input className="input" type="date" value={data.invoice.dueDate} onChange={(e) => setInvoice("dueDate", e.target.value)} />
        </FormRow>
        <FormRow label="Cashier Name">
          <input className="input" value={data.invoice.cashierName} onChange={(e) => setInvoice("cashierName", e.target.value)} />
        </FormRow>
        <FormRow label="Cashier ID">
          <input className="input" value={data.invoice.cashierId} onChange={(e) => setInvoice("cashierId", e.target.value)} />
        </FormRow>

        <hr className="hr" />

        <h3 className="h3">Notes</h3>
        <textarea className="input" style={{ minHeight: 80, resize: "vertical" }} value={data.notes} onChange={(e) => setNotes(e.target.value)} />
      </section>

      {/* Right */}
      <section className="card">
        <h3 className="h3">School Program Template</h3>
        {PROGRAMS && onApplySchoolTemplate && (
          <>
            <FormRow label="Program">
              <select
                className="input"
                value={data.school?.programKey || "MA"}
                onChange={(e) => setData((d) => ({ ...d, school: { ...d.school, programKey: e.target.value, trackKey: Object.keys(PROGRAMS[e.target.value].tracks)[0] } }))}
              >
                {Object.entries(PROGRAMS).map(([key, prog]) => (
                  <option key={key} value={key}>{prog.label}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Track">
              <select
                className="input"
                value={data.school?.trackKey || ""}
                onChange={(e) => setData((d) => ({ ...d, school: { ...d.school, trackKey: e.target.value } }))}
              >
                {data.school?.programKey && PROGRAMS[data.school.programKey]?.tracks && 
                  Object.entries(PROGRAMS[data.school.programKey].tracks).map(([key, track]) => (
                    <option key={key} value={key}>{track.label}</option>
                  ))}
              </select>
            </FormRow>
            <div style={{ marginTop: 8 }}>
              <button className="smallBtn" onClick={onApplySchoolTemplate} type="button">Apply Template</button>
            </div>
          </>
        )}

        <hr className="hr" />

        <h3 className="h3">Charges (Items)</h3>

        <div className="smallMuted">
          Subtotal: <b>{peso(subTotal)}</b> • Payments: <b>{peso(paymentsTotal)}</b> • Balance:{" "}
          <b>{peso(balance)}</b>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="smallBtn" onClick={addItem} type="button">+ Add Item</button>
          <button className="smallBtn" onClick={onGoPreview} type="button">Go to Preview →</button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {data.items.map((it) => (
            <div key={it.id} className="rowCard">
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

                <div style={{ alignSelf: "end", textAlign: "right" }}>
                  <div className="smallMuted">Amount</div>
                  <div style={{ fontWeight: 800 }}>
                    {peso(Number(it.qty || 0) * Number(it.unitPrice || 0))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="dangerBtn" onClick={() => removeItem(it.id)} type="button">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <hr className="hr" />

        <h3 className="h3">Payments</h3>
        <button className="smallBtn" onClick={addPayment} type="button">+ Add Payment</button>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {data.payments.map((p) => (
            <div key={p.id} className="rowCard">
              <div className="row3">
                <FormRow label="Date">
                  <input
                    className="input"
                    type="date"
                    value={p.date}
                    onChange={(e) => updatePayment(p.id, "date", e.target.value)}
                  />
                </FormRow>
                <FormRow label="Reference">
                  <input
                    className="input"
                    value={p.reference}
                    onChange={(e) => updatePayment(p.id, "reference", e.target.value)}
                  />
                </FormRow>
                <FormRow label="Method">
                  <select
                    className="input"
                    value={p.method}
                    onChange={(e) => updatePayment(p.id, "method", e.target.value)}
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
                  value={p.amount}
                  onChange={(e) => updatePayment(p.id, "amount", e.target.value)}
                />
              </FormRow>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="dangerBtn" onClick={() => removePayment(p.id)} type="button">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
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
