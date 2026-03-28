import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase.js"
import { DEFAULT_PRICING } from "./pricing.js"

// PRICING is loaded from Supabase at runtime (see useEffect in App).
// This module-level variable is replaced once loaded; falls back to defaults.
let PRICING = DEFAULT_PRICING;

// ── HELPERS ────────────────────────────────────────────────────
const fmt = (n) => n == null ? "$0.00" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const genId = () => "EWP" + new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);

// Format ISO date (yyyy-mm-dd) -> "Jan 15, 2026"
const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

// Title-case each word
const toTitleCase = (s) => s.replace(/\b\w/g, c => c.toUpperCase());

// Room is complete when: has a name, at least one cabinetry item with product+qty, AND install type selected
const isRoomComplete = (room) =>
  room.name.trim() !== "" &&
  room.cabinetry.some(c => c.product && parseFloat(c.qty) > 0) &&
  room.install.type !== "";

const calcCabinetry = (items) => {
  return items.reduce((sum, item) => {
    if (!item.product) return sum;
    const prod = PRICING.woodwork.find(w => w.name === item.product);
    const con = PRICING.construction.find(c => c.name === item.construction);
    const wood = PRICING.wood.find(w => w.name === item.wood);
    if (!prod) return sum;
    const basePrice = prod.price;
    const conPrem = con ? con.premium : 0;
    const woodPrem = wood ? wood.premium : 0;
    const stdPrice = basePrice * (1 + conPrem) * (1 + woodPrem);
    const qty = parseFloat(item.qty) || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    const lineTotal = stdPrice * qty;
    const modTotal = lineTotal * (1 + adjPct / 100);
    return sum + modTotal;
  }, 0);
};

const calcUpgrades = (items) => {
  return items.reduce((sum, item) => {
    if (!item.upgrade) return sum;
    const upg = PRICING.upgrades.find(u => u.name === item.upgrade);
    if (!upg) return sum;
    const qty = parseFloat(item.qty) || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    const lineTotal = upg.price * qty;
    return sum + lineTotal * (1 + adjPct / 100);
  }, 0);
};

const calcFinishing = (items) => {
  return items.reduce((sum, item) => {
    if (!item.type) return sum;
    const fin = PRICING.finishing.find(f => f.name === item.type);
    if (!fin) return sum;
    const lf = parseFloat(item.lf) || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    const subtotal = fin.pricePerLF * lf;
    return sum + subtotal * (1 + adjPct / 100);
  }, 0);
};

const calcInstall = (installData, cabTotal) => {
  if (!installData.type) return 0;
  const inst = PRICING.installType.find(i => i.name === installData.type);
  if (!inst) return 0;
  const adjPct = parseFloat(installData.adjPct) || 0;
  let base;
  if (installData.type === "Hourly Rate") {
    const hours = parseFloat(installData.metric) || 0;
    base = inst.rate * hours;
  } else {
    base = cabTotal * inst.rate;
  }
  return Math.ceil((base * (1 + adjPct / 100)) / 5) * 5;
};

const calcEstimatedFinishingLF = (cabinetryItems) => {
  return cabinetryItems.reduce((sum, item) => {
    if (!item.product) return sum;
    const prod = PRICING.woodwork.find(w => w.name === item.product);
    if (!prod) return sum;
    const qty = parseFloat(item.qty) || 0;
    return sum + (prod.finLF * qty);
  }, 0);
};
const blankCabRow = () => ({ product: "", construction: "Not Applicable", wood: "Not Applicable", qty: "", adjPct: "", notes: "" });
const blankUpgRow = () => ({ upgrade: "", qty: "", adjPct: "", notes: "" });
const blankFinRow = () => ({ type: "", lf: "", adjPct: "", notes: "" });

const blankRoom = (n, masterAdj) => ({
  id: Date.now() + n,
  name: "",
  cabinetry: [{ ...blankCabRow(), adjPct: masterAdj != null ? String(masterAdj) : '' }],
  upgrades:  [{ ...blankUpgRow(), adjPct: masterAdj != null ? String(masterAdj) : '' }],
  finishing: [blankFinRow()],
  install: { type: "", metric: "", adjPct: "", notes: "" },
});

