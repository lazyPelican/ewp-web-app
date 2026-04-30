// Pitch deck for the Quote App — Charcoal & Burnished Brass palette
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();

pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches (16:9)
pres.title = "Custom Quote App — Pitch Deck";

// ── Palette ────────────────────────────────────────────────────
const C = {
  charcoal:   "1F242E",
  charcoal2:  "15171C",
  brass:      "A88147",
  brassDark:  "8C6A37",
  brassLight: "C99E64",
  bg:         "F2F1ED",
  surface:    "FFFFFF",
  border:     "DCDAD2",
  muted:      "6E7480",
  text:       "15171C",
  textOnDark: "F0EDE5",
  white:      "FFFFFF",
};

const FONT_HEAD = "Georgia";
const FONT_BODY = "Calibri";

// ── Helpers ────────────────────────────────────────────────────
const W = 13.333, H = 7.5;

function bgFill(slide, color = C.bg) {
  slide.background = { color };
}

// Vertical brass accent on left edge — our signature motif
function leftAccent(slide, color = C.brass) {
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: H, fill: { color }, line: { type: "none" } });
}

// Small footer with brand mark + page number
function footer(slide, n, total, dark = false) {
  const txtCol = dark ? C.textOnDark : C.muted;
  slide.addText("Quote App for Trade Businesses", {
    x: 0.6, y: H - 0.42, w: 6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: txtCol,
    italic: true, align: "left",
  });
  slide.addText(`${n} / ${total}`, {
    x: W - 1.2, y: H - 0.42, w: 0.6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: txtCol,
    align: "right",
  });
}

const TOTAL = 11;

// ───────────────────────────────────────────────────────────────
// SLIDE 1 — TITLE
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s, C.charcoal);

  // brass block top-left as motif
  s.addShape("rect", { x: 0.6, y: 0.6, w: 0.8, h: 0.12, fill: { color: C.brass }, line: { type: "none" } });

  // Small label
  s.addText("ENGSTROM WOOD PRODUCTS · CASE STUDY & PROPOSAL", {
    x: 0.6, y: 0.85, w: 12, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: C.brassLight,
    bold: true, charSpacing: 6,
  });

  // Big serif headline
  s.addText("Custom Quote App", {
    x: 0.6, y: 2.4, w: 12, h: 1.2,
    fontFace: FONT_HEAD, fontSize: 64, color: C.textOnDark,
    italic: false,
  });
  s.addText("for Trade Businesses", {
    x: 0.6, y: 3.55, w: 12, h: 1,
    fontFace: FONT_HEAD, fontSize: 56, color: C.brass,
    italic: true,
  });

  s.addText("Stop estimating in spreadsheets. Start closing in minutes.", {
    x: 0.6, y: 4.9, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 18, color: C.textOnDark,
  });

  s.addShape("rect", { x: 0.6, y: 5.65, w: 1.4, h: 0.04, fill: { color: C.brass }, line: { type: "none" } });

  s.addText("Built for craftspeople, by a developer who works with them.", {
    x: 0.6, y: 5.85, w: 12, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: C.brassLight,
    italic: true,
  });
}

