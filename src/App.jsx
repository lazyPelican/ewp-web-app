import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase.js"

// ── PRICING DATA (from EWP Pricing Table) ─────────────────────
const PRICING = {
  woodwork: [
    { name: "Base Cabinet", price: 190, finLF: 1 },
    { name: "Bench (Open)", price: 130, finLF: 1 },
    { name: "Commercial Cabinet Lower", price: 250, finLF: 0 },
    { name: "Commercial Cabinet Upper", price: 135, finLF: 0 },
    { name: "Countertop Laminate (Allowance)", price: 75, finLF: 0 },
    { name: "Countertop Quartz (Allowance)", price: 250, finLF: 0 },
    { name: "Ctrp Granite/Ln Ft (Allowance)", price: 300, finLF: 0 },
    { name: "Flat Veneer End", price: 0, finLF: 0.5 },
    { name: "Fridge End Panels", price: 200, finLF: 2 },
    { name: "Kitchen Hd (Incl in Cab as well)", price: 190, finLF: 2 },
    { name: "Lockers (Open)", price: 160, finLF: 1 },
    { name: "Mantle - Simple LF", price: 110, finLF: 1 },
    { name: "Mantle - Surround", price: 400, finLF: 1 },
    { name: "Paneled Backs/Ends (LF)", price: 100, finLF: 0.75 },
    { name: "Shiplap Basic (Sq Feet)", price: 25, finLF: 1 },
    { name: "Stacked Upper Cabinet", price: 285, finLF: 2 },
    { name: "Tall Cabinet (up to 8ft)", price: 380, finLF: 2.5 },
    { name: "Tall Cabinet (8ft-10ft)", price: 500, finLF: 3 },
    { name: "Upper Cabinet", price: 190, finLF: 1 },
    { name: "Wood Floating Shelves", price: 100, finLF: 0.5 },
    { name: "Wood Tops LF", price: 100, finLF: 0.5 },
  ],
  construction: [
    { name: "Not Applicable", premium: 0 },
    { name: "Standard Overlay", premium: 0 },
    { name: "Full Overlay", premium: 0.05 },
    { name: "Inset", premium: 0.2 },
    { name: "Euro", premium: 0.2 },
    { name: "Furniture Style", premium: 0.65 },
    { name: "Laminate", premium: 0 },
  ],
  wood: [
    { name: "Not Applicable", premium: 0 },
    { name: "Alder", premium: 0.15 },
    { name: "Cherry", premium: 0.15 },
    { name: "Knotty Alder", premium: 0.05 },
    { name: "Laminate", premium: 0 },
    { name: "Maple", premium: 0.15 },
    { name: "Paint Grade", premium: 0 },
    { name: "Red Oak", premium: 0.05 },
    { name: "Rift White Oak", premium: 0.4 },
    { name: "Walnut", premium: 0.4 },
    { name: "White Oak", premium: 0.3 },
  ],
  finishing: [
    { name: "Stain", pricePerLF: 90 },
    { name: "Paint", pricePerLF: 90 },
    { name: "Clear Coat", pricePerLF: 65 },
    { name: "Specialty", pricePerLF: 100 },
  ],
  productType: [
    { name: "Cabinets", pricePerLF: 195 },
    { name: "Countertops", pricePerLF: 80 },
    { name: "Mantels", pricePerLF: 100 },
    { name: "Kitchen Hood", pricePerLF: null },
  ],
  installType: [
    { name: "Standard or Full Overlay - Unfinished", rate: 0.18 },
    { name: "Standard or Full Overlay - Finished", rate: 0.2 },
    { name: "Inset - Unfinished", rate: 0.2 },
    { name: "Inset - Finished", rate: 0.22 },
    { name: "Euro - Unfinished", rate: 0.3 },
    { name: "Euro - Finished", rate: 0.3 },
    { name: "Hourly Rate", rate: 135 },
  ],
  upgrades: [
    { name: "Closet Rods (Per foot)", price: 25 },
    { name: "Docking Drawer", price: 500 },
    { name: "Dovetail Box Upgrade", price: 50 },
    { name: "Extra Drawers (1- Incl. Non Dovetail)", price: 80 },
    { name: "Farm Sink Fitting Charge", price: 200 },
    { name: "File Drawer", price: 45 },
    { name: "Floating Shelf Brackets (1 pair)", price: 200 },
    { name: "Furniture Style Upgrade", price: 250 },
    { name: "Glass Doors", price: 100 },
    { name: "Glass Shelves", price: 100 },
    { name: "Hanging Rod (Per foot)", price: 25 },
    { name: "Hardware Install (per unit)", price: 12 },
    { name: "Hookstrip (Per foot)", price: 30 },
    { name: "In-Wall Vanity Heavy Duty Bracket (single)", price: 200 },
    { name: "Island Post", price: 275 },
    { name: "Ladder Support (per ft standard wood)", price: 100 },
    { name: "Lazy Susan", price: 475 },
    { name: "Mirrors (Per foot)", price: 50 },
    { name: "Murphy Bed (Twin)", price: 4000 },
    { name: "Notched Dovetail Drawers", price: 200 },
    { name: "Oversized Drawer", price: 150 },
    { name: "Pantry Pullouts", price: 1400 },
    { name: "Peg Drawer", price: 250 },
    { name: "Pocket Doors (Pair)", price: 1000 },
    { name: "Pullout Base Unit (Spice or Utensil Holders)", price: 500 },
    { name: "Raised Panel Door or Appl. Molding (Per opening)", price: 50 },
    { name: "Rollouts (Dovetail - Sidemount Guides)", price: 225 },
    { name: "Rollouts (Melamine - Sidemount Slides)", price: 150 },
    { name: "S. Close Drawer Slides (2) (upgrade)", price: 80 },
    { name: "Sink Tip Out", price: 75 },
    { name: "Specialty Drawer Inserts", price: 215 },
    { name: "Spice Rack (Small Door Rack)", price: 140 },
    { name: "Touch Latch Doors (ea)", price: 25 },
    { name: "Touch Latch Drawers (ea)", price: 250 },
    { name: "Trash Pull Out", price: 450 },
    { name: "Tray Dividers (each)", price: 45 },
    { name: "Trip Charge", price: 200 },
    { name: "Wine Rack", price: 175 },
  ],
};

