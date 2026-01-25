import React from "react";
import Invoice from "../components/Invoice";

export default function Preview({ invoiceRef, data }) {
  return (
    <div className="previewWrap">
      <Invoice
        ref={invoiceRef}
        business={data.business}
        customer={data.customer}
        invoice={data.invoice}
        items={data.items.map(({ id, ...rest }) => rest)}
        payments={data.payments.map(({ id, ...rest }) => rest)}
        notes={data.notes}
      />
    </div>
  );
}