// ───────────────────────────────────────────────────────────────
// SLIDE 2 — THE PROBLEM
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("THE PROBLEM", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass,
    bold: true, charSpacing: 6,
  });
  s.addText("Custom quoting is eating your week.", {
    x: 0.6, y: 1.05, w: 11, h: 1,
    fontFace: FONT_HEAD, fontSize: 40, color: C.charcoal,
    italic: true,
  });

  // 3 columns
  const cols = [
    { n: "01", h: "Hours per quote",  b: "Spreadsheets, scratch pads, and \"let me get back to you tomorrow.\" Every quote is a custom build from scratch." },
    { n: "02", h: "Pricing drift",     b: "Different jobs, different numbers. A small mistake in a spreadsheet costs real margin you'll never see." },
    { n: "03", h: "Slow follow-up",    b: "By the time the proposal goes out, the customer's already talking to someone else. Speed wins jobs." },
  ];

  const cardY = 2.95, cardH = 3.5, cardW = 3.7, gap = 0.35;
  const startX = (W - (cardW * 3 + gap * 2)) / 2;

  cols.forEach((c, i) => {
    const x = startX + i * (cardW + gap);
    s.addShape("rect", { x, y: cardY, w: cardW, h: cardH, fill: { color: C.surface }, line: { color: C.border, width: 1 } });
    s.addShape("rect", { x, y: cardY, w: cardW, h: 0.06, fill: { color: C.brass }, line: { type: "none" } });
    s.addText(c.n, {
      x: x + 0.3, y: cardY + 0.35, w: 1.5, h: 0.7,
      fontFace: FONT_HEAD, fontSize: 44, color: C.brass, italic: true,
    });
    s.addText(c.h, {
      x: x + 0.3, y: cardY + 1.25, w: cardW - 0.6, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 22, color: C.charcoal, bold: false,
    });
    s.addText(c.b, {
      x: x + 0.3, y: cardY + 1.85, w: cardW - 0.6, h: 1.4,
      fontFace: FONT_BODY, fontSize: 12.5, color: C.text,
      paraSpaceAfter: 6,
    });
  });

  footer(s, 2, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 3 — THE SOLUTION
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("THE SOLUTION", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass,
    bold: true, charSpacing: 6,
  });
  s.addText("A custom-branded estimating app", {
    x: 0.6, y: 1.05, w: 12, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 36, color: C.charcoal,
  });
  s.addText("that turns your pricing rules into instant, professional quotes.", {
    x: 0.6, y: 1.7, w: 12, h: 0.6,
    fontFace: FONT_HEAD, fontSize: 26, color: C.brass, italic: true,
  });

  // 3 mock screen placeholders
  const mocks = [
    { label: "Dashboard",       sub: "All projects, statuses, and client info — at a glance." },
    { label: "Room Estimator",  sub: "Drop in items, watch the total update live." },
    { label: "Quote PDF",       sub: "Your branding. Your logo. Sent in one click." },
  ];

  const mY = 3.3, mH = 3.0, mW = 3.85, gap = 0.3;
  const startX = (W - (mW * 3 + gap * 2)) / 2;

  const SCREEN_IMGS = [
    "C:/Users/SURFACE/Downloads/EWP Quote App/screenshots/01_dashboard.png",
    "C:/Users/SURFACE/Downloads/EWP Quote App/screenshots/02_room_estimates.png",
    "C:/Users/SURFACE/Downloads/EWP Quote App/screenshots/03_summary.png",
  ];

  mocks.forEach((m, i) => {
    const x = startX + i * (mW + gap);
    // Thin brass border frame
    s.addShape("rect", { x: x - 0.04, y: mY - 0.04, w: mW + 0.08, h: 2.03,
      fill: { type: "none" }, line: { color: C.brass, width: 1 } });
    // Real screenshot
    s.addImage({ path: SCREEN_IMGS[i], x, y: mY, w: mW, h: 1.95 });

    s.addText(m.label, {
      x, y: mY + 2.05, w: mW, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 18, color: C.charcoal, italic: true, align: "center",
    });
    s.addText(m.sub, {
      x, y: mY + 2.45, w: mW, h: 0.5,
      fontFace: FONT_BODY, fontSize: 11, color: C.muted, align: "center",
    });
  });

  footer(s, 3, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 4 — KEY FEATURES (PART 1)
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("KEY FEATURES   —   PART 1 OF 2", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 6,
  });
  s.addText("Built around how you actually quote.", {
    x: 0.6, y: 1.05, w: 12, h: 0.8,
    fontFace: FONT_HEAD, fontSize: 32, color: C.charcoal, italic: true,
  });

  const feats = [
    { n: "01", h: "Multi-step workflow",        b: "Project → Rooms → Final Details → Summary → Send. Each step validates the last so nothing slips through." },
    { n: "02", h: "Itemized line by line",      b: "Cabinetry, upgrades, finishing, install — every component priced from your tables, never guessed." },
    { n: "03", h: "Live totals",                b: "Change a quantity, swap a finish, toggle tax — the grand total recalculates instantly." },
    { n: "04", h: "Master adjustment %",        b: "Dial a discount or markup across every line at once. Great for repeat customers or rush jobs." },
  ];

  // 2x2 grid
  const gx = 1.0, gy = 2.4, w = 5.7, h = 2.1, gap = 0.3;
  feats.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (w + gap), y = gy + row * (h + gap);
    s.addShape("rect", { x, y, w, h, fill: { color: C.surface }, line: { color: C.border, width: 1 } });
    s.addShape("rect", { x, y, w: 0.06, h, fill: { color: C.brass }, line: { type: "none" } });

    s.addText(f.n, {
      x: x + 0.3, y: y + 0.25, w: 1.0, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 22, color: C.brass, italic: true,
    });
    s.addText(f.h, {
      x: x + 1.3, y: y + 0.2, w: w - 1.5, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 22, color: C.charcoal,
    });
    s.addText(f.b, {
      x: x + 1.3, y: y + 0.85, w: w - 1.5, h: 1.1,
      fontFace: FONT_BODY, fontSize: 12, color: C.text,
    });
  });

  footer(s, 4, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 5 — KEY FEATURES (PART 2)
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("KEY FEATURES   —   PART 2 OF 2", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 6,
  });
  s.addText("From estimate to inbox.", {
    x: 0.6, y: 1.05, w: 12, h: 0.8,
    fontFace: FONT_HEAD, fontSize: 32, color: C.charcoal, italic: true,
  });

  const feats = [
    { n: "05", h: "Branded PDF quotes",         b: "Auto-generated, two-page templates with your logo and your colors. Customer-facing and internal versions, side by side." },
    { n: "06", h: "Email from the app",         b: "Send the quote to a client without leaving the screen. Replies come back to your inbox." },
    { n: "07", h: "Admin panel",                b: "Manage pricing tables, contractors, users, and bug reports. No developer needed for day-to-day changes." },
    { n: "08", h: "Cloud-synced",               b: "Quote from the office, the truck, or the job site. Same data, any device, real-time." },
  ];

  const gx = 1.0, gy = 2.4, w = 5.7, h = 2.1, gap = 0.3;
  feats.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (w + gap), y = gy + row * (h + gap);
    s.addShape("rect", { x, y, w, h, fill: { color: C.surface }, line: { color: C.border, width: 1 } });
    s.addShape("rect", { x, y, w: 0.06, h, fill: { color: C.brass }, line: { type: "none" } });

    s.addText(f.n, {
      x: x + 0.3, y: y + 0.25, w: 1.0, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 22, color: C.brass, italic: true,
    });
    s.addText(f.h, {
      x: x + 1.3, y: y + 0.2, w: w - 1.5, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 22, color: C.charcoal,
    });
    s.addText(f.b, {
      x: x + 1.3, y: y + 0.85, w: w - 1.5, h: 1.1,
      fontFace: FONT_BODY, fontSize: 12, color: C.text,
    });
  });

  footer(s, 5, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 6 — BUILT FOR YOUR WORKFLOW
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("BUILT FOR YOUR WORKFLOW", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 6,
  });
  s.addText("Your quoting logic, not someone else's template.", {
    x: 0.6, y: 1.05, w: 12, h: 0.8,
    fontFace: FONT_HEAD, fontSize: 30, color: C.charcoal, italic: true,
  });

  const rows = [
    { trade: "Cabinet Makers",         flow: "Rooms → cabinets, finishes, installation" },
    { trade: "Countertop Fabricators", flow: "Areas → slabs, edges, sinks, install" },
    { trade: "Landscapers",            flow: "Zones → materials, equipment, labor" },
    { trade: "Painters",               flow: "Rooms → surfaces, prep, paint type, coats" },
    { trade: "Custom Metal / Fab",     flow: "Pieces → material, fabrication, finishing" },
  ];

  const tableX = 1.2, tableY = 2.4, rowH = 0.65, tableW = 11;
  // Header
  s.addShape("rect", { x: tableX, y: tableY, w: tableW, h: rowH, fill: { color: C.charcoal }, line: { type: "none" } });
  s.addText("INDUSTRY", {
    x: tableX + 0.3, y: tableY, w: 4, h: rowH,
    fontFace: FONT_BODY, fontSize: 11, color: C.brassLight, bold: true, charSpacing: 4, valign: "middle",
  });
  s.addText("HOW IT ADAPTS", {
    x: tableX + 4.3, y: tableY, w: 6.5, h: rowH,
    fontFace: FONT_BODY, fontSize: 11, color: C.brassLight, bold: true, charSpacing: 4, valign: "middle",
  });

  rows.forEach((r, i) => {
    const y = tableY + rowH + i * rowH;
    if (i % 2 === 0) {
      s.addShape("rect", { x: tableX, y, w: tableW, h: rowH, fill: { color: C.surface }, line: { type: "none" } });
    }
    // brass tick marker
    s.addShape("rect", { x: tableX + 0.15, y: y + 0.22, w: 0.1, h: 0.2, fill: { color: C.brass }, line: { type: "none" } });
    s.addText(r.trade, {
      x: tableX + 0.4, y, w: 3.9, h: rowH,
      fontFace: FONT_HEAD, fontSize: 16, color: C.charcoal, valign: "middle",
    });
    s.addText(r.flow, {
      x: tableX + 4.3, y, w: 6.5, h: rowH,
      fontFace: FONT_BODY, fontSize: 13, color: C.text, valign: "middle",
    });
  });

  // Bottom callout
  s.addText("If you can describe how you quote, I can build it.", {
    x: 0.6, y: 6.3, w: 12, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 18, color: C.brass, italic: true, align: "center",
  });

  footer(s, 6, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 7 — REAL PRODUCTION EXAMPLE
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s, C.charcoal);

  // ── Left side — title + 2×2 outcome blocks ──────────────────
  s.addShape("rect", { x: 0.5, y: 0.6, w: 0.8, h: 0.12, fill: { color: C.brass }, line: { type: "none" } });

  s.addText("LIVE IN PRODUCTION", {
    x: 0.5, y: 0.85, w: 6.2, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brassLight, bold: true, charSpacing: 6,
  });
  s.addText("Engstrom Wood Products", {
    x: 0.5, y: 1.25, w: 6.2, h: 1.0,
    fontFace: FONT_HEAD, fontSize: 38, color: C.textOnDark,
  });
  s.addText("engstromwoodproducts.com  ·  Rogers, MN", {
    x: 0.5, y: 2.2, w: 6.2, h: 0.38,
    fontFace: FONT_BODY, fontSize: 12, color: C.brassLight, italic: true,
  });

  // 4 outcomes as 2×2 grid on left
  const outcomes = [
    { t: "Hours → minutes",   b: "Quotes that took an afternoon now go out before the customer leaves the lot." },
    { t: "Zero pricing drift", b: "Every line item from a single source of truth, every time." },
    { t: "One-click duplicate", b: "Clone last year's quote, tweak two lines, send." },
    { t: "Quote from anywhere", b: "Phone, tablet, laptop. Same data, real-time, no install." },
  ];

  const oW = 2.92, oH = 1.48, oGap = 0.2;
  const col0x = 0.5, col1x = 0.5 + oW + oGap;
  const oY = 2.85;

  outcomes.forEach((o, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? col0x : col1x;
    const y = oY + row * (oH + oGap);
    s.addShape("rect", { x, y, w: oW, h: oH, fill: { color: "262C36" }, line: { type: "none" } });
    s.addShape("rect", { x, y, w: oW, h: 0.055, fill: { color: C.brass }, line: { type: "none" } });
    s.addText(o.t, {
      x: x + 0.22, y: y + 0.18, w: oW - 0.44, h: 0.46,
      fontFace: FONT_HEAD, fontSize: 16, color: C.brassLight, italic: true,
    });
    s.addText(o.b, {
      x: x + 0.22, y: y + 0.66, w: oW - 0.44, h: 0.72,
      fontFace: FONT_BODY, fontSize: 11, color: C.textOnDark,
    });
  });

  s.addText("Used daily, by the people who quote.", {
    x: 0.5, y: 6.55, w: 6.2, h: 0.38,
    fontFace: FONT_BODY, fontSize: 12, color: C.brassLight, italic: true,
  });

  // ── Right side — live app screenshot ──────────────────────────
  // Thin brass border frame
  s.addShape("rect", { x: 6.9, y: 0.3, w: 6.18, h: 6.55,
    fill: { color: "000000" }, line: { color: C.brass, width: 1.5 } });
  s.addImage({
    path: "C:/Users/SURFACE/Downloads/EWP Quote App/screenshots/01_dashboard.png",
    x: 6.9, y: 0.3, w: 6.18, h: 6.55,
  });

  footer(s, 7, TOTAL, true);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 8 — WHAT YOU GET
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("WHAT YOU GET", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 6,
  });
  s.addText("A finished tool. Yours.", {
    x: 0.6, y: 1.05, w: 12, h: 0.8,
    fontFace: FONT_HEAD, fontSize: 36, color: C.charcoal, italic: true,
  });

  const items = [
    { t: "Custom-built app",     b: "Designed around your branding, your logo, your colors, and your pricing logic." },
    { t: "Cloud database",       b: "Your project data, only yours — never shared, never resold, with daily backups." },
    { t: "Admin panel",          b: "Self-service for pricing tables, contractors, and team access. No developer round-trips." },
    { t: "PDF templates",        b: "Two layouts ready to send: a clean customer-facing quote and a detailed internal sheet." },
    { t: "Email integration",    b: "Quotes go out from your domain, replies come back to your inbox." },
    { t: "30 days free tweaks",  b: "Real shops surface real edge cases. The first month after launch, I keep refining at no charge." },
  ];

  // 2 column layout
  const gx = 1.0, gy = 2.4, w = 5.7, h = 1.4, gap = 0.25;
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (w + gap), y = gy + row * (h + gap);
    // brass square as bullet
    s.addShape("rect", { x, y: y + 0.2, w: 0.18, h: 0.18, fill: { color: C.brass }, line: { type: "none" } });
    s.addText(it.t, {
      x: x + 0.4, y: y + 0.05, w: w - 0.4, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 19, color: C.charcoal,
    });
    s.addText(it.b, {
      x: x + 0.4, y: y + 0.55, w: w - 0.4, h: 0.85,
      fontFace: FONT_BODY, fontSize: 12, color: C.text,
    });
  });

  footer(s, 8, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 9 — THE PROCESS
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("THE PROCESS", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 6,
  });
  s.addText("Four steps. About six weeks, end to end.", {
    x: 0.6, y: 1.05, w: 12, h: 0.8,
    fontFace: FONT_HEAD, fontSize: 30, color: C.charcoal, italic: true,
  });

  const steps = [
    { n: "1", t: "Discovery call",     b: "30 minutes. Show me how you quote today — even the messy parts. I'll ask the awkward questions now so we don't hit them later." },
    { n: "2", t: "Working prototype",  b: "Two weeks to a real, clickable app with your pricing logic loaded in. Not mockups — actual software you can break." },
    { n: "3", t: "Test and refine",    b: "You quote a few real jobs through it. I fix friction. We iterate until it fits your shop, not the other way around." },
    { n: "4", t: "Launch",             b: "We go live. Your team gets a short walkthrough. You stop opening the spreadsheet for new quotes." },
  ];

  const sY = 2.5, sH = 1.05, gap = 0.18;
  steps.forEach((st, i) => {
    const y = sY + i * (sH + gap);
    s.addShape("rect", { x: 1.0, y, w: 11.3, h: sH, fill: { color: C.surface }, line: { color: C.border, width: 1 } });
    // big brass numeral
    s.addText(st.n, {
      x: 1.15, y: y + 0.05, w: 1.3, h: sH - 0.1,
      fontFace: FONT_HEAD, fontSize: 56, color: C.brass, italic: true, valign: "middle",
    });
    s.addText(st.t, {
      x: 2.5, y: y + 0.1, w: 9.6, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 20, color: C.charcoal,
    });
    s.addText(st.b, {
      x: 2.5, y: y + 0.5, w: 9.6, h: 0.55,
      fontFace: FONT_BODY, fontSize: 12, color: C.text,
    });
  });

  footer(s, 9, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 10 — INVESTMENT
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s);
  leftAccent(s);

  s.addText("INVESTMENT", {
    x: 0.6, y: 0.7, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 6,
  });
  s.addText("Priced for a small shop. Built like an enterprise tool.", {
    x: 0.6, y: 1.05, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 28, color: C.charcoal, italic: true,
  });

  // Two cards: one-time + ongoing
  const cards = [
    {
      label: "ONE-TIME BUILD",
      title: "A flat fee per project",
      points: [
        "Scope based on how many product types and pricing rules you have",
        "Typical small-shop range fits within an annual tooling or marketing budget",
        "Fixed price after the discovery call — no hourly surprises",
      ],
    },
    {
      label: "OPTIONAL ONGOING",
      title: "Monthly hosting + tweaks",
      points: [
        "Cloud hosting, daily backups, security patches",
        "A pool of monthly hours for new fields, reports, or tweaks",
        "Cancel anytime — your data stays yours",
      ],
    },
  ];

  const cY = 2.4, cH = 3.6, cW = 5.7, gap = 0.4;
  const startX = (W - (cW * 2 + gap)) / 2;
  cards.forEach((card, i) => {
    const x = startX + i * (cW + gap);
    const isPrimary = i === 0;
    s.addShape("rect", {
      x, y: cY, w: cW, h: cH,
      fill: { color: isPrimary ? C.charcoal : C.surface },
      line: { color: isPrimary ? C.charcoal : C.border, width: 1 },
    });
    s.addShape("rect", { x, y: cY, w: cW, h: 0.08, fill: { color: C.brass }, line: { type: "none" } });

    s.addText(card.label, {
      x: x + 0.45, y: cY + 0.4, w: cW - 0.9, h: 0.3,
      fontFace: FONT_BODY, fontSize: 11, color: C.brass, bold: true, charSpacing: 5,
    });
    s.addText(card.title, {
      x: x + 0.45, y: cY + 0.75, w: cW - 0.9, h: 0.7,
      fontFace: FONT_HEAD, fontSize: 26, color: isPrimary ? C.textOnDark : C.charcoal, italic: true,
    });

    card.points.forEach((p, j) => {
      const py = cY + 1.65 + j * 0.55;
      s.addShape("rect", { x: x + 0.45, y: py + 0.18, w: 0.12, h: 0.12, fill: { color: C.brass }, line: { type: "none" } });
      s.addText(p, {
        x: x + 0.7, y: py, w: cW - 1.15, h: 0.5,
        fontFace: FONT_BODY, fontSize: 12.5,
        color: isPrimary ? C.textOnDark : C.text,
      });
    });
  });

  s.addText("\"Quote me back. I'll send a real number after our call.\"", {
    x: 0.6, y: 6.35, w: 12, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 17, color: C.brass, italic: true, align: "center",
  });

  footer(s, 10, TOTAL);
}

