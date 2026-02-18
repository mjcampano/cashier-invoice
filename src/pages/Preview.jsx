import React from "react";
import Invoice from "../components/Invoice";

export default function Preview({ invoiceRef, data }) {
  const stripId = (row) => {
    const { id: _id, ...rest } = row;
    return rest;
  };

  return (
    <div className="previewWrap">
      <Invoice
        ref={invoiceRef}
        business={data.business}
        customer={data.customer}
        invoice={data.invoice}
        items={data.items.map(stripId)}
        payments={data.payments.map(stripId)}
        notes={data.notes}
      />
    </div>
  );
}
