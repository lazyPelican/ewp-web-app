import React, { useState, useRef, useEffect } from "react"
import { PRICING, fmt, fmtDate, fmtId, calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall } from "../appUtils.js"

export function SummaryPage({ project, rooms, onBack, onSave, onNext, preparedBy }) {
  const [saving, setSaving]           = useState(false);
  const [saveConfirmed, setSaveConfirmed] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveConfirmed(false);
    await onSave();
    setSaving(false);
    setSaveConfirmed(true);
  };

  // Reset saved confirmation when user edits project or rooms after saving
  const _initialSaveRef = useRef(true);
  useEffect(() => {
    if (_initialSaveRef.current) { _initialSaveRef.current = false; return; }
    setSaveConfirmed(false);
  }, [project, rooms]);

  const handleSaveAndNext = async () => {
    await handleSave();
    onNext();
  };
  const roomTotals = rooms.map(r => {
    const cab = calcCabinetry(r.cabinetry);
    const upg = calcUpgrades(r.upgrades);
    const ctp = calcCountertops(r.countertops);
    const fin = calcFinishing(r.finishing);
    const inst = calcInstall(r.install, cab);
    return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst };
  });

  const grandCab  = roomTotals.reduce((s, r) => s + r.cab, 0);
  const grandUpg  = roomTotals.reduce((s, r) => s + r.upg, 0);
  const grandCtp  = roomTotals.reduce((s, r) => s + r.ctp, 0);
  const grandFin  = roomTotals.reduce((s, r) => s + r.fin, 0);
  const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0);
  const delivery  = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0);
  const subtotalBeforeTax = grandCab + grandUpg + grandCtp + grandFin + grandInst + delivery;
  const taxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled;
  const taxRate    = Number.isFinite(parseFloat(project.taxRate)) ? parseFloat(project.taxRate) : 8.53;
  const taxAmt     = taxEnabled ? subtotalBeforeTax * (taxRate / 100) : 0;
  const grandTotal = subtotalBeforeTax + taxAmt;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <div className="page-title">Estimate Summary</div>
            <div className="gold-rule" />
            <div className="page-subtitle">{project.name} · {fmtDate(project.bidDate)} · ID: {fmtId(project.id)}</div>
          </div>
        </div>
      </div>

      {/* Project info bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body summary-project-grid">
          {[
            ["Project", project.name],
            ["Address", project.address],
            ["Contact", project.contactName || "–"],
            ["Bid Date", fmtDate(project.bidDate)],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="field-label">{l}</div>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-room summary table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-banner">PROJECT SUMMARY — ALL ROOMS</div>
        <div className="scrollable">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th className="num-cell">Cabinetry</th>
                <th className="num-cell">Countertops</th>
                <th className="num-cell">Finishing</th>
                <th className="num-cell">Installation</th>
                <th className="num-cell" style={{ color: "var(--gold)" }}>Room Total</th>
              </tr>
            </thead>
            <tbody>
              {roomTotals.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.name || `Room ${i + 1}`}</td>
                  <td className="num-cell">{fmt(r.cab + r.upg)}</td>
                  <td className="num-cell">{fmt(r.ctp)}</td>
                  <td className="num-cell">{fmt(r.fin)}</td>
                  <td className="num-cell">{fmt(r.inst)}</td>
                  <td className="num-cell serif-value">{fmt(r.total)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td className="label-upper">Totals</td>
                <td className="num-cell">{fmt(grandCab + grandUpg)}</td>
                <td className="num-cell">{fmt(grandCtp)}</td>
                <td className="num-cell">{fmt(grandFin)}</td>
                <td className="num-cell">{fmt(grandInst)}</td>
                <td className="num-cell">{fmt(grandCab + grandUpg + grandCtp + grandFin + grandInst)}</td>
              </tr>
              {delivery > 0 && (
                <tr className="total-row">
                  <td colSpan={5} className="label-upper">
                    Delivery{project.deliveryNotes ? ` — ${project.deliveryNotes}` : ""}
                  </td>
                  <td className="num-cell">{fmt(delivery)}</td>
                </tr>
              )}
              {taxEnabled && (
                <tr className="total-row">
                  <td colSpan={5} className="label-upper">
                    Estimated Tax ({taxRate}%)
                  </td>
                  <td className="num-cell">{fmt(taxAmt)}</td>
                </tr>
              )}
              <tr className="total-row" style={{ borderTop: "2px solid var(--gold)" }}>
                <td colSpan={5} className="serif-total">
                  Grand Total
                </td>
                <td className="num-cell serif-value">{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-room detail */}
      {rooms.map((room, ri) => {
        const rt = roomTotals[ri];
        const cabItems = room.cabinetry.filter(i => i.product && (parseFloat(i.qty) || 0) !== 0);
        const upgItems = room.upgrades.filter(i => i.upgrade && (parseFloat(i.qty) || 0) !== 0);
        const ctpItems = (room.countertops || []).filter(i => i.product && (parseFloat(i.qty) || 0) !== 0);
        const finItems = room.finishing.filter(i => i.type && (parseFloat(i.lf) || 0) !== 0);
        const cabTotal = rt.cab;
        return (
          <div className="report-room" key={room.id}>
            <div className="card">
              <div className="card-header" style={{ justifyContent: "space-between" }}>
                <span className="card-title">{room.name || `ROOM ${ri + 1}`}</span>
                <span className="serif-value-lg">{fmt(rt.total)}</span>
              </div>
              <div className="card-body">
                {cabItems.length > 0 && (
                  <div className="report-section">
                    <div className="report-section-title">Cabinetry</div>
                    {cabItems.map((item, i) => {
                      const prod = PRICING.woodwork.find(w => w.name === item.product);
                      const con = PRICING.construction.find(c => c.name === item.construction);
                      const wood = PRICING.wood.find(w => w.name === item.wood);
                      const sp = prod ? prod.price * (1 + (con?.premium || 0)) * (1 + (wood?.premium || 0)) : 0;
                      const qty = parseFloat(item.qty) || 0;
                      const adj = parseFloat(item.adjPct) || 0;
                      return (
                        <div className="report-line" key={i}>
                          <span>{item.product} — {item.construction} / {item.wood} × {qty}</span>
                          <span>{fmt(sp * qty * (1 + adj / 100))}</span>
                        </div>
                      );
                    })}
                    <div className="report-line report-line-total"><span>Cabinetry Total</span><span>{fmt(rt.cab)}</span></div>
                  </div>
                )}
                {upgItems.length > 0 && (
                  <div className="report-section">
                    <div className="report-section-title">Upgrades</div>
                    {upgItems.map((item, i) => {
                      const qty = parseFloat(item.qty) || 0;
                      return (
                        <div className="report-line" key={i}>
                          <span>{item.upgrade} × {qty}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {ctpItems.length > 0 && (
                  <div className="report-section">
                    <div className="report-section-title">Countertops</div>
                    {ctpItems.map((item, i) => {
                      const ctp = PRICING.countertops?.find(c => c.name === item.product);
                      const qty = parseFloat(item.qty) || 0;
                      const adj = parseFloat(item.adjPct) || 0;
                      return (
                        <div className="report-line" key={i}>
                          <span>{item.product} × {qty}</span>
                          <span>{fmt((ctp?.price || 0) * qty * (1 + adj / 100))}</span>
                        </div>
                      );
                    })}
                    <div className="report-line report-line-total"><span>Countertops Total</span><span>{fmt(rt.ctp)}</span></div>
                  </div>
                )}
                {finItems.length > 0 && (
                  <div className="report-section">
                    <div className="report-section-title">Finishing</div>
                    {finItems.map((item, i) => {
                      const fin = PRICING.finishing.find(f => f.name === item.type);
                      const lf = parseFloat(item.lf) || 0;
                      const adj = parseFloat(item.adjPct) || 0;
                      return (
                        <div className="report-line" key={i}>
                          <span>{item.type} — {lf} LF @ {fmt(fin?.pricePerLF || 0)}/LF</span>
                          <span>{fmt((fin?.pricePerLF || 0) * lf * (1 + adj / 100))}</span>
                        </div>
                      );
                    })}
                    <div className="report-line report-line-total"><span>Finishing Total</span><span>{fmt(rt.fin)}</span></div>
                  </div>
                )}
                {room.install.type && (
                  <div className="report-section">
                    <div className="report-section-title">Installation</div>
                    <div className="report-line">
                      <span>{room.install.type}{room.install.metric ? ` × ${room.install.metric} hrs` : ""}</span>
                      <span>{fmt(rt.inst)}</span>
                    </div>
                    <div className="report-line report-line-total"><span>Install Total</span><span>{fmt(rt.inst)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Grand Total */}
      <div className="grand-total grand-total-float">
        <div className="grand-total-label">GRAND TOTAL</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: 4, display: "flex", flexWrap: "wrap", gap: "0 10px", justifyContent: "center" }}>
          <span>Materials {fmt(grandCab + grandUpg + grandCtp + grandFin)}</span>
          {grandInst > 0 && <span>+ Installation {fmt(grandInst)}</span>}
          {delivery > 0 && <span>+ Delivery {fmt(delivery)}</span>}
          {taxAmt > 0 && <span>+ Tax ({taxRate}%) {fmt(taxAmt)}</span>}
        </div>
        <div className="grand-total-value">{fmt(grandTotal)}</div>
      </div>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
        This estimate is valid for 30 days from the bid date. All prices subject to final measurement verification.
      </div>

      {saveConfirmed && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(135deg, #e8f5e9, #f1f8e9)",
          border: "1px solid #a5d6a7",
          borderLeft: "4px solid var(--green)",
          borderRadius: 6,
          padding: "14px 20px",
          marginBottom: 16,
          animation: "fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontWeight: 600, color: "#2e7d32", fontSize: 14 }}>Estimate saved successfully</div>
            <div style={{ color: "#4caf50", fontSize: 12, marginTop: 2 }}>{project.name} · {fmtId(project.id)}</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-outline" onClick={onBack}>← Back to Final Details</button>
        <button className="btn btn-gold btn-lg" onClick={handleSaveAndNext} disabled={saving}>
          {saving ? "⳿ Saving…" : "Save & Continue →"}
        </button>
      </div>
    </div>
  );
}