// ── HELPERS ────────────────────────────────────────────────────
const fmt = (n) => n == null ? "$0.00" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const genId = () => "EWP" + new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);

// Format ISO date (yyyy-mm-dd) -> "Jan 15, 2026"
const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

// ── BLANK ROOM TEMPLATE ────────────────────────────────────────
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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ivory: #FDFAF5;
    --ivory2: #F5F0E8;
    --ivory3: #EDE8DF;
    --char: #2D2D2D;
    --char2: #3D3D3D;
    --mid: #6B6B6B;
    --muted: #9E9E9E;
    --rule: #CCCCCC;
    --gold: #A07A3A;
    --gold-light: #C9A96E;
    --gold-bg: #F7F0E3;
    --red: #C0392B;
    --green: #2D7A4F;
  }

  body { background: var(--ivory); font-family: 'DM Sans', sans-serif; color: var(--char); }

  /* ── LAYOUT ── */
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── TOPBAR ── */
  .topbar {
    background: var(--char);
    padding: 0 32px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 2px solid var(--gold);
  }
  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo-mark {
    width: 40px; height: 40px;
    border: 2px solid var(--gold);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700; font-size: 15px;
    color: var(--gold);
    flex-shrink: 0;
  }
  .topbar-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px; font-weight: 600;
    color: #fff; letter-spacing: 0.04em;
  }
  .topbar-sub { font-size: 11px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .topbar-right { display: flex; align-items: center; gap: 10px; }

  /* ── STEPPER ── */
  .stepper {
    background: var(--ivory2);
    border-bottom: 1px solid var(--ivory3);
    padding: 0 32px;
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
  }
  .step {
    display: flex; align-items: center;
    padding: 16px 20px;
    gap: 10px;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .step:hover { background: var(--ivory3); }
  .step.active { border-bottom-color: var(--gold); }
  .step-num {
    width: 24px; height: 24px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600;
    background: var(--ivory3);
    color: var(--muted);
    flex-shrink: 0;
  }
  .step.active .step-num { background: var(--gold); color: #fff; }
  .step.done .step-num { background: var(--green); color: #fff; }
  .step-label { font-size: 13px; font-weight: 500; color: var(--mid); }
  .step.active .step-label { color: var(--char); font-weight: 600; }

  /* ── MAIN CONTENT ── */
  .main { flex: 1; max-width: 1200px; margin: 0 auto; width: 100%; padding: 40px 32px; }

  /* ── PAGE HEADER ── */
  .page-header { margin-bottom: 32px; }
  .page-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 32px; font-weight: 600;
    color: var(--char); line-height: 1.1;
  }
  .page-subtitle { font-size: 14px; color: var(--mid); margin-top: 4px; }
  .gold-rule { height: 2px; background: var(--gold); width: 48px; margin: 12px 0; }

  /* ── CARDS ── */
  .card {
    background: #fff;
    border: 1px solid var(--ivory3);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .card-header {
    background: var(--char);
    padding: 14px 20px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px; font-weight: 600;
    color: var(--gold-light); letter-spacing: 0.06em;
  }
  .card-body { padding: 20px; }

  /* ── FORM ELEMENTS ── */
  .form-grid { display: grid; gap: 16px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .form-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 10px; font-weight: 600; color: var(--gold); text-transform: uppercase; letter-spacing: 0.1em; }

  input, select, textarea {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--char);
    background: var(--ivory);
    border: 1px solid var(--ivory3);
    border-radius: 4px;
    padding: 9px 12px;
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    appearance: none;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(160,122,58,0.1);
    background: #fff;
  }
  input.error, select.error { border-color: var(--red); }
  .field-error { font-size: 11px; color: var(--red); }

  select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6B6B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }

  /* ── BUTTONS ── */
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 600;
    padding: 10px 20px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 7px;
    transition: all 0.15s;
    letter-spacing: 0.02em;
  }
  .btn-primary { background: var(--char); color: #fff; }
  .btn-primary:hover { background: var(--char2); }
  .btn-gold { background: var(--gold); color: #fff; }
  .btn-gold:hover { background: #8a6830; }
  .btn-outline { background: transparent; color: var(--char); border: 1px solid var(--rule); }
  .btn-outline:hover { border-color: var(--char); background: var(--ivory2); }
  .btn-ghost { background: transparent; color: var(--mid); border: none; padding: 6px 10px; }
  .btn-ghost:hover { color: var(--char); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid #e8c8c5; }
  .btn-danger:hover { background: #fdf0ef; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn-lg { padding: 13px 28px; font-size: 14px; }

  /* ── ROOM TABS ── */
  .room-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .room-tab {
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid var(--ivory3);
    background: #fff;
    cursor: pointer;
    font-size: 13px; font-weight: 500;
    color: var(--mid);
    transition: all 0.15s;
    display: flex; align-items: center; gap: 6px;
  }
  .room-tab:hover { border-color: var(--gold-light); color: var(--char); }
  .room-tab.active { background: var(--char); color: #fff; border-color: var(--char); }
  .room-tab-add {
    border-style: dashed;
    color: var(--gold);
    border-color: var(--gold-light);
  }
  .room-tab-add:hover { background: var(--gold-bg); }

  /* ── DATA TABLE ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th {
    background: var(--ivory3);
    color: var(--char2);
    font-size: 10px; font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 10px 10px;
    text-align: left;
    border-bottom: 2px solid var(--char);
    white-space: nowrap;
  }
  .data-table td {
    padding: 6px 6px;
    border-bottom: 1px solid var(--ivory3);
    vertical-align: middle;
  }
  .data-table tr:nth-child(even) td { background: var(--ivory2); }
  .data-table tr:hover td { background: var(--gold-bg); }
  .data-table input, .data-table select {
    padding: 5px 8px;
    font-size: 12px;
    background: transparent;
    border: 1px solid transparent;
  }
  .data-table input:focus, .data-table select:focus {
    background: #fff;
    border-color: var(--gold);
  }
  .data-table .num-cell { text-align: right; }
  .data-table .total-row td {
    background: var(--ivory3) !important;
    font-weight: 600;
    border-top: 2px solid var(--char);
    color: var(--gold);
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
  }

  /* ── SECTION LABEL ── */
  .section-banner {
    background: var(--char);
    color: var(--gold-light);
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px; font-weight: 600;
    letter-spacing: 0.08em;
    padding: 10px 16px;
    border-radius: 4px 4px 0 0;
  }

  /* ── SUMMARY CARDS ── */
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-card {
    background: #fff;
    border: 1px solid var(--ivory3);
    border-radius: 6px;
    padding: 16px;
    border-left: 3px solid var(--gold);
  }
  .summary-card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
  .summary-card-value { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: var(--gold); }

  /* ── GRAND TOTAL ── */
  .grand-total {
    background: var(--char);
    border-radius: 6px;
    padding: 24px 32px;
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 8px;
  }
  .grand-total-label {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px; font-weight: 600;
    color: #fff;
  }
  .grand-total-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px; font-weight: 700;
    color: var(--gold-light);
  }

  /* ── PROJECT LIST ── */
  .project-list { display: flex; flex-direction: column; gap: 8px; }
  .project-row {
    background: #fff;
    border: 1px solid var(--ivory3);
    border-radius: 6px;
    padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer;
    transition: all 0.15s;
  }
  .project-row:hover { border-color: var(--gold-light); box-shadow: 0 2px 8px rgba(160,122,58,0.1); }
  .project-row-name { font-weight: 600; font-size: 15px; }
  .project-row-meta { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .project-row-total { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: var(--gold); }
  .badge {
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
    padding: 3px 8px; border-radius: 20px;
  }
  .badge-new { background: #e8f4ed; color: var(--green); }
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
    text-align: center; padding: 60px 20px;
    color: var(--muted);
  }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.4; }
  .empty-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: var(--char); margin-bottom: 6px; }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--char); color: #fff;
    padding: 12px 20px; border-radius: 6px;
    font-size: 13px; border-left: 3px solid var(--gold);
    z-index: 999; animation: slideUp 0.3s ease;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  @keyframes slideUp { from { transform: translateY(12px); opacity:0; } to { transform:translateY(0); opacity:1; } }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 20px;
  }
  .modal {
    background: #fff; border-radius: 8px;
    width: 100%; max-width: 520px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    overflow: hidden;
  }
  .modal-header {
    background: var(--char); padding: 18px 24px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--gold-light); font-weight: 600; }
  .modal-body { padding: 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--ivory3); display: flex; justify-content: flex-end; gap: 10px; }

  /* ── REPORT VIEW ── */
  .report-room { margin-bottom: 32px; }
  .report-section { margin-bottom: 16px; }
  .report-section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13px; font-weight: 700;
    color: var(--gold); text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--ivory3);
  }
  .report-line {
    display: flex; justify-content: space-between;
    padding: 4px 0; font-size: 13px;
    border-bottom: 1px solid var(--ivory3);
  }
  .report-line-total {
    font-weight: 600; color: var(--gold);
    border-bottom: 2px solid var(--char);
  }

  @media (max-width: 768px) {
    .main { padding: 20px 16px; }
    .topbar { padding: 0 16px; }
    .stepper { padding: 0 16px; }
    .summary-grid { grid-template-columns: 1fr 1fr; }
    .form-grid-3, .form-grid-4 { grid-template-columns: 1fr 1fr; }
    .grand-total { flex-direction: column; gap: 8px; text-align: center; }
  }
