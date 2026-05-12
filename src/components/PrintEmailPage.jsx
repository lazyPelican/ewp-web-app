import React, { useState } from "react"
import { fmtDate, fmtId } from "../appUtils.js"
import { exportPDFInternal, exportPDFCustomer } from "../pdfExport.js"

export function PrintEmailPage({ project, rooms, preparedBy, onBack, onEmail }) {
  const [pdfStatus,  setPdfStatus]  = useState("idle");
  const [pdfError,   setPdfError]   = useState(null);
  const [pdfStatus2, setPdfStatus2] = useState("idle");
  const [pdfError2,  setPdfError2]  = useState(null);

  const handleInternal = () => {
    setPdfError(null);
    exportPDFInternal(project, rooms, preparedBy, (status, errMsg) => {
      setPdfStatus(status);
      if (errMsg) setPdfError(errMsg);
    });
  };

  const handleCustomer = () => {
    setPdfError2(null);
    exportPDFCustomer(project, rooms, preparedBy, (status, errMsg) => {
      setPdfStatus2(status);
      if (errMsg) setPdfError2(errMsg);
    });
  };

  const actions = [
    {
      icon: "📄",
      title: "Internal Quote",
      desc: "Full breakdown with costs, labour, and pricing details for internal use.",
      btnLabel: { idle: "Download PDF", generating: "⳿ Preparing…", done: "Download Again", error: "⚠ Try Again" }[pdfStatus] || "Download PDF",
      busy: pdfStatus === "generating",
      err: pdfError,
      onClick: handleInternal,
      btnClass: "btn-gold",
    },
    {
      icon: "📋",
      title: "Customer Quote",
      desc: "Client-facing quote with totals and project details — ready to share.",
      btnLabel: { idle: "Download PDF", generating: "⳿ Preparing…", done: "Download Again", error: "⚠ Try Again" }[pdfStatus2] || "Download PDF",
      busy: pdfStatus2 === "generating",
      err: pdfError2,
      onClick: handleCustomer,
      btnClass: "btn-gold",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Print & Email</div>
        <div className="gold-rule" />
        <div className="page-subtitle">{project.name} · {fmtDate(project.bidDate)} · {fmtId(project.id)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginTop: 8 }}>
        {actions.map(({ icon, title, desc, btnLabel, busy, err, onClick, btnClass }) => (
          <div key={title} className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 20px" }}>
            <div style={{ fontSize: 32 }}>{icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--char)", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                className={`btn ${btnClass}`}
                onClick={onClick}
                disabled={busy}
                style={{ opacity: busy ? 0.6 : 1, width: "100%" }}
              >
                {btnLabel}
              </button>
              {err && <span style={{ fontSize: 11, color: "var(--red, #C0392B)" }}>{err}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-outline" onClick={onBack}>← Back to Summary</button>
      </div>
    </div>
  );
}
