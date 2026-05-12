# EWP Quote App — Chat Summary & Handoff
> Generated 2026-05-12. Feed this file to the next chat to continue seamlessly.

---

## 1. Project Overview

**App name:** Engstrom Wood Products — Estimate Manager  
**Stack:** React + Vite frontend, Supabase (PostgreSQL + Auth) backend  
**Repo location:** `C:\Users\SURFACE\Downloads\EWP Quote App\`  
**Live & in production** as of 2026-04-12

### Key source files
| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app (all views, styles, logic — large file ~3000+ lines) |
| `src/Auth.jsx` | Login/signup screen |
| `src/main.jsx` | React root, session/guest routing |
| `src/BgDots.jsx` | Animated background dots |
| `src/supabase.js` | Supabase client |
| `src/sanitize.js` | Input sanitization helpers |
| `src/global.css` | Global CSS (used for base resets) |
| `build_deck.cjs` | Node script to generate pitch deck PowerPoint |

---

## 2. Completed Work This Session

### 2a. Guest Mode ✅
Added "Continue as Guest" to the login screen. Guests:
- See no real saved quotes (full data isolation)
- Can create estimates — stored in React state only
- All guest data is discarded on exit (no Supabase writes)
- Amber banner shown inside the app: *"Guest mode — estimates exist only for this session"*

**Files changed:**

**`src/main.jsx`** — Added `isGuest` state + routing:
```jsx
const [isGuest, setIsGuest] = useState(false)

// routing order: isGuest check BEFORE !session check
} else if (isGuest) {
  content = (
    <Suspense fallback={suspenseFallback}>
      <App session={null} isAdmin={false} isGuest={true}
        onGuestExit={() => setIsGuest(false)} onOpenAdmin={() => {}} />
    </Suspense>
  )
} else if (!session) {
  content = (
    <Suspense fallback={suspenseFallback}>
      <Auth onGuestLogin={() => setIsGuest(true)} />
    </Suspense>
  )
}
```

**`src/Auth.jsx`** — Added `onGuestLogin` prop + "Continue as Guest" button at bottom of signin tab.

**`src/App.jsx`** — Multiple changes:
- Function signature: `export default function App({ session, isAdmin, onOpenAdmin, isGuest = false, onGuestExit })`
- `loadData`: when `isGuest`, only fetches pricing (skips projects + contractors)
- `saveProject`: guest branch → stores in React state only, shows "Saved for this session" toast
- `confirmDeleteProject` / `duplicateProject`: guest branch → React state only
- Sign out button: `isGuest ? onGuestExit : supabase.auth.signOut()`, label "Exit Guest"
- Report Error button: hidden for guests (`{!isGuest && ...}`)
- My Reports button: hidden for guests
- Amber guest banner rendered inside sticky wrapper (below topbar)

---

### 2b. Guest Mode Bug Fix ✅ (just completed — last thing done this session)
**Bug:** When guest scrolls up, "Project Details" page title bleeds up through the header.

**Root cause:** The sticky wrapper (`position: sticky; top: 0; zIndex: 100`) had no background, so the semi-transparent guest banner (`rgba(168,129,71,0.10)`) let scrolled content show through.

**Fix applied to `src/App.jsx`:**
```jsx
{/* TOPBAR + STEPPER sticky wrapper */}
<div style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--ivory2)" }}>
```
`--ivory2` = `#EAE8E2` (light) / `#1A1E25` (dark) — solid opaque background that clips content cleanly.

---