// ── STYLES ─────────────────────────────────────────────────────
const styles = `
  /* ── CSS VARIABLE OVERRIDES — Warm Craftsman Light Theme ── */
  :root {
    --ewp-slate:   rgb(73, 77, 77);
    --ewp-slate2:  rgb(55, 58, 58);

    --header-bg:      #FDFAF5;
    --header-border:  #E4D9C8;
    --header-text:    rgb(73, 77, 77);
    --header-subtext: rgb(140, 145, 145);

    --gold:        #8A6A38;
    --gold-light:  #B8924F;
    --gold-bg:     #FAF3E6;

    --ivory2:  #F6F1E8;
    --ivory3:  #EDE4D4;
    --rule:    #D8CEBA;

    --char:   rgb(73, 77, 77);
    --char2:  rgb(55, 58, 58);
    --mid:    rgb(120, 125, 125);
    --muted:  rgb(160, 163, 163);

    --card-bg:         #FFFFFF;
    --input-bg:        #FDFBF7;
    --input-focus-bg:  #FFFDF8;

    --green: #2A6B40;
    --red:   #B83B2E;
  }

  /* ── LAYOUT ── */
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--ivory2);
  }

  /* ── TOPBAR ── */
  .topbar {
    background: var(--header-bg);
    padding: 0 40px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid var(--header-border);
    box-shadow: 0 2px 20px rgba(20,15,5,0.07);
    transition: height 0.35s ease, box-shadow 0.35s ease;
  }
  .topbar.scrolled {
    height: 62px;
    box-shadow: 0 2px 16px rgba(20,15,5,0.11);
  }
  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .header-logo {
    height: 75px;
    width: auto;
    flex-shrink: 0;
    transition: height 0.35s ease;
  }
  .topbar.scrolled .header-logo {
    height: 50px;
  }
  .topbar-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 34px; font-weight: 600;
    color: var(--ewp-slate); letter-spacing: 0.04em;
    line-height: 1;
    transition: font-size 0.35s ease;
  }
  .topbar.scrolled .topbar-name {
    font-size: 21px;
  }
  .topbar-sub {
    font-size: 10px; color: rgb(140, 145, 145);
    letter-spacing: 0.18em; text-transform: uppercase;
    margin-top: 5px; font-weight: 600;
    opacity: 1;
    transition: opacity 0.2s ease, max-height 0.35s ease, margin-top 0.35s ease;
    max-height: 20px;
    overflow: hidden;
  }
  .topbar.scrolled .topbar-sub {
    opacity: 0;
    max-height: 0;
    margin-top: 0;
  }
  .topbar-right { display: flex; align-items: center; gap: 8px; }

  /* ── STEPPER ── */
  .stepper {
    background: var(--header-bg);
    border-bottom: 1px solid var(--header-border);
    padding: 0 40px;
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
  }
  .step {
    display: flex; align-items: center;
    padding: 14px 22px;
    gap: 9px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .step:hover { background: var(--ivory2); }
  .step.active { border-bottom-color: var(--gold); }
  .step-num {
    width: 22px; height: 22px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700;
    background: var(--ivory3);
    color: var(--mid);
    flex-shrink: 0;
    border: 1.5px solid var(--rule);
  }
  .step.active .step-num { background: var(--gold); color: #fff; border-color: var(--gold); }
  .step.done .step-num { background: var(--green); color: #fff; border-color: var(--green); }
  .step-label { font-size: 12px; font-weight: 500; color: var(--mid); letter-spacing: 0.02em; }
  .step.active .step-label { color: var(--char); font-weight: 700; }

  /* ── MAIN CONTENT ── */
  .main { flex: 1; max-width: 1200px; margin: 0 auto; width: 100%; padding: 40px 32px; }

  /* ── PAGE HEADER ── */
  .page-header { margin-bottom: 32px; }
  .page-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px; font-weight: 600;
    color: var(--ewp-slate); line-height: 1.1;
    letter-spacing: 0.01em;
  }
  .page-subtitle { font-size: 13px; color: var(--mid); margin-top: 4px; }
  .gold-rule {
    height: 1px;
    background: linear-gradient(90deg, var(--gold) 0%, rgba(138,106,56,0.2) 60%, transparent 100%);
    width: 100px;
    margin: 12px 0;
  }

  /* ── CARDS ── */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--ivory3);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow: 0 1px 8px rgba(20,15,5,0.05);
  }
  .card-header {
    background: var(--ivory2);
    padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--ivory3);
    border-left: 3px solid var(--ewp-slate);
  }
  .card-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 700;
    color: var(--ewp-slate); letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .card-body { padding: 20px; }

  /* ── FORM ELEMENTS ── */
  .form-grid { display: grid; gap: 16px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .form-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label {
    font-size: 9px; font-weight: 700;
    color: var(--gold); text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  input, select, textarea {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--char);
    background: var(--input-bg);
    border: 1px solid var(--rule);
    border-radius: 3px;
    padding: 9px 12px;
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    appearance: none;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(138,106,56,0.1);
    background: var(--input-focus-bg);
  }
  input.error, select.error { border-color: var(--red); }
  .field-error { font-size: 11px; color: var(--red); }

  select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7' viewBox='0 0 11 7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%238C7B6A' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }

  /* ── BUTTONS ── */
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px; font-weight: 700;
    padding: 10px 20px;
    border-radius: 3px;
    border: none;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
    transition: all 0.15s;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .btn-primary { background: var(--ewp-slate); color: #fff; }
  .btn-primary:hover { background: var(--ewp-slate2); }
  .btn-gold { background: var(--gold); color: #fff; }
  .btn-gold:hover { background: #7A5C2C; box-shadow: 0 2px 8px rgba(138,106,56,0.3); }
  .btn-outline { background: transparent; color: var(--char); border: 1px solid var(--rule); }
  .btn-outline:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-bg); }
  .btn-ghost { background: transparent; color: var(--mid); border: none; padding: 6px 10px; }
  .btn-ghost:hover { color: var(--char); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid rgba(184,59,46,0.3); }
  .btn-danger:hover { background: rgba(184,59,46,0.05); border-color: var(--red); }
  .btn-sm { padding: 5px 12px; font-size: 10px; }
  .btn-lg { padding: 13px 32px; font-size: 12px; letter-spacing: 0.1em; }

  /* ── ROOM TABS ── */
  .room-tabs { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
  .room-tab {
    padding: 7px 15px;
    border-radius: 3px;
    border: 1px solid var(--ivory3);
    background: var(--card-bg);
    cursor: pointer;
    font-size: 12px; font-weight: 500;
    color: var(--mid);
    transition: all 0.15s;
    display: flex; align-items: center; gap: 6px;
  }
  .room-tab:hover { border-color: var(--gold); color: var(--char); background: var(--gold-bg); }
  .room-tab.active { background: var(--char); color: #fff; border-color: var(--char); }
  .room-tab-add {
    border-style: dashed;
    color: var(--gold);
    border-color: rgba(138,106,56,0.4);
  }
  .room-tab-add:hover { background: var(--gold-bg); border-style: solid; }

  /* ── DATA TABLE ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th {
    background: var(--ivory2);
    color: var(--mid);
    font-size: 9px; font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 10px 10px;
    text-align: left;
    border-bottom: 1px solid var(--ivory3);
    white-space: nowrap;
  }
  .data-table td {
    padding: 6px 6px;
    border-bottom: 1px solid var(--ivory3);
    vertical-align: middle;
    text-align: center;
  }
  .data-table tr:nth-child(even) td { background: var(--ivory2); }
  .data-table tr:hover td { background: var(--gold-bg); }
  .data-table input, .data-table select {
    padding: 5px 8px;
    font-size: 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 2px;
  }
  .data-table input:focus, .data-table select:focus {
    background: var(--input-focus-bg);
    border-color: var(--gold);
  }
  .data-table .num-cell { text-align: center; }
  .data-table .total-row td {
    background: var(--ivory3) !important;
    font-weight: 600;
    border-top: 1px solid var(--gold);
    color: var(--gold);
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
    text-align: center;
  }

  /* ── SECTION LABEL ── */
  .section-banner {
    background: var(--ivory2);
    color: var(--ewp-slate);
    font-family: 'DM Sans', sans-serif;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ivory3);
    border-left: 3px solid var(--ewp-slate);
    display: flex; align-items: center; justify-content: space-between;
  }

  /* ── SUMMARY CARDS ── */
  .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 24px; }
  .summary-card {
    background: var(--card-bg);
    border: 1px solid var(--ivory3);
    border-radius: 4px;
    padding: 14px 16px;
    border-top: 2px solid var(--gold);
  }
  .summary-card-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 6px; text-align: center; }
  .summary-card-value { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: var(--char); text-align: center; }

  /* ── GRAND TOTAL ── */
  .grand-total {
    background: var(--ewp-slate);
    border-radius: 4px;
    padding: 24px 32px;
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 8px;
  }
  .grand-total-label {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 600;
    color: rgba(255,255,255,0.9);
    letter-spacing: 0.06em;
  }
  .grand-total-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px; font-weight: 700;
    color: var(--gold-light);
  }

  /* ── PROJECT LIST ── */
  .project-list { display: flex; flex-direction: column; gap: 8px; }
  .project-row {
    background: var(--card-bg);
    border: 1px solid var(--ivory3);
    border-left: 3px solid transparent;
    border-radius: 4px;
    padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer;
    transition: all 0.15s;
  }
  .project-row:hover { border-left-color: var(--gold); box-shadow: 0 2px 12px rgba(20,15,5,0.07); }
  .project-row-name { font-weight: 600; font-size: 15px; color: var(--ewp-slate); }
  .project-row-meta { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .project-row-total { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: var(--ewp-slate); }
  .badge {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
    padding: 3px 8px; border-radius: 2px;
  }
  .badge-new { background: rgba(42,107,64,0.12); color: var(--green); }
  .badge-draft { background: var(--gold-bg); color: var(--gold); }

  /* ── HELPERS ── */
  .flex { display: flex; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .mt-8 { margin-top: 8px; }
  .mt-16 { margin-top: 16px; }
  .mt-24 { margin-top: 24px; }
  .mb-16 { margin-bottom: 16px; }
  .text-right { text-align: right; }
  .text-muted { color: var(--muted); font-size: 12px; }
  .divider { height: 1px; background: var(--ivory3); margin: 20px 0; }
  .scrollable { overflow-x: auto; }

  /* ── EMPTY STATE ── */
  .empty-state {
    text-align: center; padding: 80px 20px;
    color: var(--muted);
  }
  .empty-icon { font-size: 36px; margin-bottom: 16px; opacity: 0.35; }
  .empty-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--char); margin-bottom: 8px; font-weight: 600; }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--char); color: #fff;
    padding: 12px 20px; border-radius: 3px;
    font-size: 13px; border-left: 3px solid var(--gold);
    z-index: 999; animation: slideUp 0.3s ease;
    box-shadow: 0 8px 24px rgba(20,15,5,0.2);
  }
  @keyframes slideUp { from { transform: translateY(12px); opacity:0; } to { transform:translateY(0); opacity:1; } }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(20,15,5,0.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 20px;
    backdrop-filter: blur(2px);
  }
  .modal {
    background: var(--card-bg); border-radius: 4px;
    width: 100%; max-width: 480px;
    box-shadow: 0 20px 60px rgba(20,15,5,0.18);
    overflow: hidden;
    border: 1px solid var(--ivory3);
  }
  .modal-header {
    background: var(--ivory2); padding: 16px 24px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--ivory3);
    border-left: 3px solid var(--gold);
  }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: var(--char); font-weight: 600; }
  .modal-body { padding: 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--ivory3); display: flex; justify-content: flex-end; gap: 10px; }

  /* ── REPORT VIEW ── */
  .report-room { margin-bottom: 24px; }
  .report-section { margin-bottom: 14px; }
  .report-section-title {
    font-size: 9px; font-weight: 700;
    color: var(--gold); text-transform: uppercase;
    letter-spacing: 0.14em; margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--ivory3);
  }
  .report-line {
    display: flex; justify-content: space-between;
    padding: 4px 0; font-size: 13px;
    border-bottom: 1px solid var(--ivory3);
    color: var(--char);
  }
  .report-line-total {
    font-weight: 600; color: var(--gold);
    border-bottom: 1px solid var(--gold);
  }

  /* ── DARK MODE OVERRIDES ── */
  .dark {
    --ewp-slate:   rgb(195, 200, 200);
    --ewp-slate2:  rgb(220, 223, 223);

    --header-bg:      #2A2820;
    --header-border:  #3A3628;
    --header-text:    rgb(210, 213, 210);
    --header-subtext: #A09580;
    --gold:        #B8904A;
    --gold-light:  #D4AA72;
    --gold-bg:     #2E2A1A;
    --ivory2:  #272420;
    --ivory3:  #323028;
    --rule:    #484030;
    --char:    rgb(210, 213, 210);
    --char2:   rgb(230, 232, 230);
    --mid:     #B0A090;
    --muted:   #887870;
    --card-bg:         #222018;
    --input-bg:        #2A2820;
    --input-focus-bg:  #2E2C22;
    --green: #4A9B65;
    --red:   #D05050;
  }
  .dark body { background: #201E18; }
  .dark .app { background: #201E18; }
  .dark .stepper { background: var(--header-bg); border-bottom-color: var(--header-border); }
  .dark .step:hover { background: #323028; }
  .dark .step-num { background: #323028; border-color: #484030; }
  .dark .step.active .step-label { color: var(--gold-light); }
  .dark .card-header { background: #2A2820; border-left-color: var(--ewp-slate); border-bottom-color: var(--ivory3); }
  .dark .card-title { color: var(--ewp-slate); }
  .dark .section-banner { background: #2A2820; color: var(--ewp-slate); border-left-color: var(--ewp-slate); }
  .dark .grand-total { background: #181610; }
  .dark .data-table th { background: #2A2820; color: var(--mid); border-bottom-color: var(--ivory3); }
  .dark .data-table td { border-bottom-color: var(--ivory3); }
  .dark .data-table tr:nth-child(even) td { background: #272420; }
  .dark .data-table tr:hover td { background: #2E2A1A; }
  .dark .data-table .total-row td { background: #323028 !important; border-top-color: var(--gold); }
  .dark .modal-footer { border-top-color: var(--ivory3); }
  .dark .modal-header { background: #2A2820; }
  .dark .modal { background: var(--card-bg); border-color: var(--ivory3); }
  /* Buttons in dark mode */
  .dark .btn-primary { background: var(--ewp-slate); color: #201E18; }
  .dark .btn-primary:hover { background: var(--ewp-slate2); }
  .dark .btn-gold { background: #B8904A; color: #201E18; }
  .dark .btn-gold:hover { background: #D4AA72; }
  .dark .btn-outline { color: #D5D0C8; border-color: #484030; background: transparent; }
  .dark .btn-outline:hover { background: #2E2A1A; border-color: var(--gold); color: var(--gold-light); }
  .dark .btn-ghost { color: #A09080; }
  .dark .btn-ghost:hover { color: #D5D0C8; }
  .dark .btn-danger { border-color: #5A3030; color: #D05050; }
  .dark .btn-danger:hover { background: #2E2020; }
  .dark .toast { background: #2A2820; }
  .dark .badge-new { background: #1A3028; color: var(--green); }
  .dark .badge-draft { background: #2E2A1A; color: var(--gold); }
  .dark .modal-overlay { background: rgba(0,0,0,0.55); }
  .dark .divider { background: var(--ivory3); }
  .dark .project-row { background: var(--card-bg); border-color: var(--ivory3); }
  .dark .project-row:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.25); border-left-color: var(--gold); }
  .dark .project-row-name { color: var(--char); }
  .dark .project-row-total { color: var(--gold-light); }
  .dark .summary-card { background: var(--card-bg); border-color: var(--ivory3); }
  .dark .summary-card-value { color: var(--gold-light); }
  /* Room tabs in dark mode */
  .dark .room-tab { background: var(--card-bg); border-color: var(--ivory3); color: var(--mid); }
  .dark .room-tab:hover { border-color: var(--gold); color: var(--char); background: var(--gold-bg); }
  .dark .room-tab.active { background: var(--gold); color: #201E18; border-color: var(--gold); }

  @media (max-width: 768px) {
    .main { padding: 20px 16px; }
    .topbar { padding: 0 16px; height: 76px; }
    .stepper { padding: 0 16px; }
    .summary-grid { grid-template-columns: 1fr 1fr; }
    .form-grid-3, .form-grid-4 { grid-template-columns: 1fr 1fr; }
    .grand-total { flex-direction: column; gap: 8px; text-align: center; padding: 20px; }
  }
`;


