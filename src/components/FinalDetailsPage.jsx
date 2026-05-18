import React from "react"
import { Field } from "./Field.jsx"
import { calcCabinetry, calcUpgrades, calcFinishing, calcInstall } from "../appUtils.js"

export function FinalDetailsPage({ project, rooms, onChange, onNext, onBack }) {
  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry);
    const upg  = calcUpgrades(r.upgrades);
    const fin  = calcFinishing(r.finishing);
    const inst = calcInstall(r.install, cab);
    return cab + upg + fin + inst;
  });
  const roomsSubtotal = roomTotals.reduce((s, v) => s + v, 0);
  const delivery   = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0);
  const subtotal   = roomsSubtotal + delivery;
  const taxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled;
  const taxRate    = Number.isFinite(parseFloat(project.taxRate)) ? parseFloat(project.taxRate) : 8.53;
  const taxAmt     = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const grandTotal = subtotal + taxAmt;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Final Details</div>
          <div className="gold-rule" />
          <div className="page-subtitle">Add delivery charges and tax before reviewing the summary.</div>
        </div>
      </div>

      {/* Delivery */}
      <div className="card">
        <div className="card-header"><span className="card-title">DELIVERY</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <Field label="Delivery Option">
              <select
                value={project.noDelivery ? "none" : "standard"}
                onChange={e => {
                  if (e.target.value === "none") {
                    onChange({ noDelivery: true, deliveryAmount: "", deliveryNotes: "" });
                  } else {
                    onChange({ noDelivery: false });
                  }
                }}>
                <option value="standard">Standard Delivery</option>
                <option value="none">No Delivery</option>
              </select>
            </Field>
            {!project.noDelivery && (
              <Field label="Delivery Amount (USD)">
                <input type="number" min="0" step="0.01" value={project.deliveryAmount} placeholder="0.00"
                  onChange={e => onChange({ deliveryAmount: e.target.value })} />
              </Field>
            )}
            {!project.noDelivery && (
              <Field label="Delivery Notes">
                <input value={project.deliveryNotes} placeholder="e.g. Curbside drop-off, call ahead"
                  onChange={e => onChange({ deliveryNotes: e.target.value })} />
              </Field>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <button
              type="button"
              role="switch"
              aria-checked={!!project.showDeliveryOnPdf}
              onClick={() => onChange({ showDeliveryOnPdf: !project.showDeliveryOnPdf })}
              style={{
                position: "relative",
                width: 44, height: 24, borderRadius: 12, border: "none",
                background: project.showDeliveryOnPdf ? "var(--gold)" : "var(--ivory3)",
                cursor: "pointer", flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: project.showDeliveryOnPdf ? 23 : 3,
                width: 18, height: 18, borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.2s",
              }} />
            </button>
            <span style={{ fontSize: 13, color: "var(--char)", userSelect: "none" }}>
              Show "Delivery" line on per-room PDF pages
            </span>
          </div>
        </div>
      </div>

      {/* Installation & Tax */}
      <div className="card">
        <div className="card-header"><span className="card-title">INSTALLATION</span></div>
        <div className="card-body">
          <Field label="Who is doing the installation?">
            <select
              value={project.installationType || "ewp"}
              onChange={e => onChange({ installationType: e.target.value })}>
              <option value="ewp">EWP doing installation</option>
              <option value="contractor">Contractor / Retailer doing installation</option>
            </select>
          </Field>
          <div style={{
            marginTop: 14, padding: "12px 14px", borderRadius: 6,
            background: taxEnabled ? "rgba(184,59,46,0.06)" : "rgba(42,107,64,0.06)",
            border: `1px solid ${taxEnabled ? "rgba(184,59,46,0.2)" : "rgba(42,107,64,0.2)"}`,
            fontSize: 13, color: "var(--char)", lineHeight: 1.5,
          }}>
            {taxEnabled ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span>⚠️ Estimated sales tax</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={project.taxRate ?? 8.53}
                  onChange={e => onChange({ taxRate: e.target.value })}
                  style={{
                    width: 80, padding: "5px 8px", borderRadius: 4,
                    border: "1px solid rgba(184,59,46,0.35)", background: "var(--input-bg)",
                    fontSize: 13, fontWeight: 700, color: "var(--char)", textAlign: "right",
                  }}
                />
                <span>% will be applied — contractor/retailer is installing.</span>
              </div>
            ) : (
              <span>✅ <strong>No sales tax</strong> — EWP is doing the installation.</span>
            )}
          </div>
        </div>
      </div>

      {/* Live total preview */}
      <div className="card" style={{ background: "var(--ivory2)", border: "1px solid var(--ivory3)" }}>
        {(() => {
          const items = [
            ["Rooms Subtotal", roomsSubtotal],
            ["Delivery", delivery],
            ...(taxEnabled && taxAmt > 0 ? [["Tax" + ` (${taxRate}%)`, taxAmt]] : []),
            ["Grand Total", grandTotal],
          ]

          return (
            <div
              className="card-body summary-tax-grid"
              style={{
                gridTemplateColumns: `repeat(${items.length}, 1fr)`,
              }}
            >
              {items.map(([lbl, val]) => {
            const isGrand = lbl === "Grand Total";
            const isActive = val > 0 || isGrand;
            return (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>{lbl}</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isGrand ? 26 : 20, fontWeight: 700,
                  color: isGrand ? "var(--gold)" : isActive ? "var(--char)" : "var(--rule)",
                  opacity: !isActive ? 0.4 : 1,
                }}>
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)}
                </div>
              </div>
            );
              })}
            </div>
          )
        })()}
      </div>

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-outline" onClick={onBack}>← Back to Rooms</button>
        <button className="btn btn-gold btn-lg" onClick={onNext}>Review Summary →</button>
      </div>
    </div>
  );
}
