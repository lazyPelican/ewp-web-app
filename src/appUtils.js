// ── Shared utilities and helpers used across App.jsx and extracted components ──
import { DEFAULT_PRICING } from "./pricing.js"

// Module-level pricing variable — replaced once loaded from Supabase; falls back to defaults.
export let PRICING = DEFAULT_PRICING;
export const setPRICING = (p) => { PRICING = p; };
export const findByName = (arr, name) => arr.find(r => r.name === name) || arr.find(r => r.name.trim() === (name || "").trim());

// Install type constant — avoids magic string scattered throughout
export const HOURLY_RATE = "Hourly Rate";

// ── Format helpers ────────────────────────────────────────────────────────────
export const fmt = (n) =>
  n == null
    ? "$0.00"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const genId = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `B-${yy}${mo}${dy}-${hh}${mn}`;
};

// Display-only: converts legacy EWPyyyymmddHHmmss IDs to B-yymmdd-hhmm format.
export const fmtId = (id = '') => {
  if (!id) return id;
  if (id.startsWith('EWP') && id.length >= 13) {
    const s = id.slice(3);
    const yy = s.slice(2, 4);
    const mo = s.slice(4, 6);
    const dy = s.slice(6, 8);
    const hh = s.slice(8, 10);
    const mn = s.slice(10, 12);
    return `B-${yy}${mo}${dy}-${hh}${mn}`;
  }
  return id;
};

// Format ISO date (yyyy-mm-dd) -> "Jan 15, 2026"
export const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
};

// Title-case each word
export const toTitleCase = (s) => s.replace(/\b\w/g, c => c.toUpperCase());

