import React, { useState, useRef, useEffect } from "react"
import { fmtDate, fmtId } from "../appUtils.js"
import { exportPDFInternal, exportPDFCustomer, exportPDFSummary } from "../pdfExport.js"

let _pdfMod = null;
const getPDF = () => { if (!_pdfMod) _pdfMod = import("../PDFTemplates.jsx"); return _pdfMod; };

export function PrintEmailPage({ project, rooms, preparedBy, onBack, onEmail }) {
  const [pdfStatus,  setPdfStatus]  = useState("idle");
  const [pdfError,   setPdfError]   = useState(null);

  const [pdfStatus2, setPdfStatus2] = useState("idle");
  const [pdfError2,  setPdfError2]  = useState(null);

  const [pdfStatus3, setPdfStatus3] = useState("idle");
  const [pdfError3,  setPdfError3]  = useState(null);

  const [viewer, setViewer] = useState({ open: false, url: null, label: "" });
  const [viewerBusy, setViewerBusy] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const mounted = useRef(true);
  const viewerUrlRef = useRef(null);
  const viewerPanelRef = useRef(null);

  useEffect(() => { return () => { mounted.current = false; if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current) } }, []);

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

  const handleSummary = () => {
    setPdfError3(null);
    exportPDFSummary(project, rooms, preparedBy, (status, errMsg) => {
      setPdfStatus3(status);
      if (errMsg) setPdfError3(errMsg);
    });
  };

  const handlePreview = async (type) => {
    if (viewer.open && viewer.label === type) {
      if (viewerUrlRef.current) { URL.revokeObjectURL(viewerUrlRef.current); viewerUrlRef.current = null; }
      setViewer({ open: false, url: null, label: "" });
      return;
    }
    setViewerBusy(type);
    setPreviewError(null);
    try {
      const mod = await getPDF();
      const utils = await import("../appUtils.js");
      const withPricing = type === "internal";
      const opts = {
        calcCabinetry: utils.calcCabinetry,
        calcUpgrades: utils.calcUpgrades,
        calcCountertops: utils.calcCountertops,
        calcFinishing: utils.calcFinishing,
        calcInstall: utils.calcInstall,
        preparedBy,
        ...(withPricing ? { pricing: utils.PRICING } : {}),
      };

      const fnName = type === "internal" ? "buildInternalPDFBlob" : type === "customer" ? "buildCustomerPDFBlob" : "buildSummaryPDFBlob";
      const blob = await mod[fnName](project, rooms, opts);

      if (!blob) throw new Error("PDF generation returned empty");
      if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current);
      const url = URL.createObjectURL(blob);
      viewerUrlRef.current = url;
      if (mounted.current) {
        setViewer({ open: true, url, label: type });
        setTimeout(() => { viewerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
      }
    } catch (err) {
      console.error("PDF preview error:", err);
      if (mounted.current) setPreviewError(err?.message || "Preview failed");
    } finally {
      if (mounted.current) setViewerBusy(null);
    }
  };

  const actions = [
    {
      icon: "📄",
      title: "Internal Quote",
      key: "internal",
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
      key: "customer",
      desc: "Client-facing quote with totals and project details — ready to share.",
      btnLabel: { idle: "Download PDF", generating: "⳿ Preparing…", done: "Download Again", error: "⚠ Try Again" }[pdfStatus2] || "Download PDF",
      busy: pdfStatus2 === "generating",
      err: pdfError2,
      onClick: handleCustomer,
      btnClass: "btn-gold",
    },
    {
      icon: "📑",
      title: "Summary Download",
      key: "summary",
      desc: "One-page overview with room totals, delivery, tax, and grand total — no per-room breakout.",
      btnLabel: { idle: "Download PDF", generating: "⳿ Preparing…", done: "Download Again", error: "⚠ Try Again" }[pdfStatus3] || "Download PDF",
      busy: pdfStatus3 === "generating",
      err: pdfError3,
      onClick: handleSummary,
      btnClass: "btn-gold",
    },
  ];

  const viewerTitle = { internal: "Internal Quote", customer: "Customer Quote", summary: "Summary" }[viewer.label] || "";

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Save Quote</div>
        <div className="gold-rule" />
        <div className="page-subtitle">{project.name} · {fmtDate(project.bidDate)} · {fmtId(project.id)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginTop: 8 }}>
        {actions.map(({ icon, title, key, desc, btnLabel, busy, err, onClick, btnClass }) => {
          const isViewing = viewer.open && viewer.label === key;
          const prevBusy = viewerBusy === key;
          return (
            <div key={title} className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 20px" }}>
              <div style={{ fontSize: 32 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--char)", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
              </div>
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  className={`btn btn-outline${isViewing ? " btn-gold" : ""}`}
                  onClick={() => handlePreview(key)}
                  disabled={prevBusy}
                  style={{ opacity: prevBusy ? 0.6 : 1, width: "100%" }}
                >
                  {prevBusy ? "⳿ Loading…" : isViewing ? "Hide Preview" : "Preview"}
                </button>
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
          );
        })}
      </div>

      {previewError && (
        <div style={{ marginTop: 12, padding: "10px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>
          Preview error: {previewError}
        </div>
      )}

      {viewer.open && viewer.url && (
        <div ref={viewerPanelRef} className="pv-pdf-viewer" style={{ marginTop: 20 }}>
          <div className="pv-pdf-toolbar">
            <span className="pv-pdf-toolbar-label">{viewerTitle}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={viewer.url} download={`${project.name || "quote"}-${viewer.label}.pdf`} className="btn btn-sm">Download</a>
              <button className="btn btn-sm" onClick={() => { if (viewerUrlRef.current) { URL.revokeObjectURL(viewerUrlRef.current); viewerUrlRef.current = null; } setViewer({ open: false, url: null, label: "" }) }}>Close</button>
            </div>
          </div>
          <div className="pv-pdf-wrap"><iframe src={viewer.url} className="pv-pdf-frame" title="PDF Preview" /></div>
        </div>
      )}

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-outline" onClick={onBack}>← Back to Summary</button>
      </div>
    </div>
  );
}