// ───────────────────────────────────────────────────────────────
// SLIDE 11 — LET'S TALK (CTA)
// ───────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgFill(s, C.charcoal);

  // brass block top-left motif
  s.addShape("rect", { x: 0.6, y: 0.6, w: 0.8, h: 0.12, fill: { color: C.brass }, line: { type: "none" } });

  s.addText("LET'S TALK", {
    x: 0.6, y: 0.85, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.brassLight, bold: true, charSpacing: 6,
  });

  s.addText("If your quoting process", {
    x: 0.6, y: 1.7, w: 12, h: 1,
    fontFace: FONT_HEAD, fontSize: 50, color: C.textOnDark,
  });
  s.addText("is slowing you down,", {
    x: 0.6, y: 2.65, w: 12, h: 1,
    fontFace: FONT_HEAD, fontSize: 50, color: C.textOnDark,
  });
  s.addText("it doesn't have to.", {
    x: 0.6, y: 3.6, w: 12, h: 1,
    fontFace: FONT_HEAD, fontSize: 50, color: C.brass, italic: true,
  });

  // Contact card
  const cY = 5.2, cH = 1.7;
  s.addShape("rect", { x: 0.6, y: cY, w: 12.1, h: cH, fill: { color: "262C36" }, line: { type: "none" } });
  s.addShape("rect", { x: 0.6, y: cY, w: 0.1, h: cH, fill: { color: C.brass }, line: { type: "none" } });

  s.addText("Reply to my email, or grab 30 minutes on my calendar — link below.", {
    x: 1.0, y: cY + 0.2, w: 11, h: 0.5,
    fontFace: FONT_BODY, fontSize: 14, color: C.textOnDark,
  });

  s.addText("[ Your Name ]   ·   [ your.email@domain.com ]   ·   [ (xxx) xxx-xxxx ]", {
    x: 1.0, y: cY + 0.75, w: 11, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: C.brassLight,
  });
  s.addText("[ calendar link goes here — e.g. cal.com/yourname ]", {
    x: 1.0, y: cY + 1.15, w: 11, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: C.muted, italic: true,
  });

  s.addText("11 / 11", {
    x: W - 1.2, y: H - 0.42, w: 0.6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: C.brassLight, align: "right",
  });
}

// ── Save ───────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\SURFACE\\Downloads\\EWP Quote App\\Quote_App_Pitch_Deck.pptx" })
  .then(name => console.log("Saved:", name))
  .catch(err => { console.error("ERROR:", err); process.exit(1); });