// Generate a smart copy name: strips existing "Copy N" suffix, then assigns the next number.
export const makeCopyName = (srcName, existingNames = []) => {
  const base = (srcName || "")
    .replace(/\s+Copy\s+\d+\s*$/i, "")
    .replace(/\s+Copy\s*$/i, "")
    .replace(/\s+\(Copy(?:\s+\d+)?\)\s*$/i, "")
    .trim();
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}\\s+Copy(?:\\s+(\\d+))?\\s*$`, "i");
  let max = 1;
  existingNames.forEach(name => {
    const m = (name || "").match(re);
    if (m) max = Math.max(max, m[1] ? parseInt(m[1]) : 1);
  });
  return `${base} Copy ${max + 1}`;
};

// Escape user-supplied text before inserting into PDF HTML templates
export const escHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// ── Room completeness ─────────────────────────────────────────────────────────
// Room is complete when it has a name AND at least one data entry in any section.
// If cabinetry is present, install type must also be selected.
export const ALL_SECTIONS = ["cabinetry", "upgrades", "countertops", "finishing", "install"];
export const SECTION_LABELS = {
  cabinetry: "Cabinetry",
  upgrades: "Upgrades & Add-ons",
  countertops: "Countertops",
  finishing: "Finishing",
  install: "Installation",
};

export const isRoomComplete = (room) => {
  if (room.name.trim() === "") return false;
  const sections = (room.sections === undefined || room.sections === null) ? ALL_SECTIONS : room.sections;
  if (sections.length === 0) return false;
  const hasCabinetry   = sections.includes("cabinetry") && room.cabinetry.some(c => c.product && parseFloat(c.qty) !== 0);
  const hasCountertops = sections.includes("countertops") && (room.countertops || []).some(c => c.product && parseFloat(c.qty) !== 0);
  const hasUpgrades    = sections.includes("upgrades") && (room.upgrades || []).some(u => u.upgrade && parseFloat(u.qty) !== 0);
  const hasFinishing   = sections.includes("finishing") && (room.finishing || []).some(f => f.type && parseFloat(f.lf) !== 0);
  if (!hasCabinetry && !hasCountertops && !hasUpgrades && !hasFinishing) return false;
  if (hasCabinetry && sections.includes("install") && room.install.type === "") return false;
  return true;
};

// ── Calculation helpers ───────────────────────────────────────────────────────
export const calcCabinetry = (items) => {
  return items.reduce((sum, item) => {
    if (!item.product) return sum;
    const prod = findByName(PRICING.woodwork, item.product);
    const con  = findByName(PRICING.construction, item.construction);
    const wood = findByName(PRICING.wood, item.wood);
    if (!prod) return sum;
    const basePrice = prod.price;
    const conPrem   = con  ? con.premium  : 0;
    const woodPrem  = wood ? wood.premium : 0;
    const stdPrice  = basePrice * (1 + conPrem) * (1 + woodPrem);
    const qty    = parseFloat(item.qty)    || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    const lineTotal = stdPrice * qty;
    const modTotal  = lineTotal * (1 + adjPct / 100);
    return sum + modTotal;
  }, 0);
};

export const calcUpgrades = (items) => {
  return items.reduce((sum, item) => {
    if (!item.upgrade) return sum;
    const upg = findByName(PRICING.upgrades, item.upgrade);
    if (!upg) return sum;
    const qty    = parseFloat(item.qty)    || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    const lineTotal = upg.price * qty;
    return sum + lineTotal * (1 + adjPct / 100);
  }, 0);
};

export const calcCountertops = (items) => {
  if (!items) return 0;
  return items.reduce((sum, item) => {
    if (!item.product) return sum;
    const ctp = findByName(PRICING.countertops || [], item.product);
    if (!ctp) return sum;
    const qty    = parseFloat(item.qty)    || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    return sum + ctp.price * qty * (1 + adjPct / 100);
  }, 0);
};

export const calcFinishing = (items) => {
  return items.reduce((sum, item) => {
    if (!item.type) return sum;
    const fin = findByName(PRICING.finishing, item.type);
    if (!fin) return sum;
    const lf     = parseFloat(item.lf)     || 0;
    const adjPct = parseFloat(item.adjPct) || 0;
    const subtotal = fin.pricePerLF * lf;
    return sum + subtotal * (1 + adjPct / 100);
  }, 0);
};

export const calcInstall = (installData, cabTotal) => {
  if (!installData.type || installData.type === "No Install") return 0;
  const inst = findByName(PRICING.installType, installData.type);
  if (!inst) return 0;
  const adjPct = parseFloat(installData.adjPct) || 0;
  let base;
  if (installData.type === HOURLY_RATE) {
    const hours = parseFloat(installData.metric) || 0;
    base = inst.rate * hours;
  } else {
    base = cabTotal * inst.rate;
  }
  return Math.ceil((base * (1 + adjPct / 100)) / 5) * 5;
};

export const calcEstimatedFinishingLF = (cabinetryItems) => {
  return cabinetryItems.reduce((sum, item) => {
    if (!item.product) return sum;
    const prod = findByName(PRICING.woodwork, item.product);
    if (!prod) return sum;
    const qty = parseFloat(item.qty) || 0;
    return sum + (prod.finLF * qty);
  }, 0);
};

// ── Default quote section settings ────────────────────────────────────────────
export const DEFAULT_QUOTE_SECTIONS = {
  cabinetry:   { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "" },
  upgrades:    { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "cabinetry" },
  countertops: { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "" },
  finishing:   { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "" },
  install:     { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "" },
  delivery:    { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "install" },
};

// ── Blank row factories ───────────────────────────────────────────────────────
export const blankCabRow = () => ({
  product: "", construction: "Not Applicable", wood: "Not Applicable",
  qty: "", adjPct: "", notes: "",
});
export const blankUpgRow = () => ({ upgrade: "", qty: "", adjPct: "", notes: "" });
export const blankCtpRow = () => ({ product: "", qty: "", adjPct: "", notes: "" });
export const blankFinRow = () => ({ type: "", lf: "", adjPct: "", notes: "" });

// ── Project total calculator ─────────────────────────────────────────────────
export const calcTotal = (p) => {
  const roomsTotal = p.rooms.reduce((rs, r) => {
    const cab = calcCabinetry(r.cabinetry);
    return rs + cab + calcUpgrades(r.upgrades) + calcCountertops(r.countertops) + calcFinishing(r.finishing) + calcInstall(r.install, cab);
  }, 0);
  const delivery = p.project.noDelivery ? 0 : (parseFloat(p.project.deliveryAmount) || 0);
  const subtotal = roomsTotal + delivery;
  const taxEnabled = p.project.installationType ? p.project.installationType === "contractor" : p.project.taxEnabled;
  const taxRate = p.project.installationType ? 8.53 : (parseFloat(p.project.taxRate) || 8);
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  return subtotal + tax;
};

// ── Production lifecycle stages ──────────────────────────────────────────────
export const ACTIVE_STAGES = [
  { key: "drafting",   label: "Drafting" },
  { key: "redlines",   label: "Redlines" },
  { key: "building",   label: "Building & Install" },
  { key: "punchlist",  label: "Punch List" },
  { key: "paid",       label: "Paid" },
]
export const isActiveStatus = (s) => s && s.startsWith("active:")
export const getActiveStage = (s) => s ? s.replace("active:", "") : null
export const isClosedStatus = (s) => s === "closed"

export const blankRoom = (n, masterAdj) => ({
  id: Date.now() + n,
  name: "",
  sections: [],
  cabinetry: [{ ...blankCabRow(), adjPct: masterAdj != null ? String(masterAdj) : '' }],
  upgrades:  [{ ...blankUpgRow(), adjPct: masterAdj != null ? String(masterAdj) : '' }],
  countertops: [{ ...blankCtpRow(), adjPct: masterAdj != null ? String(masterAdj) : '' }],
  finishing: [blankFinRow()],
  install: { type: "", metric: "", adjPct: "", notes: "" },
});