### 2c. PowerPoint Screenshots ✅
Updated `build_deck.cjs` to embed real app screenshots:
- Screenshots saved by user to: `C:\Users\SURFACE\Downloads\EWP Quote App\screenshots\`
  - `01_dashboard.png`, `02_room_estimates.png`, `03_summary.png`
- Slide 3: 3 screenshots with brass border frames using `addImage()`
- Slide 7: Two-column layout — outcome blocks left, large dashboard screenshot right

---

### 2d. Cold Email Outreach Files ✅
`outreach_emails/` folder — 18 .txt files committed to GitHub:
- `00_FOLLOWUP_TEMPLATE.txt` — follow-up template + sending tips
- `01_SA_Woodwork.txt` through `17_Northland_Custom_Ironworks.txt`
- Format: `TO: email`, `SUBJECT: ...`, personalized body
- 11 companies had direct emails; 6 had contact-form URLs + phone numbers

---

## 3. Pending Work — COLOR PALETTE REDESIGN 🎨

### Status
The user is **choosing a color palette** to implement across the full app. Three rounds of mockups were generated. The user narrowed to **Burgundy & Rose Gold** and then asked for 3 matte variants.

### Palette preview files
| File | Contents |
|------|---------|
| `palette-v2.html` | Options A (Cobalt & Copper), B (Emerald & Gold), C (Plum & Teal) |
| `palette-v3.html` | Options D (Burgundy & Rose Gold), E (Slate & Neon Lime), F (Obsidian & Orange) |
| `palette-v4.html` | **D1, D2, D3** — three matte variants of Burgundy & Rose Gold ← CURRENT |

### The three matte variants (from palette-v4.html)
| Variant | Name | Dark base | Accent | Light | Vibe |
|---------|------|-----------|--------|-------|------|
| **D1** | Classic Matte | `#2C1018` wine dark | `#B87860` dusty rose gold | `#FBF7F4` cream | Closest to original D, clean & timeless |
| **D2** | Dusty Plum | `#1E1120` deep plum | `#A06878` dusty rose | `#FAF6F8` blush white | Softer, vintage, plum-shifted |
| **D3** | Terracotta Burgundy | `#1E1410` dark clay | `#C89070` copper sand | `#FAF4EE` warm white | Warmest, earthy, clay/terracotta influence |

### ⚠️ USER HAS NOT YET CHOSEN — awaiting selection of D1, D2, or D3

---

## 4. How to Implement the Chosen Palette

Once the user picks D1, D2, or D3, update these files:

### A. `src/App.jsx` — CSS variables block (around line 172)
Update `:root` (light mode) and `.dark` (dark mode) variable values:

**Current light mode key vars:**
```css
:root {
  --header-bg:     rgba(255, 255, 255, 0.92);
  --header-border: #E8E5DC;
  --header-text:   #1F242E;
  --gold:          #C9A96E;
  --gold-light:    #D4B97E;
  --gold-bg:       #F5EFE3;
  --ivory2:        #EAE8E2;
  --ivory3:        #DCDAD2;
  --char:          #2D2D2D;
  --card-bg:       rgba(255, 255, 255, 0.85);
  --input-bg:      #F8F8F4;
}
```

**Current dark mode key vars:**
```css
.dark {
  --header-bg:     rgba(14, 16, 20, 0.92);
  --header-border: #2A2F38;
  --gold:          #C99E64;
  --ivory2:        #1A1E25;
  --ivory3:        #262A33;
  --char:          #E8E4D9;
  --card-bg:       rgba(25, 29, 36, 0.82);
  --input-bg:      #1A1E25;
}
```

**Replacement values per variant:**

**D1 — Classic Matte:**
```
Light:  --ivory2:#F2EAE4  --ivory3:#E0D4CC  --gold:#B87860  --gold-light:#D4A890
        --header-bg:rgba(242,234,228,0.95)  --char:#2D1820  --card-bg:rgba(255,255,255,0.88)
Dark:   --ivory2:#241018  --ivory3:#3D1824  --gold:#B87860  --gold-light:#D4A890
        --header-bg:rgba(44,16,24,0.95)  --char:#EDE0D8  --card-bg:rgba(36,16,24,0.85)
```

**D2 — Dusty Plum:**
```
Light:  --ivory2:#EDE5EA  --ivory3:#DDD0D8  --gold:#A06878  --gold-light:#C8A0A8
        --header-bg:rgba(237,229,234,0.95)  --char:#28142A  --card-bg:rgba(255,255,255,0.88)
Dark:   --ivory2:#1E1120  --ivory3:#2E1A32  --gold:#A06878  --gold-light:#C8A0A8
        --header-bg:rgba(30,17,32,0.95)  --char:#EAE0E8  --card-bg:rgba(30,17,32,0.85)
```