`;

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
    if (!project.rooms || project.rooms < 1) e.rooms = "At least 1 room";
    if (project.rooms > 10) e.rooms = "Max 10 rooms";
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
              <input value={project.contactPhone} placeholder="(612) 555-0100"
                onChange={e => onChange({ contactPhone: e.target.value })} />
            </Field>
            <Field label="Email Address">
              <input type="email" value={project.email} placeholder="client@email.com"
                onChange={e => onChange({ email: e.target.value })} />
            </Field>
            <Field label="Bid Date" error={errors.bidDate}>
              <input className={errors.bidDate ? "error" : ""} type="date" value={project.bidDate}
                onChange={e => onChange({ bidDate: e.target.value })} />
              {project.bidDate && <span style={{ fontSize: 11, color: "var(--gold)", marginTop: 2 }}>{fmtDate(project.bidDate)}</span>}
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
                  onChange={e => onChange({ contractorContact: e.target.value })} />
              </Field>
            </>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">SCOPE</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <Field label="Number of Rooms" error={errors.rooms}>
              <input type="number" min="1" max="10"
                className={errors.rooms ? "error" : ""}
                value={project.rooms}
                onChange={e => onChange({ rooms: parseInt(e.target.value) || "" })} />
            </Field>
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
        <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--gold-light)", border: "1px solid rgba(201,169,110,0.4)" }} onClick={addRow}>+ Add Row</button>
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
              <td colSpan={5} style={{ textAlign: "right", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>
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
        <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--gold-light)", border: "1px solid rgba(201,169,110,0.4)" }} onClick={addRow}>+ Add Row</button>
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
              <td colSpan={4} style={{ textAlign: "right", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Upgrades Total</td>
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
function FinishingSection({ items, onChange }) {
  const update = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow    = () => onChange([...items, blankFinRow()]);
  const removeRow = (i) => { if (items.length === 1) return; onChange(items.filter((_, idx) => idx !== i)); };
  const subTotal = calcFinishing(items);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>FINISHING</span>
        <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--gold-light)", border: "1px solid rgba(201,169,110,0.4)" }} onClick={addRow}>+ Add Row</button>
      </div>
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
              <td colSpan={4} style={{ textAlign: "right", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mid)" }}>Finishing Total</td>
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
function RoomsPage({ project, rooms, onRoomsChange, onNext, onBack }) {
  const [activeRoom, setActiveRoom] = useState(0);
  const room = rooms[activeRoom];

  const updateRoom = (field, val) => {
    onRoomsChange(rooms.map((r, i) => i === activeRoom ? { ...r, [field]: val } : r));
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
            <div className="page-subtitle">{project.name} · {rooms.length} {rooms.length === 1 ? "room" : "rooms"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "var(--muted)" }}>Room Total</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "var(--gold)" }}>{fmt(roomTotal)}</div>
          </div>
        </div>
      </div>

      {/* Room Tabs */}
      <div className="room-tabs">
        {rooms.map((r, i) => {
          const done = isRoomComplete(r);
          const isActive = i === activeRoom;
          return (
            <div key={r.id}
              className={`room-tab ${isActive ? "active" : ""}`}
              style={done && !isActive ? { borderColor: "#2D7A4F", background: "#e8f4ed", color: "#2D7A4F" } : {}}
              onClick={() => setActiveRoom(i)}>
              {done && !isActive && <span style={{ fontSize: 11 }}>✓</span>}
              <span>{r.name || `Room ${i + 1}`}</span>
            </div>
          );
        })}
      </div>

      {/* Room Name */}
      <div className="card">
        <div className="card-header"><span className="card-title">ROOM INFORMATION</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <Field label="Room Name / Label">
              <input value={room.name} placeholder={`e.g. Kitchen, Master Bath, Room ${activeRoom + 1}`}
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
      <FinishingSection items={room.finishing} onChange={v => updateRoom("finishing", v)} />
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

// ── SUMMARY PAGE ───────────────────────────────────────────────
function SummaryPage({ project, rooms, onBack, onSave }) {
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
  const grandTotal = grandCab + grandUpg + grandFin + grandInst;

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
            <button className="btn btn-outline" onClick={() => window.print()}>🖨 Print</button>
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
                <td className="num-cell">{fmt(grandTotal)}</td>
              </tr>
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
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "var(--gold-light)", fontWeight: 600 }}>{fmt(rt.total)}</span>
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
        <div className="grand-total-value">{fmt(grandTotal)}</div>
      </div>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
        This estimate is valid for 30 days from the bid date. All prices subject to final measurement verification.
      </div>

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-outline" onClick={onBack}>← Back to Rooms</button>
        <button className="btn btn-gold btn-lg" onClick={onSave}>💾 Save Estimate</button>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────
function Dashboard({ projects, onNew, onOpen }) {
  const [search, setSearch] = useState("");
  const filtered = projects.filter(p =>
    p.project.name.toLowerCase().includes(search.toLowerCase()) ||
    p.project.address.toLowerCase().includes(search.toLowerCase())
  );

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          ["Total Projects", projects.length, "📋"],
          ["Active Estimates", projects.length, "📝"],
          ["Total Est. Value", fmt(totalRevenue), "💰"],
        ].map(([lbl, val, icon]) => (
          <div key={lbl} style={{ background: "#fff", border: "1px solid var(--ivory3)", borderRadius: 6, padding: "20px 24px", borderLeft: "3px solid var(--gold)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "var(--char)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input placeholder="🔍  Search by project name or address…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400, background: "#fff" }} />
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
            return (
              <div className="project-row" key={i} onClick={() => onOpen(i)}>
                <div>
                  <div className="project-row-name">{p.project.name}</div>
                  <div className="project-row-meta">{p.project.address} · {p.rooms.length} rooms · {p.project.bidDate}</div>
                </div>
                <div className="flex items-center gap-12">
                  <span className="badge badge-draft">Estimate</span>
                  <div className="project-row-total">{fmt(gt)}</div>
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
export default function App() {
  const [view, setView] = useState("dashboard");
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletePendingIdx, setDeletePendingIdx] = useState(null);

  const [project, setProject] = useState({
    id: genId(), name: "", address: "", contactName: "", contactPhone: "",
    email: "", bidDate: new Date().toISOString().slice(0, 10),
    contractorYN: "No", contractorName: "", contractorContact: "",
    rooms: 1, masterAdj: 0,
  });
  const [rooms, setRooms] = useState([blankRoom(0)]);

  // ── Load projects from Supabase on mount ──
  useEffect(() => {
    supabase.from("projects").select("*").order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setProjects((data || []).map(row => ({ ...row.data, _rowId: row.id })))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const count = parseInt(project.rooms) || 1;
    setRooms(prev => {
      if (count > prev.length) return [...prev, ...Array(count - prev.length).fill(null).map((_, i) => blankRoom(prev.length + i))];
      return prev;
    });
  }, [project.rooms]);

  const showToast = (msg) => setToast(msg);

  const startNew = () => {
    const id = genId();
    setProject({ id, name: "", address: "", contactName: "", contactPhone: "", email: "",
      bidDate: new Date().toISOString().slice(0, 10), contractorYN: "No",
      contractorName: "", contractorContact: "", rooms: 1, masterAdj: 0 });
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
    { label: "Summary" },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#FDFAF5", fontFamily:"'DM Sans',sans-serif", color:"#9E9E9E", fontSize:14 }}>
      Loading estimates…
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-logo">
            <div className="logo-mark">wEp</div>
            <div>
              <div className="topbar-name">Engstrom Wood Products</div>
              <div className="topbar-sub">Estimate Manager</div>
            </div>
          </div>
          <div className="topbar-right"></div>
        </div>

        {/* STEPPER */}
        {view === "new" && (() => {
          const projectValid = !!(project.name && project.address && project.bidDate);
          const allRoomsComplete = rooms.every(isRoomComplete);
          const done = [
            projectValid && (step > 0 || saved),
            allRoomsComplete && (step > 1 || saved),
            saved,
          ];
          const reachable = [true, projectValid, projectValid && allRoomsComplete];
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
            <Dashboard projects={projects} onNew={startNew} onOpen={openProject} onDelete={deleteProject} onDuplicate={duplicateProject} />
          )}
          {view === "new" && step === 0 && (
            <ProjectSetup project={project} onChange={d => setProject(p => ({ ...p, ...d }))} onNext={() => setStep(1)} />
          )}
          {view === "new" && step === 1 && (
            <RoomsPage project={project} rooms={rooms} onRoomsChange={setRooms}
              onProjectChange={d => setProject(p => ({ ...p, ...d }))}
              onNext={() => setStep(2)} onBack={() => setStep(0)} />
          )}
          {view === "new" && step === 2 && (
            <SummaryPage project={project} rooms={rooms} onBack={() => setStep(1)} onSave={saveProject} />
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
