# EWP Quote App - Session Summary (2026-06-18)

## Project
**Engstrom Wood Products (EWP) Estimate Manager** — React + Vite frontend, Supabase backend. Live in production at ewpquote.vercel.app.

## Repository
- GitHub: `https://github.com/lazyPelican/ewp-web-app.git`
- Branch: `main`
- Latest commit: `671b4ae` — "Remove duplicate section-banner CSS that hid Add Row buttons"

## Critical Instructions
- **Do NOT auto commit/push** — only commit/push when explicitly asked
- **Never** call `preview_start` or mention dev server checks
- **Never** mention hooks, preview_start, or dev server meta-commentary
- App is **live in production** — treat pushes accordingly

---

## What Was Done This Session

### 1. Dashboard Restructure (`src/components/Dashboard.jsx`)
- Fully rewritten as a hub with 3 clickable section cards: **Quotations**, **Under Contract**, **Closed/History**
- Each section has its own view, search bar (center-aligned), and gold-themed back button
- **Quotations** has 2 sub-cards: **Drafts** and **Quotes Ready for Clients**
- Navigation state: `dashView: "hub" | "quotations" | "drafts" | "completed" | "active" | "closed"`
- Under Contract quotes are **read-only for ALL users** (not just non-admins)

### 2. Status Lifecycle (`src/appUtils.js`)
Added at bottom of file (before `blankRoom`):
- `ACTIVE_STAGES`: drafting → redlines → building → punchlist → paid
- `isActiveStatus(s)` — checks `s.startsWith("active:")`
- `getActiveStage(s)` — strips "active:" prefix
- `isClosedStatus(s)` — checks `s === "closed"`
- Data loading maps `"confirmed"` → `"active:drafting"` for backward compat

### 3. App.jsx Changes
- Added imports for `ACTIVE_STAGES, isActiveStatus, getActiveStage, isClosedStatus`
- Read-only logic: `isLocked` applies to ALL users on active/closed quotes
- Added `updateProjectStage` and `closeProject` handlers
- Added CSS for hub cards, gold back button, center-aligned search, stage controls, dark mode overrides
- Back button: `background: var(--gold-bg); border: 1.5px solid var(--gold); color: var(--gold)`

### 4. Time Tracker Feature (`src/TimeTracker.jsx` — NEW FILE)
Full time tracking + invoicing subsystem in the Admin Panel:

**Timer Section:**
- Start/stop button with elapsed HH:MM:SS counter
- Description input, today's entries table
- Timer resumes on page refresh (queries `stopped_at IS NULL`)

**Weekly Summaries:**
- Grouped by Mon–Sun, collapsible cards
- Current week highlighted green with "THIS WEEK" badge
- Generate Invoice / Email / PDF buttons per week

**Invoice Ledger:**
- Table with toggle "✓ Paid" / "○ Pending" button
- PDF, Email, and Delete (🗑) action buttons per row
- Delete unlinks time entries so the week can be re-invoiced

**Invoice PDF (branded, matches HTML template exactly):**
- **Fonts**: Space Grotesk + Archivo (registered from Google Fonts TTF URLs)
- **Colors**: accent `#c2693c`, accent-deep `#a8542d`, ink `#17181a`, wash `#f7f5f2`
- **Logo**: Pelican logo at `public/logo.png` (dark circle, transparent bg, auto-detected on load)
- **Layout**: Masthead with logo + name + "INVOICE" title → copper rule → From/Bill To panels → invoice meta → dark-header data table → Notes + Totals with copper "TOTAL DUE" box → footer
- **Title**: "Business Automation Consultant" (not "Software Developer & Automation Consultant")
- **Footer**: "Thank you for your business." removed
- Invoice number format: `INV-YYYY-MMDD` (year + month+day of week start)
- Hourly rate: $33.10/hr
- Email uses existing `send-quote-email` Supabase edge function
- Client email: kmenzel@engstromwoodproducts.com

### 5. AdminPanel.jsx Changes
- Added `import { TimeTrackerTab } from "./TimeTracker.jsx"`
- Tab bar: right-aligned "⏱ Time Tracker" button with `marginLeft: "auto"`
- Tab content: `{tab === "timetracker" && <TimeTrackerTab ... />}`

### 6. Footer (`src/main.jsx`)
- Padding bumped from `3px` to `6px` top and bottom

---

## Supabase Tables (already created)

**`time_entries`**: id (uuid PK), user_id, started_at, stopped_at, duration_seconds, description, invoice_id (FK → invoices.id), created_at

**`invoices`**: id (uuid PK), invoice_number (unique), week_start, week_end, hourly_rate, total_hours, total_amount, status ("pending"/"paid"), paid_on, received_on, emailed_at, created_at

Historical data (15 entries from Google Sheets) was imported via INSERT SQL.

## Pending
- **Supabase migration**: `UPDATE projects SET status = 'active:drafting' WHERE status = 'confirmed';`
- **Uncommitted changes** — all work is local, nothing pushed yet
- If logo needs updating, replace `public/logo.png` (square PNG, transparent bg, dark circle with pelican)

## Key Files
- **`src/App.jsx`** (~2000+ lines) — Main app, all CSS in `<style>` tag
- **`src/components/Dashboard.jsx`** — Hub with section cards
- **`src/TimeTracker.jsx`** — Time tracking + invoicing
- **`src/AdminPanel.jsx`** — Admin panel with Time Tracker tab
- **`src/appUtils.js`** — Status lifecycle helpers
- **`src/main.jsx`** — App shell, footer, auth
- **`public/logo.png`** — Pelican logo for invoices

## CSS Variable Reference
### Light mode
- `--bg: #F2F1ED`, `--text/--char: #15171C`, `--gold: #5B8C5A`, `--gold-bg: #EBF3EB`
- `--surface/--card-bg: #ffffff`, `--border/--ivory3: #DCDAD2`

### Dark mode
- `--bg: #0E1014`, `--text/--char: #E8E4D9`, `--gold: #7BAF7A`
- `--surface/--card-bg: #191D24`, `--border/--ivory3: #262A33`