**D3 — Terracotta Burgundy:**
```
Light:  --ivory2:#F0E8E0  --ivory3:#DDD0C4  --gold:#C89070  --gold-light:#D8A888
        --header-bg:rgba(240,232,224,0.95)  --char:#28180E  --card-bg:rgba(255,255,255,0.88)
Dark:   --ivory2:#1E1410  --ivory3:#301C14  --gold:#C89070  --gold-light:#D8A888
        --header-bg:rgba(30,20,16,0.95)  --char:#EDE0D4  --card-bg:rgba(30,20,16,0.85)
```

### B. `src/Auth.jsx` — inline `t` theme object (around line 26)
The `t` object defines colors for light/dark mode inline. Replace `gold: "#C9A96E"` and surrounding colors to match the chosen variant. The pattern is:
```js
const t = dark ? {
  bg: "#...",        // dark app background (match --ivory2 dark equiv)
  card: "#...",      // slightly lighter than bg
  border: "#...",    // match --ivory3 dark
  gold: "#...",      // match --gold dark
  ...
} : {
  bg: "#...",        // light app bg
  card: "#fff",
  border: "#...",    // match --ivory3 light
  gold: "#...",      // match --gold light
  ...
}
```

### C. `src/BgDots.jsx`
Update the `baseColor` variable used for dot colors to match the accent color of the chosen variant.

---

## 5. Current App CSS Variable Reference

The app uses CSS custom properties defined in the `<style>` block at the top of `src/App.jsx` (not in `global.css`). Key structural variables:

```
--ewp-slate      text heading color
--gold           primary accent (currently brass #C9A96E)
--gold-light     lighter accent
--gold-bg        tinted background areas
--ivory2         app surface / section background
--ivory3         borders, dividers
--char           body text
--mid            secondary/muted text
--muted          very muted text
--card-bg        card backgrounds
--header-bg      sticky topbar + stepper background
--green          success states
--red            error states
```

---

## 6. App Architecture Notes

### Routing (view-based, no React Router)
The `view` state in `App.jsx` controls what's rendered:
- `"dashboard"` — project list
- `"new"` — multi-step new/edit form (steps 0-4: Project Details, Room Estimates, Final Details, Summary, Print)

### Sticky header structure
```
<div style="position:sticky; top:0; zIndex:100; background:var(--ivory2)">
  <div class="topbar">...</div>        ← always visible
  {isGuest && <GuestBanner />}         ← only in guest mode
  {view==="new" && <Stepper />}        ← only in new/edit form
  {view==="new" && <QuickSaveBar />}   ← only when project has ID
</div>
<div class="main">
  {/* page content */}
</div>
```

### Guest mode data flow
```
main.jsx → isGuest state
  → Auth.jsx (onGuestLogin prop → sets isGuest=true)
  → App.jsx (isGuest prop)
    → loadData: skips Supabase project/contractor fetch
    → saveProject: stores to projects[] React state only
    → deleteProject: removes from React state only
    → all Supabase write guards: if(isGuest) return
```

---

## 7. Build & Deploy

```bash
# Dev (not needed for testing — app is live)
npm run dev

# Build
npm run build   # outputs to dist/

# The build is large (~1.8MB App chunk) — warning is expected
```

**Deployed to:** Netlify (or similar static host — ask user for URL)

---

## 8. GitHub

Repo is on GitHub. Recent commits include:
- Guest mode implementation
- Outreach emails (18 .txt files in `outreach_emails/`)
- PPT screenshot updates in `build_deck.cjs`

---

## 9. Immediate Next Step for New Chat

**Ask the user:** "Which palette variant — D1 (Classic Matte), D2 (Dusty Plum), or D3 (Terracotta Burgundy)?"

Then implement across:
1. `src/App.jsx` — CSS `:root` and `.dark` variable blocks
2. `src/Auth.jsx` — inline `t` theme object
3. `src/BgDots.jsx` — dot base color
4. Build + commit + push

---

## 10. User Notes
- Non-technical end users — keep UI language simple
- App is used by a small trade business (wood products / EWP)
- Admin panel exists (separate `AdminPanel` component loaded lazily)
- Bug reports feature exists (separate `BugReports` component)
- "My Reports" feature exists for non-admin users
- Never mention dev server, preview_start, or hooks in responses
