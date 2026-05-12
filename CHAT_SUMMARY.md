# EWP Quote App — Chat Handoff Summary
> Generated 2026-05-12. Feed this to the next chat to continue seamlessly.

---

## 1. Project Overview

**App name:** Engstrom Wood Products — Estimate Manager
**Stack:** React + Vite frontend, Supabase (PostgreSQL + Auth) backend
**Repo:** `https://github.com/lazyPelican/ewp-web-app.git`
**Local path:** `C:\Users\SURFACE\Downloads\EWP Quote App\`
**Live & in production** as of 2026-04-12

---

## 2. Source File Map

```
src/
├── App.jsx                  ← Main app shell, CSS styles, routing logic (~1707 lines)
├── Auth.jsx                 ← Login / signup screen
├── main.jsx                 ← React root, session + guest routing
├── BgDots.jsx               ← Animated background dots
├── supabase.js              ← Supabase client
├── sanitize.js              ← Input sanitization helpers
├── global.css               ← Base resets
├── appUtils.js              ← Shared helpers & constants (fmtDate, fmtId, PRICING, etc.)
├── pdfExport.js             ← PDF export functions
├── PDFTemplates.jsx         ← PDF layout templates
├── AdminPanel.jsx           ← Admin panel (lazy loaded)
├── BugReports.jsx           ← Bug reports (lazy loaded)
├── PendingApproval.jsx      ← Pending approval screen
├── ErrorBoundary.jsx        ← Error boundary wrapper
├── pricing.js               ← Pricing data
└── components/
    ├── Dashboard.jsx        ← Project list / home screen
    ├── ProjectSetup.jsx     ← Step 1: Project Details form
    ├── RoomsPage.jsx        ← Step 2: Room Estimates (+ CabinetrySection, UpgradesSection, FinishingSection, InstallSection)
    ├── FinalDetailsPage.jsx ← Step 3: Delivery + tax
    ├── SummaryPage.jsx      ← Step 4: Estimate summary
    ├── PrintEmailPage.jsx   ← Step 5: Print & email
    ├── EmailModal.jsx       ← Email sending modal
    ├── Field.jsx            ← Form field wrapper
    └── Toast.jsx            ← Toast notification
```

> **Note:** `App.jsx` was recently split from ~3390 lines into the above structure to reduce token costs. If you need to find something that "should be in App.jsx" and it isn't, check `src/components/` or `src/appUtils.js`.

---

## 3. App Architecture

### View routing (no React Router — state-based)
The `view` state in `App.jsx` controls what renders:
- `"dashboard"` — project list
- `"new"` — multi-step form (steps 0–4)

### Sticky header structure
```
<div style="position:sticky; top:0; zIndex:100; background:var(--ivory2)">
  <div class="topbar">...</div>
  {isGuest && <GuestBanner />}
  {view==="new" && <Stepper />}
  {view==="new" && project.id && <QuickSaveBar />}
</div>
<div class="main">
  {/* page content */}
</div>
```

### CSS theming
All CSS lives in a `const styles = \`...\`` string at the top of `App.jsx`, injected via `<style>`. Uses CSS custom properties:

| Variable | Light | Dark | Purpose |
|----------|-------|------|---------|
| `--gold` | `#C9A96E` | `#C99E64` | Primary accent (brass) |
| `--ivory2` | `#EAE8E2` | `#1A1E25` | App surface / section bg |
| `--ivory3` | `#DCDAD2` | `#262A33` | Borders, dividers |
| `--char` | `#2D2D2D` | `#E8E4D9` | Body text |
| `--header-bg` | `rgba(255,255,255,0.92)` | `rgba(14,16,20,0.92)` | Sticky header background |
| `--card-bg` | `rgba(255,255,255,0.85)` | `rgba(25,29,36,0.82)` | Card backgrounds |

---

## 4. Guest Mode

Fully implemented. Key behaviour:
- "Continue as Guest" button on the signin tab of `Auth.jsx`
- Guests see **no real saved quotes** — full data isolation
- Estimates stored in React state only — **discarded on exit**
- Amber banner shown inside the app with "Sign in to save →" button

### Data flow
```
main.jsx  →  isGuest state
  Auth.jsx     onGuestLogin prop  →  sets isGuest = true
  App.jsx      isGuest prop
    loadData:        skips Supabase project/contractor fetch
    saveProject:     React state only, shows "Saved for this session" toast
    deleteProject:   React state only
    duplicateProject: React state only
    Sign out button: calls onGuestExit instead of supabase.auth.signOut()
    Report Error:    hidden for guests
    My Reports:      hidden for guests
```

### Guest scroll bug fix (completed this session)
**Bug:** "Project Details" page title was bleeding up through the sticky header when scrolling in guest mode.
**Fix:** Added `background: "var(--ivory2)"` to the sticky wrapper div in `App.jsx` so it clips scrolled content cleanly.

---

## 5. Recent Work Completed

| Task | Status |
|------|--------|
| Guest mode (login, isolation, banner, exit) | ✅ Done |
| Guest scroll bug fix | ✅ Done |
| App.jsx split into components | ✅ Done & pushed |
| Cold email outreach .txt files (17 leads) | ✅ Done & pushed |
| PowerPoint pitch deck with real screenshots | ✅ Done |

---

## 6. Color Palette / UI Redesign (Pending)

The user wants to redesign the color scheme. **This has NOT been implemented yet.**

If this comes up in future:
- Preview mockups are at: `palette-v2.html`, `palette-v3.html`, `palette-v4.html` in the project root
- User liked **Burgundy & Rose Gold** and requested 3 matte variants (`palette-v4.html` — D1, D2, D3)
- **User has not yet chosen a variant**
- To implement: update CSS vars in `App.jsx` `:root` + `.dark` blocks, update `Auth.jsx` inline `t` theme object, update `BgDots.jsx` dot colors

---

## 7. Other Project Files

```
Root/
├── build_deck.cjs           ← Node script to generate pitch deck (uses pptxgenjs)
├── screenshots/             ← App screenshots used in pitch deck
│   ├── 01_dashboard.png
│   ├── 02_room_estimates.png
│   └── 03_summary.png
├── outreach_emails/         ← 17 cold email .txt files + follow-up template
├── Quote_App_Pitch_Deck.pptx
└── CHAT_SUMMARY.md          ← This file
```

---

## 8. Build & Deploy

```bash
npm run build    # outputs to dist/  (~1.8MB App chunk — expected, no concern)
```

Deployed to Netlify (static host). The large bundle size warning is pre-existing and harmless.

---

## 9. Key Conventions

- **Never mention** dev server, `preview_start`, or hooks in responses
- Non-technical end users — keep UI language simple
- All form input sanitized via `src/sanitize.js` before any Supabase call
- Admin panel and Bug Reports are lazy-loaded (`React.lazy` + `Suspense`)
- Dark mode state stored in `localStorage` under key `"ewp-theme"`
