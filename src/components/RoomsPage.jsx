import React, { useState, useEffect, useRef } from "react"
import { Field } from "./Field.jsx"
import {
  PRICING,
  HOURLY_RATE,
  fmt,
  toTitleCase,
  isRoomComplete,
  calcCabinetry,
  calcUpgrades,
  calcCountertops,
  calcFinishing,
  calcInstall,
  calcEstimatedFinishingLF,
  blankCabRow,
  blankUpgRow,
  blankCtpRow,
  blankFinRow,
} from "../appUtils.js"

// ── CabinetrySection ──────────────────────────────────────────────────────────
function CabinetrySection({ items, masterAdj, onChange }) {
  const update = (i, field, val) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [field]: val } : it);
    onChange(next);
  };
  const justAddedRef = useRef(false);
  const newRowRef = useRef(null);
  const addRow = () => {
    justAddedRef.current = true;
    onChange([...items, { ...blankCabRow(), adjPct: masterAdj != null ? String(masterAdj) : "" }]);
  };
  const removeRow = (i) => {
    if (items.length === 1) return;
    onChange(items.filter((_, idx) => idx !== i));
  };
  useEffect(() => {
    if (justAddedRef.current && newRowRef.current) {
      newRowRef.current.focus();
      justAddedRef.current = false;
    }
  }, [items.length]);

  const subTotal = calcCabinetry(items);

  return (
    <div className="card form-section-anim" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>CABINETRY
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: 0 }}>{fmt(subTotal)}</span>
        </span>
        <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff", border: "none" }} onClick={addRow}>+ Add Row</button>
      </div>
      <div className="scrollable">
        <table className="data-table" aria-label="Cabinetry items">
          <thead>
            <tr>
              <th scope="col" style={{ width: 220 }}>Product Type</th>
              <th scope="col" style={{ width: 140 }}>Construction</th>
              <th scope="col" style={{ width: 130 }}>Wood Type</th>
              <th scope="col" style={{ width: 70 }}>
                <abbr title="Number of units to install">LF / Qty</abbr>
              </th>
              <th scope="col" style={{ width: 80 }}>
                <abbr title="Price adjustment % — positive = markup, negative = discount">% Adj</abbr>
              </th>
              <th scope="col" style={{ width: 120 }}>Line Total</th>
              <th scope="col" style={{ width: 140 }}>Notes</th>
              <th scope="col" style={{ width: 36 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const prod = PRICING.woodwork.find(w => w.name === item.product);
              const con = PRICING.construction.find(c => c.name === item.construction);
              const wood = PRICING.wood.find(w => w.name === item.wood);
              const basePrice = prod ? prod.price : 0;
              const conPrem = con ? con.premium : 0;
              const woodPrem = wood ? wood.premium : 0;
              const stdPrice = basePrice * (1 + conPrem) * (1 + woodPrem);
              const qty = parseFloat(item.qty) || 0;
              const adjPct = parseFloat(item.adjPct) || 0;
              const lineTotal = stdPrice * qty * (1 + adjPct / 100);

              return (
                <tr key={i}>
                  <td>
                    <select
                      ref={i === items.length - 1 ? newRowRef : null}
                      aria-label={`Row ${i + 1} product type`}
                      value={item.product}
                      onChange={e => update(i, "product", e.target.value)}>
                      <option value="">— Select —</option>
                      {PRICING.woodwork.map(w => <option key={w.name}>{w.name}</option>)}
                    </select>
                    {item.product && stdPrice > 0 && (
                      <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4, fontWeight: 700 }}>{fmt(stdPrice)}/unit</div>
                    )}
                  </td>
                  <td>
                    <select value={item.construction} onChange={e => update(i, "construction", e.target.value)}>
                      {PRICING.construction.map(c => <option key={c.name}>{c.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={item.wood} onChange={e => update(i, "wood", e.target.value)}>
                      {PRICING.wood.map(w => <option key={w.name}>{w.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="0" step="0.5" value={item.qty} onChange={e => update(i, "qty", e.target.value)} /></td>
                  <td>
                    <input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} />
                    {item.product && stdPrice > 0 && (
                      <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(stdPrice * (1 + adjPct / 100))}/LF</div>
                    )}
                  </td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.product && qty > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.product && qty > 0 ? fmt(lineTotal) : "–"}
                  </td>
                  <td><input value={item.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Notes…" /></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: items.length > 1 ? "var(--red)" : "var(--rule)", cursor: items.length > 1 ? "pointer" : "default" }} onClick={() => removeRow(i)} title="Remove row">✕</button></td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={5} style={{ textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>
                Cabinetry Total
              </td>
              <td className="num-cell">{fmt(subTotal)}</td>
              <td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── UpgradesSection ───────────────────────────────────────────────────────────
function UpgradesSection({ items, masterAdj, onChange }) {
  const update = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow = () => onChange([...items, { ...blankUpgRow(), adjPct: masterAdj != null ? String(masterAdj) : "" }]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };
  const subTotal = calcUpgrades(items);

  return (
    <div className="card form-section-anim" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>UPGRADES / OVERRIDES
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: 0 }}>{fmt(subTotal)}</span>
        </span>
        <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff", border: "none" }} onClick={addRow}>+ Add Row</button>
      </div>
      <div className="scrollable">
        <table className="data-table" aria-label="Upgrades and overrides">
          <thead>
            <tr>
              <th scope="col" style={{ width: 260 }}>Upgrade / Override</th>
              <th scope="col" style={{ width: 80 }}>Qty</th>
              <th scope="col" style={{ width: 80 }}>
                <abbr title="Price adjustment % — positive = markup, negative = discount">% Adj</abbr>
              </th>
              <th scope="col" style={{ width: 110 }}>Total</th>
              <th scope="col" style={{ width: 140 }}>Notes</th>
              <th scope="col" style={{ width: 36 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const upg = PRICING.upgrades.find(u => u.name === item.upgrade);
              const qty = parseFloat(item.qty) || 0;
              const adjPct = parseFloat(item.adjPct) || 0;
              const total = upg ? upg.price * qty * (1 + adjPct / 100) : 0;
              return (
                <tr key={i}>
                  <td>
                    <select value={item.upgrade} onChange={e => update(i, "upgrade", e.target.value)}>
                      <option value="">— Select —</option>
                      {PRICING.upgrades.map(u => <option key={u.name}>{u.name}</option>)}
                    </select>
                    {upg && (
                      <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4, fontWeight: 700 }}>{fmt(upg.price)}/unit</div>
                    )}
                  </td>
                  <td><input type="number" min="0" value={item.qty} onChange={e => update(i, "qty", e.target.value)} /></td>
                  <td>
                    <input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} />
                    {upg && (
                      <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(upg.price * (1 + adjPct / 100))}/unit</div>
                    )}
                  </td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.upgrade && qty > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.upgrade && qty > 0 ? fmt(total) : "–"}
                  </td>
                  <td><input value={item.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Notes…" /></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: items.length > 1 ? "var(--red)" : "var(--rule)", cursor: items.length > 1 ? "pointer" : "default" }} onClick={() => removeRow(i)}>✕</button></td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Upgrades Total</td>
              <td className="num-cell">{fmt(subTotal)}</td>
              <td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CountertopsSection ────────────────────────────────────────────────────────
function CountertopsSection({ items, masterAdj, onChange }) {
  const update = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow = () => onChange([...items, { ...blankCtpRow(), adjPct: masterAdj != null ? String(masterAdj) : "" }]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };
  const subTotal = calcCountertops(items);

  return (
    <div className="card form-section-anim" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>COUNTERTOPS
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: 0 }}>{fmt(subTotal)}</span>
        </span>
        <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff", border: "none" }} onClick={addRow}>+ Add Row</button>
      </div>
      <div className="scrollable">
        <table className="data-table" aria-label="Countertop items">
          <thead>
            <tr>
              <th scope="col" style={{ width: 260 }}>Countertop Type</th>
              <th scope="col" style={{ width: 80 }}>LF / Qty</th>
              <th scope="col" style={{ width: 80 }}>
                <abbr title="Price adjustment % — positive = markup, negative = discount">% Adj</abbr>
              </th>
              <th scope="col" style={{ width: 110 }}>Total</th>
              <th scope="col" style={{ width: 140 }}>Notes</th>
              <th scope="col" style={{ width: 36 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const ctp = PRICING.countertops?.find(c => c.name === item.product);
              const qty = parseFloat(item.qty) || 0;
              const adjPct = parseFloat(item.adjPct) || 0;
              const total = ctp ? ctp.price * qty * (1 + adjPct / 100) : 0;
              return (
                <tr key={i}>
                  <td>
                    <select value={item.product} onChange={e => update(i, "product", e.target.value)}>
                      <option value="">— Select —</option>
                      {(PRICING.countertops || []).map(c => <option key={c.name}>{c.name}</option>)}
                    </select>
                    {ctp && (
                      <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4, fontWeight: 700 }}>{fmt(ctp.price)}/unit</div>
                    )}
                  </td>
                  <td><input type="number" min="0" step="0.5" value={item.qty} onChange={e => update(i, "qty", e.target.value)} /></td>
                  <td>
                    <input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} />
                    {ctp && (
                      <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(ctp.price * (1 + adjPct / 100))}/unit</div>
                    )}
                  </td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.product && qty > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.product && qty > 0 ? fmt(total) : "–"}
                  </td>
                  <td><input value={item.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Notes…" /></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: items.length > 1 ? "var(--red)" : "var(--rule)", cursor: items.length > 1 ? "pointer" : "default" }} onClick={() => removeRow(i)}>✕</button></td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Countertops Total</td>
              <td className="num-cell">{fmt(subTotal)}</td>
              <td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── FinishingSection ──────────────────────────────────────────────────────────
function FinishingSection({ items, cabinetry = [], onChange }) {
  const update = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow    = () => onChange([...items, blankFinRow()]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };
  const subTotal = calcFinishing(items);
  const estimatedLF = calcEstimatedFinishingLF(cabinetry);
  const enteredLF = items.reduce((s, it) => s + (parseFloat(it.lf) || 0), 0);
  const lfDiff = enteredLF - estimatedLF;

  return (
    <div className="card form-section-anim" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>FINISHING
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: 0 }}>{fmt(subTotal)}</span>
        </span>
        <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff", border: "none" }} onClick={addRow}>+ Add Row</button>
      </div>

      {/* Estimated LF hint from cabinetry */}
      {estimatedLF > 0 && (
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--rule)",
          background: "var(--gold-bg)", fontSize: 14, display: "flex", flexDirection: "column", gap: 8,
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "var(--mid)", fontWeight: 600, fontSize: 13 }}>Estimated Finishing LF from Cabinetry:</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>
              {estimatedLF.toFixed(1)} LF
            </span>
          </div>
          {enteredLF > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--mid)", fontWeight: 600, fontSize: 13 }}>Entered LF:</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                  {enteredLF.toFixed(1)} LF
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--mid)", fontWeight: 600, fontSize: 13 }}>Difference:</span>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700,
                  color: Math.abs(lfDiff) < 0.1 ? "var(--green, #2D7A4F)" : lfDiff > 0 ? "var(--gold)" : "#C0392B",
                }}>
                  {lfDiff > 0 ? "+" : ""}{lfDiff.toFixed(1)} LF
                  {Math.abs(lfDiff) < 0.1 && " ✓"}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="scrollable">
        <table className="data-table" aria-label="Finishing items">
          <thead>
            <tr>
              <th scope="col" style={{ width: 160 }}>Finishing Type</th>
              <th scope="col" style={{ width: 100 }}>
                <abbr title="Linear feet of finishing work for this type">Linear Feet</abbr>
              </th>
              <th scope="col" style={{ width: 80 }}>% Adj</th>
              <th scope="col" style={{ width: 110 }}>Total</th>
              <th scope="col" style={{ width: 140 }}>Notes</th>
              <th scope="col" style={{ width: 36 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const fin = PRICING.finishing.find(f => f.name === item.type);
              const lf = parseFloat(item.lf) || 0;
              const adjPct = parseFloat(item.adjPct) || 0;
              const total = fin ? fin.pricePerLF * lf * (1 + adjPct / 100) : 0;
              return (
                <tr key={i}>
                  <td>
                    <select value={item.type} onChange={e => update(i, "type", e.target.value)}>
                      <option value="">— Select —</option>
                      {PRICING.finishing.map(f => <option key={f.name}>{f.name}</option>)}
                    </select>
                    {fin && (
                      <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4, fontWeight: 700 }}>{fmt(fin.pricePerLF)}/LF</div>
                    )}
                  </td>
                  <td><input type="number" min="0" step="0.5" value={item.lf} onChange={e => update(i, "lf", e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} /></td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.type && lf > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.type && lf > 0 ? fmt(total) : "–"}
                  </td>
                  <td><input value={item.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Notes…" /></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: items.length > 1 ? "var(--red)" : "var(--rule)", cursor: items.length > 1 ? "pointer" : "default" }} onClick={() => removeRow(i)}>✕</button></td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Finishing Total</td>
              <td className="num-cell">{fmt(subTotal)}</td>
              <td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── InstallSection ────────────────────────────────────────────────────────────
function InstallSection({ data, cabTotal, onChange }) {
  const instTotal = calcInstall(data, cabTotal);
  return (
    <div className="card form-section-anim" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>INSTALLATION
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: 0 }}>{fmt(instTotal)}</span>
        </span>
      </div>
      <div className="card-body">
        <div className="form-grid form-grid-4">
          <Field label="Install Type">
            <select value={data.type} onChange={e => onChange({ ...data, type: e.target.value })}>
              <option value="">— Select —</option>
              {PRICING.installType.map(i => <option key={i.name}>{i.name}</option>)}
            </select>
            {data.type && data.type !== "No Install" && (() => {
              const inst = PRICING.installType.find(i => i.name === data.type);
              return inst ? (
                <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4, fontWeight: 700 }}>
                  {data.type === HOURLY_RATE ? `${fmt(inst.rate)}/hr` : `${(inst.rate * 100).toFixed(0)}% of cabinetry`}
                </div>
              ) : null;
            })()}
          </Field>
          {data.type === HOURLY_RATE && (
            <Field label="Total Hours">
              <input type="number" min="0" step="0.5" value={data.metric} placeholder="0"
                onChange={e => onChange({ ...data, metric: e.target.value })} />
            </Field>
          )}
          <Field label="% Adjustment">
            <input type="number" step="0.1" value={data.adjPct} placeholder="0"
              onChange={e => onChange({ ...data, adjPct: e.target.value })} />
          </Field>
          <Field label="Notes">
            <input value={data.notes} placeholder="Notes…"
              onChange={e => onChange({ ...data, notes: e.target.value })} />
          </Field>
        </div>
        {data.type && (
          <div className="mt-16" style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "var(--gold)" }}>
              Install Total: {fmt(instTotal)}
            </span>
            {data.type === "No Install" && <div className="text-muted" style={{ marginTop: 4 }}>No installation included</div>}
            {data.type !== HOURLY_RATE && data.type !== "No Install" && <div className="text-muted" style={{ marginTop: 4 }}>Based on {PRICING.installType.find(i => i.name === data.type)?.rate * 100}% of cabinetry total</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── RoomsPage ─────────────────────────────────────────────────────────────────
export function RoomsPage({ project, rooms, onRoomsChange, onAddRoom, onRemoveRoom, onMoveRoom, onDuplicateRoom, onProjectChange, onNext, onBack }) {
  const [activeRoom, setActiveRoom] = useState(0);
  const [dragOver, setDragOver] = useState(null);
  const dragIdxRef = useRef(null);
  const room = rooms[Math.min(activeRoom, rooms.length - 1)];
  const safeActiveRoom = Math.min(activeRoom, rooms.length - 1);

  const updateRoom = (field, val) => {
    onRoomsChange(rooms.map((r, i) => i === safeActiveRoom ? { ...r, [field]: val } : r));
  };

  const cabTotal = calcCabinetry(room.cabinetry);
  const upgTotal = calcUpgrades(room.upgrades);
  const ctpTotal = calcCountertops(room.countertops);
  const finTotal = calcFinishing(room.finishing);
  const instTotal = calcInstall(room.install, cabTotal);
  const roomTotal = cabTotal + upgTotal + ctpTotal + finTotal + instTotal;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <div className="page-title">Room Estimates</div>
            <div className="gold-rule" />
            <div className="page-subtitle">{project.name} · {rooms.length} {rooms.length === 1 ? "room" : "rooms"} — use the tabs below to add or switch rooms</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "var(--muted)" }}>Room Total</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "var(--gold)" }}>{fmt(roomTotal)}</div>
          </div>
        </div>
      </div>

      {/* Master Adjust */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, marginBottom: 14,
        padding: "12px 16px", borderRadius: 6,
        background: "var(--card-bg)", border: "1px solid var(--ivory3)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--char)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          Master Adjustment %
        </label>
        <input type="number" step="0.1" value={project.masterAdj} placeholder="0"
          onChange={e => onProjectChange?.({ masterAdj: e.target.value })}
          style={{ width: 90, padding: "6px 10px", borderRadius: 4, border: "1px solid var(--ivory3)", background: "var(--input-bg)", fontSize: 13, color: "var(--char)" }} />
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Applies to all line items across every room.
        </span>
      </div>

      {/* Room Tabs — drag to reorder */}
      <div className="room-tabs" style={{ flexWrap: "wrap", gap: 6 }}>
        {rooms.map((r, i) => {
          const done = isRoomComplete(r);
          const isActive = i === safeActiveRoom;
          return (
            <div key={r.id}
              draggable
              onDragStart={e => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                dragIdxRef.current = i;
                requestAnimationFrame(() => e.target.classList.add("dragging"));
              }}
              onDragEnd={e => {
                e.target.classList.remove("dragging");
                dragIdxRef.current = null;
                setDragOver(null);
              }}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragIdxRef.current !== null && dragIdxRef.current !== i) setDragOver(i);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault();
                const from = dragIdxRef.current ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
                if (!isNaN(from) && from !== i) {
                  onMoveRoom(from, i);
                  setActiveRoom(i);
                }
                setDragOver(null);
                dragIdxRef.current = null;
              }}
              className={`room-tab ${isActive ? "active" : ""}`}
              style={{
                ...(done && !isActive ? { borderColor: "#2D7A4F", background: "#e8f4ed", color: "#2D7A4F" } : {}),
                display: "flex", alignItems: "center", gap: 6, paddingRight: 6,
                cursor: "grab",
                ...(dragOver === i ? { borderColor: "var(--gold)", boxShadow: "0 0 0 2px var(--gold-bg)" } : {}),
              }}
              onClick={() => setActiveRoom(i)}>
              {done && !isActive && <span style={{ fontSize: 11 }}>✓</span>}
              <span>{r.name || `Room ${i + 1}`}</span>
              {rooms.length > 1 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveRoom(i);
                    setActiveRoom(Math.max(0, i - 1));
                  }}
                  title="Remove room"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: isActive ? "var(--gold)" : "var(--muted)",
                    fontSize: 13, lineHeight: 1, padding: "0 2px", marginLeft: 2,
                    display: "flex", alignItems: "center",
                  }}>
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => { onAddRoom(); setActiveRoom(rooms.length); }}
          className="room-tab"
          style={{ borderStyle: "dashed", color: "var(--gold)", background: "var(--gold-bg)", fontWeight: 600, gap: 4 }}>
          + Add Room
        </button>
      </div>

      {/* Room Name */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">ROOM INFORMATION</span>
          {isRoomComplete(room) && (
            <button
              className="btn btn-outline"
              style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => {
                onDuplicateRoom(safeActiveRoom);
                setActiveRoom(safeActiveRoom + 1);
              }}
              title="Duplicate this room">
              ⧉ Duplicate Room
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <Field label="Room Name / Label">
              <input value={room.name} placeholder={`e.g. Kitchen, Master Bath, Room ${safeActiveRoom + 1}`}
                onChange={e => updateRoom("name", toTitleCase(e.target.value))} />
            </Field>
          </div>
        </div>
      </div>

      {/* Quick Summary for this room */}
      <div className="summary-grid">
        {[["Cabinetry", cabTotal], ["Upgrades", upgTotal], ["Countertops", ctpTotal], ["Finishing", finTotal], ["Installation", instTotal]].map(([lbl, val]) => (
          <div className="summary-card" key={lbl}>
            <div className="summary-card-label">{lbl}</div>
            <div className="summary-card-value">{fmt(val)}</div>
          </div>
        ))}
      </div>

      <CabinetrySection items={room.cabinetry} masterAdj={project.masterAdj} onChange={v => updateRoom("cabinetry", v)} />
      <UpgradesSection items={room.upgrades} masterAdj={project.masterAdj} onChange={v => updateRoom("upgrades", v)} />
      <CountertopsSection items={room.countertops || []} masterAdj={project.masterAdj} onChange={v => updateRoom("countertops", v)} />
      <FinishingSection items={room.finishing} cabinetry={room.cabinetry} onChange={v => updateRoom("finishing", v)} />
      <InstallSection data={room.install} cabTotal={cabTotal} onChange={v => updateRoom("install", v)} />

      {(() => {
        const allComplete = rooms.every(isRoomComplete);
        const incomplete = rooms.filter(r => !isRoomComplete(r));
        return (
          <div className="flex justify-between items-center mt-24">
            <button className="btn btn-outline" onClick={onBack}>← Back</button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {!allComplete && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {incomplete.length} room{incomplete.length > 1 ? "s" : ""} still need{incomplete.length === 1 ? "s" : ""} a name, cabinetry item, and install type
                </span>
              )}
              <button
                className={`btn btn-lg ${allComplete ? "btn-gold" : "btn-outline"}`}
                style={!allComplete ? { opacity: 0.45, cursor: "not-allowed", pointerEvents: "none" } : {}}
                onClick={allComplete ? onNext : undefined}>
                Review &amp; Summary →
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
