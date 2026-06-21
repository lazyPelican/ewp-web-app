# EWP Quote App - Session Summary (2026-06-19)

## Project
**Engstrom Wood Products (EWP) Estimate Manager** — React + Vite frontend, Supabase backend. Live in production at ewpquote.vercel.app.

## Repository
- GitHub: `https://github.com/lazyPelican/ewp-web-app.git`
- Branch: `main`
- Latest commit: `7e68e5e` — "Add customer PDF fixes, summary PDF, credit items, time tracker, dashboard filters"
- **Local and live are in sync** — all changes committed and pushed as of 2026-06-19

## Critical Instructions
- **Do NOT auto commit/push** — only commit/push when explicitly asked
- **Never** call `preview_start` or mention dev server checks
- **Never** mention hooks, preview_start, or dev server meta-commentary
- App is **live in production** — treat pushes accordingly

---

## What Was Done (Cumulative)

### 1. Dashboard Restructure (`src/components/Dashboard.jsx`)
- Fully rewritten as a hub with 3 clickable section cards: **Quotations**, **Under Contract**, **Closed/History**
- Each section has its own view, search bar, and gold-themed back button
- **Quotations** has 2 sub-cards: **Drafts** and **Quotes Ready for Clients**
- Under Contract quotes are **read-only for ALL users**
- **Stage filter chips** in Under Contract view: All, Drafting, Redlines, Building & Install, Punch List, Paid — each with count badges
- **Admin delete** enabled on Active and Closed sections (condition: `(section !== "active" && section !== "closed") || isAdmin`)
- Filter resets when navigating between sections

### 2. Status Lifecycle (`src/appUtils.js`)
- `ACTIVE_STAGES`: drafting → redlines → building → punchlist → paid
- `isActiveStatus(s)`, `getActiveStage(s)`, `isClosedStatus(s)` helpers
- `isRoomComplete`: all 4 checks changed from `parseFloat > 0` to `parseFloat !== 0` (supports negative/credit items)

### 3. Summary Table (`src/components/SummaryPage.jsx`) — DEPLOYED
- **Cabinetry + Upgrades merged** into single "Cabinetry" column (6 columns total)
- **Grand Total row** with gold border-top and gold text styling
- **Delivery row** fixed with `colSpan={5}` for proper alignment
- **Tax row** with proper colspan
- Item filters changed from `> 0` to `!== 0` for credit support

### 4. Customer PDF Fixes (`src/PDFTemplates.jsx`)
- **Hide LF for cabinetry**: `cabDescCols` changed from 3 columns (Description/Qty/Notes) to 2 columns (Description/Notes)
- **Show upgrade quantities**: Added `upgDescCols` with 3 columns (Description/Qty/Notes)
- All 4 item filter occurrences changed from `parseFloat(i.qty) > 0` to `!== 0`

### 5. Summary PDF (`src/PDFTemplates.jsx`, `src/pdfExport.js`, `src/components/PrintEmailPage.jsx`)
- New `SummaryPDFDoc` component wrapping only `CustomerSummaryPage` (no room pages)
- `exportPDFSummary`, `buildSummaryPDFBlob`, `previewPDFSummary` functions
- Third card on Print & Email page: "Summary Download" with download + preview buttons
- Description: "One-page overview with room totals, delivery, tax, and grand total — no per-room breakout."

### 6. Credit / Negative Line Items
- `src/components/RoomsPage.jsx`: Removed `min="0"` from all 4 qty/lf inputs
- Line totals display when `qty !== 0` (not `> 0`); negative items styled `color: var(--red)` with `textDecoration: "line-through"`
- Changes propagated to SummaryPage, PDFTemplates, and appUtils

### 7. Time Tracker (`src/TimeTracker.jsx` — NEW FILE)
Full time tracking + invoicing subsystem in Admin Panel:
- Start/stop timer with elapsed HH:MM:SS, description input
- **Inline editing**: click start time, stop time, or description to edit; supports multiple time formats
- **Debounced description save** (800ms) while timer running
- Invoiced entries locked from editing; running timer start time locked
- Weekly summaries grouped Mon–Sun, current week highlighted green
- Invoice ledger with paid/pending toggle, PDF/Email/Delete actions
- Invoice PDF: Space Grotesk + Archivo fonts, copper accent, pelican logo
- Hourly rate: $33.10/hr, client email: kmenzel@engstromwoodproducts.com

### 8. App.jsx Changes
- Status lifecycle imports and handlers (`updateProjectStage`, `closeProject`)
- Read-only logic for active/closed quotes
- CSS for hub cards, stage controls, dark mode overrides

### 9. AdminPanel.jsx
- Time Tracker tab added with right-aligned "⏱ Time Tracker" button

### 10. Other
- Footer padding bumped to 6px (`src/main.jsx`)
- New assets: `public/favicon-512_dark.webp`, `public/logo.png`
- Outreach emails updated
- `production_flow_project.md` planning doc added
- `docx` npm package added as dev dependency

---

## Supabase Tables

**`time_entries`**: id (uuid PK), user_id, started_at, stopped_at, duration_seconds, description, invoice_id (FK → invoices.id), created_at

**`invoices`**: id (uuid PK), invoice_number (unique), week_start, week_end, hourly_rate, total_hours, total_amount, status ("pending"/"paid"), paid_on, received_on, emailed_at, created_at

## Pending / TODO
- **Supabase migration**: `UPDATE projects SET status = 'active:drafting' WHERE status = 'confirmed';`
- **Tasks report .docx**: `EWP_Completed_Tasks_Report.docx` was generated but uses old screenshots from `screenshots/` folder — needs fresh screenshots from the live app to be accurate
- `generate_tasks_doc.cjs` script exists to regenerate the report — update screenshot paths and re-run
- Keith's remaining feature requests tracked in `.claude/plans/bilal-ahmed-9-09-pm-rosy-island.md`

## Key Files
- **`src/App.jsx`** (~2000+ lines) — Main app, all CSS in `<style>` tag
- **`src/components/Dashboard.jsx`** — Hub with section cards, stage filters
- **`src/components/SummaryPage.jsx`** — Summary table with merged columns + Grand Total
- **`src/components/PrintEmailPage.jsx`** — 3 PDF download cards (Internal, Customer, Summary)
- **`src/components/RoomsPage.jsx`** — Room estimates with credit item support
- **`src/PDFTemplates.jsx`** — All PDF templates (Internal, Customer, Summary)
- **`src/pdfExport.js`** — Lazy-loaded PDF export wrappers
- **`src/TimeTracker.jsx`** — Time tracking + invoicing
- **`src/AdminPanel.jsx`** — Admin panel with Time Tracker tab
- **`src/appUtils.js`** — Calculations, helpers, status lifecycle
- **`src/main.jsx`** — App shell, footer, auth
- **`public/logo.png`** — Pelican logo for invoices

## CSS Variable Reference
### Light mode
- `--bg: #F2F1ED`, `--text/--char: #15171C`, `--gold: #5B8C5A`, `--gold-bg: #EBF3EB`
- `--surface/--card-bg: #ffffff`, `--border/--ivory3: #DCDAD2`

### Dark mode
- `--bg: #0E1014`, `--text/--char: #E8E4D9`, `--gold: #7BAF7A`
- `--surface/--card-bg: #191D24`, `--border/--ivory3: #262A33`