// ── PDF EXPORT (INTERNAL) ─────────────────────────────────────────
function exportPDFInternal(project, rooms, onStatus) {
  onStatus("generating");

  const fmtN = (n) => n == null ? "$0.00" : new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(n);
  const fmtD = (d) => { if (!d) return ""; const [y,m,day] = d.split("-"); return new Date(+y,+m-1,+day).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };

  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry);
    const upg  = calcUpgrades(r.upgrades);
    const fin  = calcFinishing(r.finishing);
    const inst = calcInstall(r.install, cab);
    return { name: r.name, cab, upg, fin, inst, total: cab + upg + fin + inst };
  });
  const grandCab   = roomTotals.reduce((s,r) => s + r.cab,  0);
  const grandUpg   = roomTotals.reduce((s,r) => s + r.upg,  0);
  const grandFin   = roomTotals.reduce((s,r) => s + r.fin,  0);
  const grandInst  = roomTotals.reduce((s,r) => s + r.inst, 0);
  const delivery   = parseFloat(project.deliveryAmount) || 0;
  const pdfTaxRate = parseFloat(project.taxRate) || 8;
  const pdfSubtotal = grandCab + grandUpg + grandFin + grandInst + delivery;
  const pdfTaxAmt  = project.taxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0;
  const grandTotal = pdfSubtotal + pdfTaxAmt;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    @page { size: 11in 8.5in landscape; margin: 0.4in 0.48in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', Arial, sans-serif; font-size: 10pt; color: #333; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }

    /* ─── PALETTE
       Page bg:      #FFFFFF
       Ivory light:  #FAF7F2   (table alt row, info strip bg)
       Ivory mid:    #F2EDE4   (table header, section header bg)
       Ivory border: #DDD5C8   (all dividers)
       Warm stone:   #8C7355   (accent, labels, borders)
       Deep ink:     #2A2118   (headings, strong text)
       Text body:    #3D3228
       Muted text:   #9B8E82
    ─── */

    /* ── HEADER ── */
    .hdr {
      display: flex; flex-direction: column; gap: 8px;
      padding: 13px 20px 11px;
      background: #FAF7F2;
      border-bottom: 2px solid #8C7355;
      margin-bottom: 12px;
    }
    .co-brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .co-logo { height: 70px; width: auto; display: block; }
    .co-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 27pt; font-weight: 700;
      color: #2A2118; letter-spacing: 0.02em; line-height: 1;
      white-space: nowrap;
    }
    .co-tag { font-size: 9.5pt; color: #9B8E82; margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
    .hdr-right { text-align: left; }
    .doc-type {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14pt; font-weight: 600;
      color: #8C7355; letter-spacing: 0.1em; line-height: 1;
    }
    .doc-id { font-size: 7.5pt; color: #9B8E82; margin-top: 4px; letter-spacing: 0.05em; }


    /* ── WATERMARK ── */
    .page {
      position: relative;
    }
    .page::before {
      content: '';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 520px;
      height: 520px;
      background-image: url('data:image/png;base64,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');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.045;
      pointer-events: none;
      z-index: 0;
    }

    /* ── INFO STRIP ── */
    .info-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #DDD5C8;
      border-left: 3px solid #8C7355;
      border-radius: 2px;
      margin-bottom: 12px;
      background: #FAF7F2;
      overflow: hidden;
    }
    .ic { padding: 7px 12px 8px; border-right: 1px solid #DDD5C8; border-bottom: 1px solid #DDD5C8; }
    .ic:nth-child(even) { border-right: none; }
    .ic:nth-last-child(-n+2) { border-bottom: none; }
    .ic-lbl { font-size: 7pt; font-weight: 600; color: #8C7355; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
    .ic-val { font-size: 10.5pt; font-weight: 500; color: #2A2118; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── SECTION LABEL ── */
    .sec {
      background: #F2EDE4;
      color: #2A2118;
      font-family: 'DM Sans', Arial, sans-serif;
      font-size: 8pt; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      padding: 5px 10px;
      border-top: 1.5px solid #8C7355;
      border-left: 1px solid #DDD5C8;
      border-right: 1px solid #DDD5C8;
    }

    /* ── TABLE ── */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    thead th {
      background: #F2EDE4;
      font-size: 6.5pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #5A4E42; padding: 4px 5px;
      text-align: left;
      border-bottom: 1px solid #DDD5C8;
      border-left: 1px solid #DDD5C8;
      white-space: nowrap;
      overflow: hidden;
    }
    thead th:first-child { border-left: none; }
    thead th.r { text-align: right; }
    tbody tr { border-bottom: 1px solid #EDE6DC; }
    tbody tr:nth-child(even) td { background: #FAF7F2; }
    tbody td { padding: 4px 5px; vertical-align: middle; color: #3D3228; border-left: 1px solid #EDE6DC; word-break: break-word; overflow: hidden; }
    tbody td:first-child { border-left: none; }
    tbody td.r { text-align: right; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody td.amt { text-align: right; font-weight: 600; color: #5A3E1A; font-variant-numeric: tabular-nums; }
    tbody td.muted { color: #9B8E82; font-style: italic; }
    table { border: 1px solid #DDD5C8; border-top: none; table-layout: fixed; }
    /* narrow cols for numbers */
    .col-xs  { width: 44px; }
    .col-sm  { width: 64px; }
    .col-med { width: 90px; }
    .col-lg  { width: 130px; }
    /* description/name cols take remaining space */
    .col-fill { width: auto; }

    /* ── SUBTOTAL BAR ── */
    .sub-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #F2EDE4;
      border: 1px solid #DDD5C8; border-top: 1.5px solid #8C7355;
      padding: 5px 10px;
      margin-bottom: 0;
    }
    .sub-bar-lbl { font-size: 7.5pt; font-weight: 700; color: #8C7355; letter-spacing: 0.09em; text-transform: uppercase; }
    .sub-bar-val { font-size: 12pt; font-weight: 700; color: #2A2118; font-family: 'Cormorant Garamond', serif; }

    /* ── INSTALL BLOCK ── */
    .install-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
      background: #FAF7F2;
      border: 1px solid #DDD5C8; border-top: none;
    }
    .ig-cell { padding: 6px 10px; border-right: 1px solid #DDD5C8; }
    .ig-cell:last-child { border-right: none; }

    .block { margin-bottom: 10px; }

    /* ── TOTALS STRIP ── */
    .totals-strip {
      display: grid; grid-template-columns: repeat(4,1fr);
      background: #F2EDE4;
      border: 1px solid #DDD5C8;
      border-top: 2px solid #8C7355;
      margin-top: 10px;
    }
    .ts { padding: 8px 12px; border-right: 1px solid #DDD5C8; text-align: center; }
    .ts:last-child { border-right: none; }
    .ts-lbl { font-size: 7pt; color: #9B8E82; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 3px; font-weight: 600; }
    .ts-val { font-size: 13pt; font-weight: 700; color: #2A2118; font-family: 'Cormorant Garamond', serif; }

    /* ── GRAND TOTAL ── */
    .grand-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #E8E0D4;
      border: 1px solid #C8B89A;
      border-top: none;
      border-left: 5px solid #6B5030;
      padding: 14px 20px;
    }
    .grand-bar .gl {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16pt; font-weight: 700; color: #1A120A;
      letter-spacing: 0.06em;
    }
    .grand-bar .gs { font-size: 7.5pt; color: #9B8E82; margin-top: 3px; }
    .grand-bar .gv {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28pt; font-weight: 700; color: #3D2408;
      letter-spacing: -0.01em;
    }
    .grand-bar.standalone {
      border-top: 2px solid #6B5030;
      margin-top: 12px; padding: 18px 24px;
    }
    .grand-bar.standalone .gl { font-size: 18pt; }
    .grand-bar.standalone .gv { font-size: 34pt; }

    /* ── FOOTER ── */
    .footer {
      font-size: 7.5pt; color: #9B8E82;
      text-align: center; margin-top: 10px;
      padding-top: 6px; border-top: 1px solid #DDD5C8;
      letter-spacing: 0.03em;
    }
    .gap { height: 9px; }
  `;

    // helpers
  const ic  = (l, v) => `<div class="ic"><div class="ic-lbl">${l}</div><div class="ic-val">${v || "—"}</div></div>`;
  const sub = (l, v) => `<div class="sub-bar"><span class="sub-bar-lbl">${l}</span><span class="sub-bar-val">${fmtN(v)}</span></div>`;

  // ── PAGE 1: SUMMARY ──────────────────────────────────────────
  let html = `<div class="page">
  <div class="hdr">
    <div>
      <div class="co-brand">
        <img src="data:image/png;base64,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" class="co-logo" alt="EWP Logo" />
        <div>
          <div class="co-name">Engstrom Wood Products</div>
          <div class="co-tag">CUSTOM CABINETRY &nbsp;·&nbsp; FINE WOODWORKING &nbsp;·&nbsp; PRECISION INSTALLATION</div>
        </div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="doc-type">QUOTE — INTERNAL USE</div>
      <div class="doc-id">${project.id}</div>
    </div>
  </div>

  <div class="info-strip">
    ${ic("Project Name", project.name)}
    ${ic("Address", project.address)}
    ${ic("Bid Date", fmtD(project.bidDate))}
    ${ic("Contact", project.contactName)}
    ${ic("Phone", project.contactPhone)}
    ${ic("Email", project.email)}
  </div>

  <div class="sec">ROOM BREAKDOWN</div>
  <table>
    <colgroup>
      <col style="width:28%"><col style="width:14%"><col style="width:14%">
      <col style="width:14%"><col style="width:15%"><col style="width:15%">
    </colgroup>
    <thead><tr>
      <th>Room</th>
      <th class="r">Cabinetry</th>
      <th class="r">Upgrades</th>
      <th class="r">Finishing</th>
      <th class="r">Installation</th>
      <th class="r">Room Total</th>
    </tr></thead>
    <tbody>
      ${roomTotals.map((r,i) => `<tr>
        <td><strong>${r.name || "Room "+(i+1)}</strong></td>
        <td class="num">${fmtN(r.cab)}</td>
        <td class="num">${fmtN(r.upg)}</td>
        <td class="num">${fmtN(r.fin)}</td>
        <td class="num">${fmtN(r.inst)}</td>
        <td class="amt">${fmtN(r.total)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  ${sub("PROJECT TOTALS &nbsp;— all rooms combined",
    grandCab + grandUpg + grandFin + grandInst)}

  ${delivery > 0 ? `
  <div class="grand-bar standalone" style="margin-top:8px; background:#FAF7F2; border-color:#DDD5C8;">
    <div>
      <div class="gl" style="font-size:11pt; color:#8C7355;">DELIVERY</div>
      ${project.deliveryNotes ? `<div class="gs">${project.deliveryNotes}</div>` : ""}
    </div>
    <div class="gv" style="font-size:15pt; color:#8C7355;">${fmtN(delivery)}</div>
  </div>` : ""}

  ${project.taxEnabled ? `
  <div class="grand-bar standalone" style="margin-top:4px; background:#FAF7F2; border-color:#DDD5C8;">
    <div>
      <div class="gl" style="font-size:11pt; color:#8C7355;">ESTIMATED TAX (${pdfTaxRate}%)</div>
      <div class="gs">Applied to project subtotal${delivery > 0 ? " including delivery" : ""}</div>
    </div>
    <div class="gv" style="font-size:15pt; color:#8C7355;">${fmtN(pdfTaxAmt)}</div>
  </div>` : ""}

  <div class="grand-bar standalone">
    <div>
      <div class="gl">GRAND TOTAL</div>
      <div class="gs">All rooms &nbsp;·&nbsp; ${rooms.length} room${rooms.length!==1?"s":""} &nbsp;·&nbsp; ${fmtD(project.bidDate)}${delivery > 0 ? " &nbsp;·&nbsp; incl. delivery" : ""}${project.taxEnabled ? ` &nbsp;·&nbsp; incl. ${pdfTaxRate}% tax` : ""}</div>
    </div>
    <div class="gv">${fmtN(grandTotal)}</div>
  </div>

  <div style="margin-top:28px; display:grid; grid-template-columns:1fr 1fr; gap:32px;">
    <div>
      <div style="font-size:8pt; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#9B8E82; margin-bottom:6px;">Client Acceptance</div>
      <div style="border-bottom:1px solid #2A2118; height:36px; margin-bottom:6px;"></div>
      <div style="margin-bottom:4px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Printed Name</div>
      </div>
      <div style="margin-top:12px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Date</div>
      </div>
    </div>
    <div>
      <div style="font-size:8pt; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#9B8E82; margin-bottom:6px;">Authorized by Engstrom Wood Products</div>
      <div style="border-bottom:1px solid #2A2118; height:36px; margin-bottom:6px;"></div>
      <div style="margin-bottom:4px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Printed Name</div>
      </div>
      <div style="margin-top:12px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Date</div>
      </div>
    </div>
  </div>

  <div class="footer">This estimate is valid for 30 days from the bid date. All prices subject to final measurement verification. &nbsp;|&nbsp; Engstrom Wood Products</div>
</div>`;

  // ── PER-ROOM PAGES ───────────────────────────────────────────
  rooms.forEach((room, ri) => {
    const rt = roomTotals[ri];
    const cabItems = room.cabinetry.filter(i => i.product && parseFloat(i.qty) > 0);
    const upgItems = room.upgrades.filter(i => i.upgrade && parseFloat(i.qty) > 0);
    const finItems = room.finishing.filter(i => i.type && parseFloat(i.lf) > 0);
    const instDef  = PRICING.installType.find(i => i.name === room.install.type);

    const cabRows = cabItems.length === 0
      ? `<tr><td colspan="9" class="muted">No cabinetry items entered</td></tr>`
      : cabItems.map(item => {
          const prod = PRICING.woodwork.find(w => w.name === item.product);
          const con  = PRICING.construction.find(c => c.name === item.construction);
          const wood = PRICING.wood.find(w => w.name === item.wood);
          const sp   = prod ? prod.price*(1+(con?.premium||0))*(1+(wood?.premium||0)) : 0;
          const qty  = parseFloat(item.qty)||0;
          const finLF= prod ? (prod.finLF*qty).toFixed(1) : "0.0";
          const adj  = parseFloat(item.adjPct)||0;
          const tot  = sp*qty*(1+adj/100);
          return `<tr>
            <td>${item.product}</td>
            <td>${item.construction==="Not Applicable"?"—":item.construction}</td>
            <td>${item.wood==="Not Applicable"?"—":item.wood}</td>
            <td class="num">${con?.premium?(con.premium*100).toFixed(0)+"%":"0%"}</td>
            <td class="num">${wood?.premium?(wood.premium*100).toFixed(0)+"%":"0%"}</td>
            <td class="num">${qty}</td>
            <td class="num">${finLF}</td>
            <td class="num">${fmtN(sp)}</td>
            <td class="amt">${fmtN(tot)}</td>
          </tr>`;
        }).join("");

    const upgRows = upgItems.length === 0
      ? `<tr><td colspan="7" class="muted">No upgrades entered</td></tr>`
      : upgItems.map(item => {
          const upg = PRICING.upgrades.find(u => u.name === item.upgrade);
          const qty = parseFloat(item.qty)||0;
          const adj = parseFloat(item.adjPct)||0;
          const tot = (upg?.price||0)*qty*(1+adj/100);
          return `<tr>
            <td>${item.upgrade}</td>
            <td class="num">${qty}</td>
            <td class="num">${fmtN(upg?.price||0)}</td>
            <td class="num">${fmtN((upg?.price||0)*qty)}</td>
            <td class="num">${adj?adj+"%":"—"}</td>
            <td class="amt">${fmtN(tot)}</td>
            <td>${item.notes||""}</td>
          </tr>`;
        }).join("");

    const finRows = finItems.length === 0
      ? `<tr><td colspan="7" class="muted">No finishing items entered</td></tr>`
      : finItems.map(item => {
          const fin = PRICING.finishing.find(f => f.name === item.type);
          const lf  = parseFloat(item.lf)||0;
          const adj = parseFloat(item.adjPct)||0;
          const sub2= (fin?.pricePerLF||0)*lf;
          const tot = sub2*(1+adj/100);
          return `<tr>
            <td>${item.type}</td>
            <td class="num">${lf}</td>
            <td class="num">${fmtN(fin?.pricePerLF||0)}/LF</td>
            <td class="num">${fmtN(sub2)}</td>
            <td class="num">${adj?adj+"%":"—"}</td>
            <td class="amt">${fmtN(tot)}</td>
            <td>${item.notes||""}</td>
          </tr>`;
        }).join("");

    const instMetric = room.install.type === "Hourly Rate"
      ? (room.install.metric||"0")+" hrs × $135.00/hr"
      : instDef ? (instDef.rate*100).toFixed(0)+"% of cabinetry" : "—";
    const instPrice = room.install.type === "Hourly Rate"
      ? fmtN((parseFloat(room.install.metric)||0)*135)
      : fmtN(instDef ? rt.cab*instDef.rate : 0);
    const instAdj = room.install.adjPct ? room.install.adjPct+"%" : "0%";

    html += `<div class="page">
  <div class="hdr">
    <div>
      <div class="co-brand">
        <img src="data:image/png;base64,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" class="co-logo" alt="EWP Logo" />
        <div>
          <div class="co-name">Engstrom Wood Products</div>
          <div class="co-tag">CUSTOM CABINETRY &nbsp;·&nbsp; FINE WOODWORKING &nbsp;·&nbsp; PRECISION INSTALLATION</div>
        </div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="doc-type">QUOTE — ${room.name || "Room "+(ri+1)}</div>
      <div class="doc-id">${project.id} &nbsp;·&nbsp; ${project.name} &nbsp;·&nbsp; ${fmtD(project.bidDate)}</div>
    </div>
  </div>

  <div class="info-strip">
    ${ic("Room", room.name || "Room "+(ri+1))}
    ${ic("Room", (ri+1)+" of "+rooms.length)}
    ${ic("Bid Date", fmtD(project.bidDate))}
    ${ic("Master Adj %", (room.cabinetry[0]?.adjPct||"0")+"%")}
  </div>

  <div class="block">
    <div class="sec">CABINETRY</div>
    <table>
      <colgroup>
        <col style="width:22%"><col style="width:15%"><col style="width:11%">
        <col style="width:6%"><col style="width:6%">
        <col style="width:6%"><col style="width:6%">
        <col style="width:12%"><col style="width:16%">
      </colgroup>
      <thead><tr>
        <th>Product Type</th><th>Construction</th><th>Wood Type</th>
        <th class="r">Const%</th><th class="r">Spec%</th>
        <th class="r">LF/Qty</th><th class="r">Fin.LF</th>
        <th class="r">Std Price</th><th class="r">Mod. Total</th>
      </tr></thead>
      <tbody>${cabRows}</tbody>
    </table>
    ${sub("Cabinetry Total", rt.cab)}
  </div>

  <div class="block">
    <div class="sec">UPGRADES / OVERRIDES</div>
    <table>
      <colgroup>
        <col style="width:35%"><col style="width:8%"><col style="width:13%">
        <col style="width:13%"><col style="width:8%"><col style="width:13%"><col style="width:10%">
      </colgroup>
      <thead><tr>
        <th>Description</th><th class="r">Qty</th><th class="r">Unit $</th>
        <th class="r">Price</th><th class="r">% Adj</th><th class="r">Total</th><th>Notes</th>
      </tr></thead>
      <tbody>${upgRows}</tbody>
    </table>
    ${sub("Upgrades Total", rt.upg)}
  </div>

  <div class="block">
    <div class="sec">FINISHING</div>
    <table>
      <colgroup>
        <col style="width:30%"><col style="width:9%"><col style="width:13%">
        <col style="width:13%"><col style="width:8%"><col style="width:13%"><col style="width:14%">
      </colgroup>
      <thead><tr>
        <th>Type</th><th class="r">Lin. Ft</th><th class="r">Price/LF</th>
        <th class="r">Subtotal</th><th class="r">% Adj</th><th class="r">Total</th><th>Notes</th>
      </tr></thead>
      <tbody>${finRows}</tbody>
    </table>
    ${sub("Finishing Total", rt.fin)}
  </div>

  <div class="block">
    <div class="sec">INSTALLATION</div>
    <div class="install-grid">
      ${ic("Install Type", room.install.type||"—")}
      ${ic("Metric / Method", instMetric)}
      ${ic("Base Price", instPrice)}
      ${ic("% Adjustment", instAdj)}
    </div>
    ${sub("Install Total", rt.inst)}
  </div>

  <div class="totals-strip">
    <div class="ts"><div class="ts-lbl">Cabinetry</div><div class="ts-val">${fmtN(rt.cab)}</div></div>
    <div class="ts"><div class="ts-lbl">Upgrades</div><div class="ts-val">${fmtN(rt.upg)}</div></div>
    <div class="ts"><div class="ts-lbl">Finishing</div><div class="ts-val">${fmtN(rt.fin)}</div></div>
    <div class="ts"><div class="ts-lbl">Installation</div><div class="ts-val">${fmtN(rt.inst)}</div></div>
  </div>
  <div class="grand-bar">
    <div>
      <div class="gl">ROOM GRAND TOTAL</div>
      <div class="gs">${room.name||"Room "+(ri+1)} &nbsp;·&nbsp; Room ${ri+1} of ${rooms.length}</div>
    </div>
    <div class="gv">${fmtN(rt.total)}</div>
  </div>

  <div class="footer">This estimate is valid for 30 days from the bid date. All prices subject to final measurement verification. &nbsp;|&nbsp; Engstrom Wood Products</div>
</div>`;
  });

  // ── open print window ─────────────────────────────────────────
  const win = window.open("about:blank", "_blank");
  if (!win) { onStatus("error", "Pop-ups blocked — please allow pop-ups for this site."); return; }

  const safeName = (project.name||"Estimate").replace(/[^a-zA-Z0-9_\- ]/g,"");
  win.document.open();
  win.document.write("<!DOCTYPE html><html><head>");
  win.document.write("<meta charset='utf-8'>");
  win.document.write("<title>EWP — " + safeName + "</title>");
  win.document.write("<style>" + css + "</style>");
  win.document.write("</head><body>");
  win.document.write(html);
  win.document.write("</body></html>");
  win.document.close();

  win.onload = function() {
    setTimeout(function() { win.focus(); win.print(); onStatus("done"); }, 900);
  };
  if (win.document.readyState === "complete") {
    setTimeout(function() { win.focus(); win.print(); onStatus("done"); }, 900);
  }
}

function exportPDFCustomer(project, rooms, onStatus) {
  onStatus("generating");

  const fmtN = (n) => n == null ? "$0.00" : new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(n);
  const fmtD = (d) => { if (!d) return ""; const [y,m,day] = d.split("-"); return new Date(+y,+m-1,+day).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };

  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry);
    const upg  = calcUpgrades(r.upgrades);
    const fin  = calcFinishing(r.finishing);
    const inst = calcInstall(r.install, cab);
    return { name: r.name, total: cab + upg + fin + inst };
  });
  const grandSubtotal = roomTotals.reduce((s,r) => s + r.total, 0);
  const delivery   = parseFloat(project.deliveryAmount) || 0;
  const pdfTaxRate = parseFloat(project.taxRate) || 8;
  const pdfSubtotal = grandSubtotal + delivery;
  const pdfTaxAmt  = project.taxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0;
  const grandTotal = pdfSubtotal + pdfTaxAmt;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    @page { size: 11in 8.5in landscape; margin: 0.4in 0.48in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', Arial, sans-serif; font-size: 10pt; color: #333; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }

    /* ─── PALETTE
       Page bg:      #FFFFFF
       Ivory light:  #FAF7F2   (table alt row, info strip bg)
       Ivory mid:    #F2EDE4   (table header, section header bg)
       Ivory border: #DDD5C8   (all dividers)
       Warm stone:   #8C7355   (accent, labels, borders)
       Deep ink:     #2A2118   (headings, strong text)
       Text body:    #3D3228
       Muted text:   #9B8E82
    ─── */

    /* ── HEADER ── */
    .hdr {
      display: flex; flex-direction: column; gap: 8px;
      padding: 13px 20px 11px;
      background: #FAF7F2;
      border-bottom: 2px solid #8C7355;
      margin-bottom: 12px;
    }
    .co-brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .co-logo { height: 70px; width: auto; display: block; }
    .co-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 27pt; font-weight: 700;
      color: #2A2118; letter-spacing: 0.02em; line-height: 1;
      white-space: nowrap;
    }
    .co-tag { font-size: 9.5pt; color: #9B8E82; margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
    .hdr-right { text-align: left; }
    .doc-type {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14pt; font-weight: 600;
      color: #8C7355; letter-spacing: 0.1em; line-height: 1;
    }
    .doc-id { font-size: 7.5pt; color: #9B8E82; margin-top: 4px; letter-spacing: 0.05em; }

    /* ── INFO STRIP ── */
    .info-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #DDD5C8;
      border-left: 3px solid #8C7355;
      border-radius: 2px;
      margin-bottom: 12px;
      background: #FAF7F2;
      overflow: hidden;
    }
    .ic { padding: 7px 12px 8px; border-right: 1px solid #DDD5C8; border-bottom: 1px solid #DDD5C8; }
    .ic:nth-child(even) { border-right: none; }
    .ic:nth-last-child(-n+2) { border-bottom: none; }
    .ic-lbl { font-size: 7pt; font-weight: 600; color: #8C7355; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
    .ic-val { font-size: 10.5pt; font-weight: 500; color: #2A2118; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── SECTION LABEL ── */
    .sec {
      background: #F2EDE4;
      color: #2A2118;
      font-family: 'DM Sans', Arial, sans-serif;
      font-size: 8pt; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      padding: 5px 10px;
      border-top: 1.5px solid #8C7355;
      border-left: 1px solid #DDD5C8;
      border-right: 1px solid #DDD5C8;
    }

    /* ── TABLE ── */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    thead th {
      background: #F2EDE4;
      font-size: 6.5pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #5A4E42; padding: 4px 5px;
      text-align: left;
      border-bottom: 1px solid #DDD5C8;
      border-left: 1px solid #DDD5C8;
      white-space: nowrap;
      overflow: hidden;
    }
    thead th:first-child { border-left: none; }
    thead th.r { text-align: right; }
    tbody tr { border-bottom: 1px solid #EDE6DC; }
    tbody tr:nth-child(even) td { background: #FAF7F2; }
    tbody td { padding: 4px 5px; vertical-align: middle; color: #3D3228; border-left: 1px solid #EDE6DC; word-break: break-word; overflow: hidden; }
    tbody td:first-child { border-left: none; }
    tbody td.r { text-align: right; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody td.amt { text-align: right; font-weight: 600; color: #5A3E1A; font-variant-numeric: tabular-nums; }
    table { border: 1px solid #DDD5C8; border-top: none; table-layout: fixed; }
    .col-fill { width: auto; }

    /* ── GRAND TOTAL ── */
    .grand-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #E8E0D4;
      border: 1px solid #C8B89A;
      border-top: none;
      border-left: 5px solid #6B5030;
      padding: 14px 20px;
    }
    .grand-bar .gl {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16pt; font-weight: 700; color: #1A120A;
      letter-spacing: 0.06em;
    }
    .grand-bar .gs { font-size: 7.5pt; color: #9B8E82; margin-top: 3px; }
    .grand-bar .gv {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28pt; font-weight: 700; color: #3D2408;
      letter-spacing: -0.01em;
    }
    .grand-bar.standalone {
      border-top: 2px solid #6B5030;
      margin-top: 12px; padding: 18px 24px;
    }
    .grand-bar.standalone .gl { font-size: 18pt; }
    .grand-bar.standalone .gv { font-size: 34pt; }

    /* ── FOOTER ── */
    .footer {
      font-size: 7.5pt; color: #9B8E82;
      text-align: center; margin-top: 10px;
      padding-top: 6px; border-top: 1px solid #DDD5C8;
      letter-spacing: 0.03em;
    }
    .thank-you {
      background: #FAF7F2;
      border: 1px solid #DDD5C8;
      border-left: 3px solid #8C7355;
      border-radius: 2px;
      padding: 16px 20px;
      margin-top: 16px;
      text-align: center;
    }
    .thank-you h3 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14pt; font-weight: 600; color: #2A2118;
      margin-bottom: 6px;
    }
    .thank-you p {
      font-size: 9pt; color: #9B8E82; line-height: 1.5;
    }
  `;

  // helpers
  const ic = (l, v) => `<div class="ic"><div class="ic-lbl">${l}</div><div class="ic-val">${v || "—"}</div></div>`;

  // ── CUSTOMER QUOTE PAGE ──────────────────────────────────────
  let html = `<div class="page">
  <div class="hdr">
    <div>
      <div class="co-brand">
        <img src="data:image/png;base64,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" class="co-logo" />
        <div>
          <div class="co-name">Engstrom Wood Products</div>
          <div class="co-tag">CUSTOM CABINETRY &nbsp;·&nbsp; FINE WOODWORKING &nbsp;·&nbsp; PRECISION INSTALLATION</div>
        </div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="doc-type">QUOTE — FOR CUSTOMER</div>
      <div class="doc-id">${project.id}</div>
    </div>
  </div>

  <div class="info-strip">
    ${ic("Project Name", project.name)}
    ${ic("Address", project.address)}
    ${ic("Bid Date", fmtD(project.bidDate))}
    ${ic("Contact", project.contactName)}
    ${ic("Phone", project.contactPhone)}
    ${ic("Email", project.email)}
  </div>

  <div class="sec">PROJECT SUMMARY</div>
  <table>
    <colgroup>
      <col style="width:60%"><col style="width:40%">
    </colgroup>
    <thead><tr>
      <th>Room</th>
      <th class="r">Room Total</th>
    </tr></thead>
    <tbody>
      ${roomTotals.map((r,i) => `<tr>
        <td><strong>${r.name || "Room "+(i+1)}</strong></td>
        <td class="amt">${fmtN(r.total)}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  ${delivery > 0 ? `
  <div class="grand-bar standalone" style="margin-top:8px; background:#FAF7F2; border-color:#DDD5C8;">
    <div>
      <div class="gl" style="font-size:11pt; color:#8C7355;">DELIVERY</div>
      ${project.deliveryNotes ? `<div class="gs">${project.deliveryNotes}</div>` : ""}
    </div>
    <div class="gv" style="font-size:15pt; color:#8C7355;">${fmtN(delivery)}</div>
  </div>` : ""}

  ${project.taxEnabled ? `
  <div class="grand-bar standalone" style="margin-top:4px; background:#FAF7F2; border-color:#DDD5C8;">
    <div>
      <div class="gl" style="font-size:11pt; color:#8C7355;">ESTIMATED TAX (${pdfTaxRate}%)</div>
      <div class="gs">Applied to project subtotal${delivery > 0 ? " including delivery" : ""}</div>
    </div>
    <div class="gv" style="font-size:15pt; color:#8C7355;">${fmtN(pdfTaxAmt)}</div>
  </div>` : ""}

  <div class="grand-bar standalone">
    <div>
      <div class="gl">GRAND TOTAL</div>
      <div class="gs">${rooms.length} room${rooms.length!==1?"s":""} &nbsp;·&nbsp; ${fmtD(project.bidDate)}${delivery > 0 ? " &nbsp;·&nbsp; incl. delivery" : ""}${project.taxEnabled ? ` &nbsp;·&nbsp; incl. ${pdfTaxRate}% tax` : ""}</div>
    </div>
    <div class="gv">${fmtN(grandTotal)}</div>
  </div>

  <div class="thank-you">
    <h3>Thank You for Considering Engstrom Wood Products</h3>
    <p>We look forward to working with you on this project. Please contact us if you have any questions.</p>
  </div>

  <div style="margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:32px;">
    <div>
      <div style="font-size:8pt; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#9B8E82; margin-bottom:6px;">Client Acceptance</div>
      <div style="border-bottom:1px solid #2A2118; height:36px; margin-bottom:6px;"></div>
      <div style="margin-bottom:4px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Printed Name</div>
      </div>
      <div style="margin-top:12px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Date</div>
      </div>
    </div>
    <div>
      <div style="font-size:8pt; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#9B8E82; margin-bottom:6px;">Authorized by Engstrom Wood Products</div>
      <div style="border-bottom:1px solid #2A2118; height:36px; margin-bottom:6px;"></div>
      <div style="margin-bottom:4px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Printed Name</div>
      </div>
      <div style="margin-top:12px;">
        <div style="border-bottom:1px solid #DDD5C8; height:24px; margin-bottom:4px;"></div>
        <div style="font-size:7.5pt; color:#9B8E82;">Date</div>
      </div>
    </div>
  </div>

  <div class="footer">This quote is valid for 30 days from the bid date. All prices subject to final measurement verification. &nbsp;|&nbsp; Engstrom Wood Products</div>
</div>`;

  // ── open print window ─────────────────────────────────────────
  const win = window.open("about:blank", "_blank");
  if (!win) { onStatus("error", "Pop-ups blocked — please allow pop-ups for this site."); return; }

  const safeName = (project.name||"Quote").replace(/[^a-zA-Z0-9_\- ]/g,"");
  win.document.open();
  win.document.write("<!DOCTYPE html><html><head>");
  win.document.write("<meta charset='utf-8'>");
  win.document.write("<title>EWP — " + safeName + "</title>");
  win.document.write("<style>" + css + "</style>");
  win.document.write("</head><body>");
  win.document.write(html);
  win.document.write("</body></html>");
  win.document.close();

  win.onload = function() {
    setTimeout(function() { win.focus(); win.print(); onStatus("done"); }, 900);
  };
  if (win.document.readyState === "complete") {
    setTimeout(function() { win.focus(); win.print(); onStatus("done"); }, 900);
  }
}

// ── COMPONENTS ─────────────────────────────────────────────────

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return <div className="toast">{msg}</div>;
}

function Field({ label, error, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

// ── PROJECT SETUP PAGE ─────────────────────────────────────────
function ProjectSetup({ project, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!project.name) e.name = "Required";
    if (!project.address) e.address = "Required";
    if (!project.bidDate) e.bidDate = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Project Details</div>
        <div className="gold-rule" />
        <div className="page-subtitle">Enter the project and client information to get started.</div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">CLIENT INFORMATION</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <Field label="Project Name" error={errors.name}>
              <input className={errors.name ? "error" : ""} value={project.name} placeholder="e.g. Johnson Kitchen Remodel"
                onChange={e => onChange({ name: e.target.value })} />
            </Field>
            <Field label="Project Address" error={errors.address}>
              <input className={errors.address ? "error" : ""} value={project.address} placeholder="123 Main St, Minneapolis MN"
                onChange={e => onChange({ address: e.target.value })} />
            </Field>
            <Field label="Contact Name">
              <input value={project.contactName} placeholder="Full name"
                onChange={e => onChange({ contactName: e.target.value })} />
            </Field>
            <Field label="Contact Phone">
              <input
                value={project.contactPhone}
                placeholder="(612) 555-0100"
                maxLength={14}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                  let formatted = ""
                  if (digits.length === 0) formatted = ""
                  else if (digits.length <= 3) formatted = `(${digits}`
                  else if (digits.length <= 6) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
                  else formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                  onChange({ contactPhone: formatted })
                }}
              />
            </Field>
            <Field label="Email Address">
              <input type="email" value={project.email} placeholder="client@email.com"
                onChange={e => onChange({ email: e.target.value })} />
            </Field>
            <Field label="Bid Date" error={errors.bidDate}>
              <input
                className={errors.bidDate ? "error" : ""}
                type="date"
                value={project.bidDate}
                onChange={e => onChange({ bidDate: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">CONTRACTOR DETAILS</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <Field label="Is there a Contractor?">
              <select value={project.contractorYN} onChange={e => onChange({ contractorYN: e.target.value })}>
                <option>No</option><option>Yes</option>
              </select>
            </Field>
            {project.contractorYN === "Yes" && <>
              <Field label="Contractor Name">
                <input value={project.contractorName} placeholder="Company name"
                  onChange={e => onChange({ contractorName: e.target.value })} />
              </Field>
              <Field label="Contractor Contact">
                <input value={project.contractorContact} placeholder="Phone or email"
                  onChange={e => {
                    const raw = e.target.value
                    // Only auto-format if it looks like a phone number (digits/spaces/parens/dashes only)
                    const isPhone = /^[\d\s()\-+]*$/.test(raw) && /\d/.test(raw)
                    if (isPhone) {
                      const digits = raw.replace(/\D/g, "").slice(0, 10)
                      let formatted = ""
                      if (digits.length === 0) formatted = ""
                      else if (digits.length <= 3) formatted = `(${digits}`
                      else if (digits.length <= 6) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
                      else formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                      onChange({ contractorContact: formatted })
                    } else {
                      onChange({ contractorContact: raw })
                    }
                  }} />
              </Field>
            </>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">SCOPE</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <Field label="Master Adjustment %">
              <input type="number" step="0.1" value={project.masterAdj} placeholder="0"
                onChange={e => onChange({ masterAdj: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-24">
        <span className="text-muted">Project ID: {project.id}</span>
        <button className="btn btn-gold btn-lg" onClick={handleNext}>
          Continue to Rooms →
        </button>
      </div>
    </div>
  );
}

// ── CABINETRY SECTION ──────────────────────────────────────────
function CabinetrySection({ items, masterAdj, onChange }) {
  const update = (i, field, val) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [field]: val } : it);
    onChange(next);
  };
  const addRow    = () => onChange([...items, { ...blankCabRow(), adjPct: masterAdj != null ? String(masterAdj) : "" }]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };

  const subTotal = calcCabinetry(items);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>CABINETRY</span>
        <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff", border: "none" }} onClick={addRow}>+ Add Row</button>
      </div>
      <div className="scrollable">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Product Type</th>
              <th style={{ width: 140 }}>Construction</th>
              <th style={{ width: 130 }}>Wood Type</th>
              <th style={{ width: 70 }}>LF / Qty</th>
              <th style={{ width: 80 }}>% Adj</th>
              <th style={{ width: 120 }}>Line Total</th>
              <th style={{ width: 140 }}>Notes</th>
              <th style={{ width: 36 }} />
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
                    <select value={item.product} onChange={e => update(i, "product", e.target.value)}>
                      <option value="">— Select —</option>
                      {PRICING.woodwork.map(w => <option key={w.name}>{w.name}</option>)}
                    </select>
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
                  <td><input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} /></td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.product && qty > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.product && qty > 0 ? fmt(lineTotal) : "—"}
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

// ── UPGRADES SECTION ───────────────────────────────────────────
function UpgradesSection({ items, masterAdj, onChange }) {
  const update = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow = () => onChange([...items, { ...blankUpgRow(), adjPct: masterAdj != null ? String(masterAdj) : "" }]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };
  const subTotal = calcUpgrades(items);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>UPGRADES / OVERRIDES</span>
        <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff", border: "none" }} onClick={addRow}>+ Add Row</button>
      </div>
      <div className="scrollable">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 260 }}>Upgrade / Override</th>
              <th style={{ width: 80 }}>Qty</th>
              <th style={{ width: 110 }}>Unit Price</th>
              <th style={{ width: 80 }}>% Adj</th>
              <th style={{ width: 110 }}>Total</th>
              <th style={{ width: 140 }}>Notes</th>
              <th style={{ width: 36 }} />
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
                  </td>
                  <td><input type="number" min="0" value={item.qty} onChange={e => update(i, "qty", e.target.value)} /></td>
                  <td className="num-cell" style={{ color: "var(--mid)", fontSize: 12 }}>{upg ? fmt(upg.price) : "—"}</td>
                  <td><input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} /></td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.upgrade && qty > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.upgrade && qty > 0 ? fmt(total) : "—"}
                  </td>
                  <td><input value={item.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Notes…" /></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: items.length > 1 ? "var(--red)" : "var(--rule)", cursor: items.length > 1 ? "pointer" : "default" }} onClick={() => removeRow(i)}>✕</button></td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Upgrades Total</td>
              <td className="num-cell">{fmt(subTotal)}</td>
              <td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── FINISHING SECTION ──────────────────────────────────────────
function FinishingSection({ items, cabinetry = [], onChange }) {
  const update = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow    = () => onChange([...items, blankFinRow()]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };
  const subTotal = calcFinishing(items);
  const estimatedLF = calcEstimatedFinishingLF(cabinetry);
  const enteredLF = items.reduce((s, it) => s + (parseFloat(it.lf) || 0), 0);
  const lfDiff = enteredLF - estimatedLF;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>FINISHING</span>
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
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>Finishing Type</th>
              <th style={{ width: 100 }}>Price / LF</th>
              <th style={{ width: 100 }}>Linear Feet</th>
              <th style={{ width: 80 }}>% Adj</th>
              <th style={{ width: 110 }}>Total</th>
              <th style={{ width: 140 }}>Notes</th>
              <th style={{ width: 36 }} />
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
                  </td>
                  <td className="num-cell" style={{ color: "var(--mid)", fontSize: 12 }}>{fin ? fmt(fin.pricePerLF) + "/LF" : "—"}</td>
                  <td><input type="number" min="0" step="0.5" value={item.lf} onChange={e => update(i, "lf", e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={item.adjPct} placeholder="0" onChange={e => update(i, "adjPct", e.target.value)} /></td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: item.type && lf > 0 ? "var(--gold)" : "var(--muted)" }}>
                    {item.type && lf > 0 ? fmt(total) : "—"}
                  </td>
                  <td><input value={item.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Notes…" /></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: items.length > 1 ? "var(--red)" : "var(--rule)", cursor: items.length > 1 ? "pointer" : "default" }} onClick={() => removeRow(i)}>✕</button></td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Finishing Total</td>
              <td className="num-cell">{fmt(subTotal)}</td>
              <td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── INSTALLATION SECTION ───────────────────────────────────────
function InstallSection({ data, cabTotal, onChange }) {
  const instTotal = calcInstall(data, cabTotal);
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-banner">INSTALLATION</div>
      <div className="card-body">
        <div className="form-grid form-grid-4">
          <Field label="Install Type">
            <select value={data.type} onChange={e => onChange({ ...data, type: e.target.value })}>
              <option value="">— Select —</option>
              {PRICING.installType.map(i => <option key={i.name}>{i.name}</option>)}
            </select>
          </Field>
          {data.type === "Hourly Rate" && (
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
            {data.type !== "Hourly Rate" && <div className="text-muted" style={{ marginTop: 4 }}>Based on {PRICING.installType.find(i => i.name === data.type)?.rate * 100}% of cabinetry total</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ROOMS PAGE ─────────────────────────────────────────────────
function RoomsPage({ project, rooms, onRoomsChange, onAddRoom, onRemoveRoom, onDuplicateRoom, onNext, onBack }) {
  const [activeRoom, setActiveRoom] = useState(0);
  const room = rooms[Math.min(activeRoom, rooms.length - 1)];
  const safeActiveRoom = Math.min(activeRoom, rooms.length - 1);

  const updateRoom = (field, val) => {
    onRoomsChange(rooms.map((r, i) => i === safeActiveRoom ? { ...r, [field]: val } : r));
  };

  const cabTotal = calcCabinetry(room.cabinetry);
  const upgTotal = calcUpgrades(room.upgrades);
  const finTotal = calcFinishing(room.finishing);
  const instTotal = calcInstall(room.install, cabTotal);
  const roomTotal = cabTotal + upgTotal + finTotal + instTotal;

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

      {/* Room Tabs */}
      <div className="room-tabs" style={{ flexWrap: "wrap", gap: 6 }}>
        {rooms.map((r, i) => {
          const done = isRoomComplete(r);
          const isActive = i === safeActiveRoom;
          return (
            <div key={r.id}
              className={`room-tab ${isActive ? "active" : ""}`}
              style={{
                ...(done && !isActive ? { borderColor: "#2D7A4F", background: "#e8f4ed", color: "#2D7A4F" } : {}),
                display: "flex", alignItems: "center", gap: 6, paddingRight: 6,
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
        {[["Cabinetry", cabTotal], ["Upgrades", upgTotal], ["Finishing", finTotal], ["Installation", instTotal]].map(([lbl, val]) => (
          <div className="summary-card" key={lbl}>
            <div className="summary-card-label">{lbl}</div>
            <div className="summary-card-value">{fmt(val)}</div>
          </div>
        ))}
      </div>

      <CabinetrySection items={room.cabinetry} masterAdj={project.masterAdj} onChange={v => updateRoom("cabinetry", v)} />
      <UpgradesSection items={room.upgrades} masterAdj={project.masterAdj} onChange={v => updateRoom("upgrades", v)} />
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

// ── FINAL DETAILS PAGE ────────────────────────────────────────
function FinalDetailsPage({ project, rooms, onChange, onNext, onBack }) {
  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry);
    const upg  = calcUpgrades(r.upgrades);
    const fin  = calcFinishing(r.finishing);
    const inst = calcInstall(r.install, cab);
    return cab + upg + fin + inst;
  });
  const roomsSubtotal = roomTotals.reduce((s, v) => s + v, 0);
  const delivery   = parseFloat(project.deliveryAmount) || 0;
  const subtotal   = roomsSubtotal + delivery;
  const parsedTaxRate = parseFloat(project.taxRate)
  const taxRate    = Number.isFinite(parsedTaxRate) ? parsedTaxRate : 8
  const taxAmt     = project.taxEnabled ? subtotal * (taxRate / 100) : 0;
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
          <div className="form-grid form-grid-2">
            <Field label="Delivery Amount (USD)">
              <input type="number" min="0" step="0.01" value={project.deliveryAmount} placeholder="0.00"
                onChange={e => onChange({ deliveryAmount: e.target.value })} />
            </Field>
            <Field label="Delivery Notes">
              <input value={project.deliveryNotes} placeholder="e.g. Curbside drop-off, call ahead"
                onChange={e => onChange({ deliveryNotes: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">ESTIMATED TAX</span>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ fontSize: 12, color: "var(--gold-light)", fontWeight: 500 }}>
              {project.taxEnabled ? "Enabled" : "Disabled"}
            </span>
            <div
              onClick={() => onChange({ taxEnabled: !project.taxEnabled })}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: project.taxEnabled ? "var(--gold)" : "var(--ivory3)",
                position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
              }}>
              <div style={{
                position: "absolute", top: 3, left: project.taxEnabled ? 21 : 3,
                width: 16, height: 16, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </label>
        </div>
        <div className="card-body">
          {project.taxEnabled ? (
            <div className="form-grid form-grid-2">
              <Field label="Tax Rate (%)">
                <input
                  type="number"
                  min="0.1"
                  max="30"
                  step="0.1"
                  value={project.taxRate}
                  placeholder="8"
                  onChange={e => {
                    const raw = e.target.value
                    if (raw === "" || raw === "." || raw === "0" || raw === "0.") {
                      onChange({ taxRate: raw })
                      return
                    }
                    const n = parseFloat(raw)
                    onChange({ taxRate: Number.isFinite(n) ? raw : "" })
                  }}
                  onBlur={e => {
                    const n = parseFloat(project.taxRate)
                    if (!Number.isFinite(n) || n < 0.1) onChange({ taxRate: "8" })
                  }}
                />
              </Field>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", marginBottom: 4 }}>
                  Estimated Tax Amount
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "var(--gold)" }}>
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(taxAmt)}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {taxRate}% of {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(subtotal)} subtotal
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Toggle on to include an estimated tax in the quote. The default rate is 8% — you can adjust it as needed. Tax is applied to the full project subtotal including delivery.
            </p>
          )}
        </div>
      </div>

      {/* Live total preview */}
      <div className="card" style={{ background: "var(--ivory2)", border: "1px solid var(--ivory3)" }}>
        {(() => {
          const items = [
            ["Rooms Subtotal", roomsSubtotal],
            ["Delivery", delivery],
            ...(project.taxEnabled && taxAmt > 0 ? [["Tax" + ` (${taxRate}%)`, taxAmt]] : []),
            ["Grand Total", grandTotal],
          ]

          return (
            <div
              className="card-body"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${items.length}, 1fr)`,
                gap: 16,
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

// ── SUMMARY PAGE ───────────────────────────────────────────────
function SummaryPage({ project, rooms, onBack, onSave }) {
  const [pdfStatus, setPdfStatus] = useState("idle");
  const [pdfError, setPdfError]   = useState(null);

  const [pdfStatus2, setPdfStatus2] = useState("idle");
  const [pdfError2, setPdfError2] = useState(null);

  const handleExportInternal = () => {
    setPdfError(null);
    exportPDFInternal(project, rooms, (status, errMsg) => {
      setPdfStatus(status);
      if (errMsg) setPdfError(errMsg);
    });
  };

  const handleExportCustomer = () => {
    setPdfError2(null);
    exportPDFCustomer(project, rooms, (status, errMsg) => {
      setPdfStatus2(status);
      if (errMsg) setPdfError2(errMsg);
    });
  };

  const pdfBtnLabel = { idle:"📥 Quote (Internal)", generating:"⏳ Preparing…", done:"📥 Quote (Internal)", error:"⚠ Try Again" }[pdfStatus] || "📥 Quote (Internal)";
  const pdfBtnLabel2 = { idle:"📥 Quote (Customer)", generating:"⏳ Preparing…", done:"📥 Quote (Customer)", error:"⚠ Try Again" }[pdfStatus2] || "📥 Quote (Customer)";
  const pdfBusy = pdfStatus === "generating";
  const pdfBusy2 = pdfStatus2 === "generating";
  const roomTotals = rooms.map(r => {
    const cab = calcCabinetry(r.cabinetry);
    const upg = calcUpgrades(r.upgrades);
    const fin = calcFinishing(r.finishing);
    const inst = calcInstall(r.install, cab);
    return { name: r.name, cab, upg, fin, inst, total: cab + upg + fin + inst };
  });

  const grandCab  = roomTotals.reduce((s, r) => s + r.cab, 0);
  const grandUpg  = roomTotals.reduce((s, r) => s + r.upg, 0);
  const grandFin  = roomTotals.reduce((s, r) => s + r.fin, 0);
  const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0);
  const delivery  = parseFloat(project.deliveryAmount) || 0;
  const subtotalBeforeTax = grandCab + grandUpg + grandFin + grandInst + delivery;
  const taxRate   = parseFloat(project.taxRate) || 8;
  const taxAmt    = project.taxEnabled ? subtotalBeforeTax * (taxRate / 100) : 0;
  const grandTotal = subtotalBeforeTax + taxAmt;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <div className="page-title">Estimate Summary</div>
            <div className="gold-rule" />
            <div className="page-subtitle">{project.name} · {fmtDate(project.bidDate)} · ID: {project.id}</div>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-outline" onClick={handleExportInternal} disabled={pdfBusy} style={{opacity:pdfBusy?0.6:1}}>{pdfBtnLabel}</button>
            <button className="btn btn-outline" onClick={handleExportCustomer} disabled={pdfBusy2} style={{opacity:pdfBusy2?0.6:1}}>{pdfBtnLabel2}</button>
            
            <button className="btn btn-gold" onClick={onSave}>💾 Save Estimate</button>
          </div>
        </div>
      </div>

      {/* Project info bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            ["Project", project.name],
            ["Address", project.address],
            ["Contact", project.contactName || "—"],
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
                <th className="num-cell">Upgrades</th>
                <th className="num-cell">Finishing</th>
                <th className="num-cell">Installation</th>
                <th className="num-cell" style={{ color: "var(--gold)" }}>Room Total</th>
              </tr>
            </thead>
            <tbody>
              {roomTotals.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.name || `Room ${i + 1}`}</td>
                  <td className="num-cell">{fmt(r.cab)}</td>
                  <td className="num-cell">{fmt(r.upg)}</td>
                  <td className="num-cell">{fmt(r.fin)}</td>
                  <td className="num-cell">{fmt(r.inst)}</td>
                  <td className="num-cell" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>{fmt(r.total)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Totals</td>
                <td className="num-cell">{fmt(grandCab)}</td>
                <td className="num-cell">{fmt(grandUpg)}</td>
                <td className="num-cell">{fmt(grandFin)}</td>
                <td className="num-cell">{fmt(grandInst)}</td>
                <td className="num-cell">{fmt(grandCab + grandUpg + grandFin + grandInst)}</td>
              </tr>
              {delivery > 0 && (
                <tr className="total-row">
                  <td colSpan={5} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>
                    Delivery{project.deliveryNotes ? ` — ${project.deliveryNotes}` : ""}
                  </td>
                  <td className="num-cell">{fmt(delivery)}</td>
                </tr>
              )}
              {project.taxEnabled && (
                <tr className="total-row">
                  <td colSpan={5} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>
                    Estimated Tax ({taxRate}%)
                  </td>
                  <td className="num-cell">{fmt(taxAmt)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-room detail */}
      {rooms.map((room, ri) => {
        const rt = roomTotals[ri];
        const cabItems = room.cabinetry.filter(i => i.product && (parseFloat(i.qty) || 0) > 0);
        const upgItems = room.upgrades.filter(i => i.upgrade && (parseFloat(i.qty) || 0) > 0);
        const finItems = room.finishing.filter(i => i.type && (parseFloat(i.lf) || 0) > 0);
        const cabTotal = rt.cab;
        return (
          <div className="report-room" key={room.id}>
            <div className="card">
              <div className="card-header" style={{ justifyContent: "space-between" }}>
                <span className="card-title">{room.name || `ROOM ${ri + 1}`}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "var(--gold)", fontWeight: 700 }}>{fmt(rt.total)}</span>
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
                      const upg = PRICING.upgrades.find(u => u.name === item.upgrade);
                      const qty = parseFloat(item.qty) || 0;
                      const adj = parseFloat(item.adjPct) || 0;
                      return (
                        <div className="report-line" key={i}>
                          <span>{item.upgrade} × {qty}</span>
                          <span>{fmt((upg?.price || 0) * qty * (1 + adj / 100))}</span>
                        </div>
                      );
                    })}
                    <div className="report-line report-line-total"><span>Upgrades Total</span><span>{fmt(rt.upg)}</span></div>
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
      <div className="grand-total">
        <div className="grand-total-label">GRAND TOTAL</div>
        {(delivery > 0 || taxAmt > 0) && (
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, display: "flex", flexWrap: "wrap", gap: "0 8px", justifyContent: "center" }}>
            <span>Rooms {fmt(grandCab + grandUpg + grandFin + grandInst)}</span>
            {delivery > 0 && <span>+ Delivery {fmt(delivery)}</span>}
            {taxAmt > 0 && <span>+ Tax ({taxRate}%) {fmt(taxAmt)}</span>}
          </div>
        )}
        <div className="grand-total-value">{fmt(grandTotal)}</div>
      </div>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
        This estimate is valid for 30 days from the bid date. All prices subject to final measurement verification.
      </div>

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-outline" onClick={onBack}>← Back to Final Details</button>
        <div className="flex gap-8">
          <button className="btn btn-outline" onClick={handleExport} disabled={pdfBusy} style={{opacity:pdfBusy?0.6:1}}>{pdfBtnLabel}</button>
            
          <button className="btn btn-gold btn-lg" onClick={onSave}>💾 Save Estimate</button>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────
function Dashboard({ projects, onNew, onOpen, onDelete, onDuplicate, onGenerateQuote, onEmail }) {
  const [search, setSearch] = useState("");
  const filtered = projects
    .filter(p =>
      p.project.name.toLowerCase().includes(search.toLowerCase()) ||
      p.project.address.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Project IDs are "EWP" + YYYYMMDDHHmmss — sort descending (newest first)
      const idA = a.project.id || ""
      const idB = b.project.id || ""
      return idB.localeCompare(idA)
    })

  const totalRevenue = projects.reduce((s, p) => {
    const gt = p.rooms.reduce((rs, r) => {
      const cab = calcCabinetry(r.cabinetry);
      return rs + cab + calcUpgrades(r.upgrades) + calcFinishing(r.finishing) + calcInstall(r.install, cab);
    }, 0);
    return s + gt;
  }, 0);

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <div className="page-title">Projects</div>
            <div className="gold-rule" />
            <div className="page-subtitle">Engstrom Wood Products — Quote Management</div>
          </div>
          <button className="btn btn-gold btn-lg" onClick={onNew}>+ New Estimate</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          ["Total Projects", projects.length, "📋"],
          ["Active Estimates", projects.length, "📝"],
          ["Total Est. Value", fmt(totalRevenue), "💰"],
        ].map(([lbl, val, icon]) => (
          <div key={lbl} style={{
            background: "var(--card-bg)", border: "1px solid var(--ivory3)",
            borderRadius: 4, padding: "20px 24px",
            borderTop: "2px solid var(--gold)",
            boxShadow: "0 1px 6px rgba(20,15,5,0.04)",
          }}>
            <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.5 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "var(--char)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input placeholder="🔍  Search by project name or address…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400, background: "var(--card-bg)" }} />
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">{projects.length === 0 ? "No estimates yet" : "No results found"}</div>
          <div style={{ marginBottom: 20, color: "var(--muted)", fontSize: 14 }}>{projects.length === 0 ? "Create your first estimate to get started." : "Try a different search."}</div>
          {projects.length === 0 && <button className="btn btn-gold" onClick={onNew}>+ Create First Estimate</button>}
        </div>
      ) : (
        <div className="project-list">
          {filtered.map((p, i) => {
            const gt = p.rooms.reduce((rs, r) => {
              const cab = calcCabinetry(r.cabinetry);
              return rs + cab + calcUpgrades(r.upgrades) + calcFinishing(r.finishing) + calcInstall(r.install, cab);
            }, 0);
            const allComplete = p.rooms.every(isRoomComplete);
            // find real index in projects array (since filtered may differ)
            const realIdx = projects.indexOf(p);
            return (
              <div className="project-row" key={i} onClick={() => onOpen(realIdx)}
                style={{ cursor: "pointer", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="project-row-name">{p.project.name}</div>
                  <div className="project-row-meta">{p.project.address} · {p.rooms.length} room{p.rooms.length !== 1 ? "s" : ""} · {fmtDate(p.project.bidDate)}</div>
                </div>
                <div className="flex items-center gap-8" onClick={e => e.stopPropagation()}>
                  <div className="project-row-total" style={{ marginRight: 8, color: "var(--gold)" }}>{fmt(gt)}</div>
                  {/* Generate Quote */}
                  <button
                    className={`btn ${allComplete ? "btn-gold" : "btn-outline"}`}
                    style={{ fontSize: 10, padding: "4px 10px", opacity: allComplete ? 1 : 0.4, cursor: allComplete ? "pointer" : "not-allowed" }}
                    title={allComplete ? "Generate PDF quote" : "Complete all rooms to generate quote"}
                    onClick={() => allComplete && onGenerateQuote(realIdx)}>
                    📄 Quote
                  </button>
                  {/* Email */}
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 10, padding: "4px 10px" }}
                    title="Email this estimate"
                    onClick={() => onEmail(realIdx)}>
                    ✉ Email
                  </button>
                  {/* Duplicate */}
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 10, padding: "4px 10px" }}
                    title="Duplicate project"
                    onClick={() => onDuplicate(realIdx)}>
                    ⧉ Duplicate
                  </button>
                  {/* Delete */}
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 10, padding: "4px 10px", color: "var(--red)", borderColor: "rgba(184,59,46,0.3)" }}
                    title="Delete project"
                    onClick={() => onDelete(realIdx)}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ROOT APP ───────────────────────────────────────────────────
export default function App({ session, isAdmin, onOpenAdmin }) {
  const [view, setView] = useState("dashboard");
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletePendingIdx, setDeletePendingIdx] = useState(null);

  const [dark, setDark] = useState(() => localStorage.getItem('ewp-theme') === 'dark');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ewp-theme', dark ? 'dark' : 'light');
    window.dispatchEvent(new Event("ewp-theme-change"))
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [project, setProject] = useState({
    id: genId(), name: "", address: "", contactName: "", contactPhone: "",
    email: "", bidDate: new Date().toISOString().slice(0, 10),
    contractorYN: "No", contractorName: "", contractorContact: "",
    rooms: 1, masterAdj: 0,
    deliveryAmount: "", deliveryNotes: "",
    taxEnabled: false, taxRate: 8,
  });
  const [rooms, setRooms] = useState([blankRoom(0)]);

  // ── Load projects and pricing from Supabase on mount ──
  useEffect(() => {
    // Load pricing first, then projects
    supabase.from("pricing").select("data").eq("id", "main").single()
      .then(({ data }) => {
        if (data?.data) {
          // Merge with defaults so any new keys are always present
          const merged = { ...DEFAULT_PRICING }
          for (const key of Object.keys(DEFAULT_PRICING)) {
            if (data.data[key]) merged[key] = data.data[key]
          }
          PRICING = merged
        }
      })
      .finally(() => {
        supabase.from("projects").select("*").order("updated_at", { ascending: false })
          .then(({ data, error }) => {
            if (error) console.error(error)
            else setProjects((data || []).map(row => ({ ...row.data, _rowId: row.id })))
            setLoading(false)
          })
      })
  }, [])


  const addRoom = () => {
    setRooms(prev => [...prev, blankRoom(prev.length, project.masterAdj)]);
  };

  const removeRoom = (i) => {
    setRooms(prev => prev.filter((_, idx) => idx !== i));
  };

  const showToast = (msg) => setToast(msg);

  const startNew = () => {
    const id = genId();
    setProject({ id, name: "", address: "", contactName: "", contactPhone: "", email: "",
      bidDate: new Date().toISOString().slice(0, 10), contractorYN: "No",
      contractorName: "", contractorContact: "", rooms: 1, masterAdj: 0,
      deliveryAmount: "", deliveryNotes: "", taxEnabled: false, taxRate: 8 });
    setRooms([blankRoom(0)]);
    setStep(0); setSaved(false); setEditIdx(null); setView("new");
  };

  const openProject = (i) => {
    const p = projects[i];
    setProject(p.project); setRooms(p.rooms);
    setStep(0); setEditIdx(i); setSaved(true); setView("new");
  };

  const deleteProject = (i) => setDeletePendingIdx(i);

  const confirmDeleteProject = async () => {
    const i = deletePendingIdx;
    setDeletePendingIdx(null);
    const p = projects[i];
    const { error } = await supabase.from("projects").delete().eq("id", p.project.id);
    if (error) { showToast("Error deleting estimate"); return; }
    setProjects(prev => prev.filter((_, idx) => idx !== i));
    showToast("Estimate deleted");
  };

  const duplicateProject = async (i) => {
    const src = projects[i];
    const newId = genId();
    const duped = {
      project: { ...src.project, id: newId, name: src.project.name + " (Copy)" },
      rooms: src.rooms.map(r => ({ ...r, id: Date.now() + Math.random() })),
    };
    const { error } = await supabase.from("projects").insert({
      id: newId, name: duped.project.name, address: duped.project.address, data: duped
    });
    if (error) { showToast("Error duplicating"); return; }
    setProjects(prev => [duped, ...prev]);
    showToast("Duplicated with new ID: " + newId);
  };

  const saveProject = async () => {
    const entry = { project, rooms };
    const payload = { id: project.id, name: project.name, address: project.address, data: entry };
    const { error } = await supabase.from("projects").upsert(payload, { onConflict: "id" });
    if (error) { showToast("Error saving — check connection"); return; }
    if (editIdx !== null) {
      setProjects(prev => prev.map((p, i) => i === editIdx ? entry : p));
    } else {
      setProjects(prev => [entry, ...prev]);
      setEditIdx(0);
    }
    setSaved(true);
    showToast("Estimate saved successfully");
  };

  const stepConfig = [
    { label: "Project Details" },
    { label: "Room Estimates" },
    { label: "Final Details" },
    { label: "Summary" },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#F6F1E8", fontFamily:"'DM Sans',sans-serif", color:"rgb(140,145,145)", fontSize:11,
      letterSpacing: "0.14em", textTransform: "uppercase", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 52, height: 52, border: "2px solid rgb(73,77,77)", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "rgb(73,77,77)", fontWeight: 700,
        background: "rgba(73,77,77,0.06)" }}>
        EWP
      </div>
      Loading estimates…
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className={`app${dark ? " dark" : ""}`}>
        {/* TOPBAR */}
        <div className={`topbar${scrolled ? " scrolled" : ""}`}>
          <div className="topbar-logo">
            <img src={dark ? "/ewp-logo.png" : "/favicon-512_dark.png"} alt="Engstrom Wood Products" className="header-logo" />
            <div>
              <div className="topbar-name">Engstrom Wood Products</div>
              <div className="topbar-sub">Estimate Manager</div>
            </div>
          </div>
          <div className="topbar-right">
            {isAdmin && (
              <button onClick={onOpenAdmin} style={{
                background: "transparent",
                border: "1px solid rgba(73,77,77,0.25)",
                borderRadius: 3, padding: "6px 14px", cursor: "pointer",
                color: "var(--ewp-slate)", fontSize: 11,
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                👥 Admin
              </button>
            )}
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                background: "transparent",
                border: "1px solid rgba(73,77,77,0.25)",
                borderRadius: 3,
                padding: "6px 14px",
                cursor: "pointer",
                color: "var(--ewp-slate)",
                fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
              {dark ? "☀ Light" : "☾ Dark"}
            </button>
            <button
              onClick={() => import("./supabase.js").then(m => m.supabase.auth.signOut())}
              style={{
                background: "transparent",
                border: "1px solid rgba(73,77,77,0.25)",
                borderRadius: 3, padding: "6px 14px", cursor: "pointer",
                color: "var(--ewp-slate)", fontSize: 11,
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* STEPPER */}
        {view === "new" && (() => {
          const projectValid = !!(project.name && project.address && project.bidDate);
          const allRoomsComplete = rooms.every(isRoomComplete);
          const done = [
            projectValid && (step > 0 || saved),
            allRoomsComplete && (step > 1 || saved),
            (step > 2 || saved),
            saved,
          ];
          const reachable = [true, projectValid, projectValid && allRoomsComplete, projectValid && allRoomsComplete];
          return (
            <div className="stepper">
              <button className="btn btn-ghost btn-sm"
                style={{ color:"var(--mid)", borderRight:"1px solid var(--ivory3)", borderRadius:0, padding:"16px 20px", marginRight:4, whiteSpace:"nowrap", flexShrink:0 }}
                onClick={() => setView("dashboard")}>
                ← All Projects
              </button>
              {stepConfig.map((s, i) => {
                const canClick = reachable[i] && i !== step;
                const isDone = done[i] && i !== step;
                return (
                  <div key={i}
                    className={`step ${step === i ? "active" : ""} ${isDone ? "done" : ""}`}
                    style={{ cursor: canClick ? "pointer" : "default", opacity: reachable[i] ? 1 : 0.45 }}
                    onClick={() => canClick && setStep(i)}>
                    <div className="step-num">{isDone ? "✓" : i + 1}</div>
                    <div className="step-label">{s.label}</div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* MAIN */}
        <div className="main">
          {view === "dashboard" && (
            <Dashboard
            projects={projects}
            onNew={startNew}
            onOpen={openProject}
            onDelete={deleteProject}
            onDuplicate={duplicateProject}
            onGenerateQuote={(i) => {
              const p = projects[i];
              setProject(p.project);
              setRooms(p.rooms);
              setEditIdx(i);
              setSaved(true);
              setView("new");
              setStep(3);
              // slight delay so component mounts, then trigger export
              setTimeout(() => {
                exportPDFInternal(p.project, p.rooms, () => {});
              }, 400);
            }}
            onEmail={(i) => {
              const p = projects[i];
              const subject = encodeURIComponent("Quote: " + p.project.name);
              const lines = [
                "Hi " + (p.project.contactName || "") + ",",
                "",
                "Please find attached your quote for " + p.project.name + ".",
                "",
                "Project Address: " + p.project.address,
                "Bid Date: " + fmtDate(p.project.bidDate || ""),
                "Quote ID: " + p.project.id,
                "",
                "Please don't hesitate to reach out with any questions.",
                "",
                "Best regards,",
                "Engstrom Wood Products"
              ];
              const body = encodeURIComponent(lines.join("\n"));
              const to = encodeURIComponent(p.project.email || "");
              window.open("mailto:" + to + "?subject=" + subject + "&body=" + body);
            }}
          />
          )}
          {view === "new" && step === 0 && (
            <ProjectSetup project={project} onChange={d => {
              setProject(p => ({ ...p, ...d }))
              // If masterAdj changed, apply it to all adjPct fields across all rooms
              if ('masterAdj' in d) {
                const adj = String(d.masterAdj)
                setRooms(prev => prev.map(room => ({
                  ...room,
                  cabinetry: room.cabinetry.map(r => ({ ...r, adjPct: adj })),
                  upgrades:  room.upgrades.map(r => ({ ...r, adjPct: adj })),
                  finishing: room.finishing.map(r => ({ ...r, adjPct: adj })),
                  install:   { ...room.install, adjPct: adj },
                })))
              }
            }} onNext={() => setStep(1)} />
          )}
          {view === "new" && step === 1 && (
            <RoomsPage project={project} rooms={rooms} onRoomsChange={setRooms}
              onAddRoom={addRoom} onRemoveRoom={removeRoom}
              onDuplicateRoom={(i) => {
                const src = rooms[i];
                const duped = { ...src, id: Date.now() + Math.random(), name: src.name + " (Copy)" };
                setRooms(prev => { const next = [...prev]; next.splice(i + 1, 0, duped); return next; });
              }}
              onProjectChange={d => setProject(p => ({ ...p, ...d }))}
              onNext={() => setStep(2)} onBack={() => setStep(0)} />
          )}
          {view === "new" && step === 2 && (
            <FinalDetailsPage project={project} rooms={rooms} onChange={d => setProject(p => ({ ...p, ...d }))} onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {view === "new" && step === 3 && (
            <SummaryPage project={project} rooms={rooms} onBack={() => setStep(2)} onSave={saveProject} />
          )}
        </div>

        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
        {deletePendingIdx !== null && (
          <div className="modal-overlay" onClick={() => setDeletePendingIdx(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Delete Estimate</span>
                <button className="btn btn-ghost" style={{ color:"var(--muted)" }} onClick={() => setDeletePendingIdx(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize:14, color:"var(--char)", lineHeight:1.6 }}>
                  Are you sure you want to delete <strong>"{projects[deletePendingIdx]?.project?.name}"</strong>?
                  <br /><span style={{ color:"var(--muted)", fontSize:12 }}>This action cannot be undone.</span>
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setDeletePendingIdx(null)}>Cancel</button>
                <button className="btn" style={{ background:"var(--red)", color:"#fff" }} onClick={confirmDeleteProject}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
