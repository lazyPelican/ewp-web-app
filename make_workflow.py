from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import mm

W, H = A4  # 595 x 842 pt

# Brand colours
DARK    = HexColor("#2d3232")
SLATE   = HexColor("#3a3d3d")
GOLD    = HexColor("#c9a96e")
GOLD2   = HexColor("#a07a3a")
IVORY   = HexColor("#fdfaf5")
IVORY2  = HexColor("#f5efe4")
MUTED   = HexColor("#7a7a7a")
GREEN   = HexColor("#2d7a4f")
RED     = HexColor("#b83b2e")
BLUE    = HexColor("#3a6ea5")
WHITE   = white

c = canvas.Canvas("EWP_App_Workflow.pdf", pagesize=A4)

# ── helpers ───────────────────────────────────────────────────────────────────

def rect_box(x, y, w, h, bg, label, sublabel=None, text_col=WHITE,
             radius=6, border=None, font_size=9, sub_size=7.5):
    c.saveState()
    c.setFillColor(bg)
    if border:
        c.setStrokeColor(border)
        c.setLineWidth(1.5)
    else:
        c.setStrokeColor(bg)
        c.setLineWidth(0)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if border else 0)
    # left gold accent bar
    c.setFillColor(GOLD)
    c.rect(x, y, 3, h, fill=1, stroke=0)
    c.setFillColor(text_col)
    c.setFont("Helvetica-Bold", font_size)
    ty = y + h/2 + (4 if sublabel else 2)
    c.drawCentredString(x + w/2 + 1.5, ty, label)
    if sublabel:
        c.setFont("Helvetica", sub_size)
        c.setFillColor(HexColor("#d4c9b8"))
        c.drawCentredString(x + w/2 + 1.5, ty - 10, sublabel)
    c.restoreState()

def diamond(cx, cy, hw, hh, bg, label, text_col=WHITE, font_size=8):
    c.saveState()
    c.setFillColor(bg)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    p = c.beginPath()
    p.moveTo(cx, cy + hh)
    p.lineTo(cx + hw, cy)
    p.lineTo(cx, cy - hh)
    p.lineTo(cx - hw, cy)
    p.close()
    c.drawPath(p, fill=1, stroke=1)
    c.setFillColor(text_col)
    c.setFont("Helvetica-Bold", font_size)
    c.drawCentredString(cx, cy - 3, label)
    c.restoreState()

def arrow(x1, y1, x2, y2, label=None, col=None):
    col = col or GOLD2
    c.saveState()
    c.setStrokeColor(col)
    c.setFillColor(col)
    c.setLineWidth(1.4)
    c.line(x1, y1, x2, y2)
    # arrowhead
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 6
    for side in (0.4, -0.4):
        ax = x2 - size * math.cos(angle - side)
        ay = y2 - size * math.sin(angle - side)
        c.line(x2, y2, ax, ay)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        c.setFont("Helvetica", 7)
        c.setFillColor(MUTED)
        c.drawCentredString(mx + 14, my, label)
    c.restoreState()

def section_label(x, y, text):
    c.saveState()
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(MUTED)
    c.drawString(x, y, text.upper())
    c.restoreState()

def bullet_list(x, y, items, col=None):
    col = col or DARK
    c.saveState()
    c.setFont("Helvetica", 7)
    c.setFillColor(col)
    for item in items:
        c.drawString(x, y, f"• {item}")
        y -= 10
    c.restoreState()
    return y

# ── PAGE 1: Main flow ─────────────────────────────────────────────────────────

# Background
c.setFillColor(IVORY)
c.rect(0, 0, W, H, fill=1, stroke=0)

# Header bar
c.setFillColor(DARK)
c.rect(0, H - 52, W, 52, fill=1, stroke=0)
c.setFillColor(GOLD)
c.rect(0, H - 55, W, 3, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 15)
c.drawString(28, H - 30, "EWP Estimate Manager")
c.setFont("Helvetica", 9)
c.setFillColor(HexColor("#c9b89a"))
c.drawString(28, H - 44, "App Workflow — End-to-End Process")
c.setFont("Helvetica", 8)
c.drawRightString(W - 28, H - 38, "Engstrom Wood Products · Rogers, MN")

# ── COLUMN layout ─────────────────────────────────────────────────────────────
# Main spine: centred at x=220, width=170
# Side panel:  x=410, width=155

MX, MW, MH = 125, 175, 34   # main box centre-x, width, height
SX, SW = 398, 162            # side panel x, width

top = H - 75

# ── 1. LOGIN ──────────────────────────────────────────────────────────────────
y = top - MH
rect_box(MX, y, MW, MH, SLATE, "STEP 1 — LOGIN & ACCESS",
         "Email / password authentication", font_size=8.5)

# side note
c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.setLineWidth(0.8)
c.roundRect(SX, y, SW, MH, 5, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(SX, y, 3, MH, fill=1, stroke=0)
section_label(SX + 8, y + MH - 13, "Auth details")
bullet_list(SX + 8, y + MH - 25,
            ["Sign in / Sign up modes", "Password strength meter",
             "Session persists via Supabase"], DARK)

arrow(MX + MW/2, y, MX + MW/2, y - 10)

# ── 2. DASHBOARD ──────────────────────────────────────────────────────────────
y -= 10 + MH
rect_box(MX, y, MW, MH, SLATE, "STEP 2 — DASHBOARD",
         "All estimates overview", font_size=8.5)

c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.setLineWidth(0.8)
c.roundRect(SX, y, SW, MH, 5, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(SX, y, 3, MH, fill=1, stroke=0)
section_label(SX + 8, y + MH - 13, "Dashboard features")
bullet_list(SX + 8, y + MH - 25,
            ["List of saved estimates (newest first)",
             "Open / edit / delete estimates",
             "Admin button (if admin user)"], DARK)

arrow(MX + MW/2, y, MX + MW/2, y - 10)

# ── 3. NEW QUOTE ──────────────────────────────────────────────────────────────
y -= 10 + MH
rect_box(MX, y, MW, MH, HexColor("#1e4d3a"), "START NEW ESTIMATE",
         "Click '+ New Estimate' on dashboard", font_size=8.5, border=GREEN)

arrow(MX + MW/2, y, MX + MW/2, y - 10)

# ── 4. STEP 1 CLIENT ─────────────────────────────────────────────────────────
y -= 10 + MH
rect_box(MX, y, MW, MH, SLATE, "WIZARD STEP 1 — CLIENT INFO",
         "Project details & contractor", font_size=8.5)

c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.setLineWidth(0.8)
c.roundRect(SX, y, SW, MH + 8, 5, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(SX, y, 3, MH + 8, fill=1, stroke=0)
section_label(SX + 8, y + MH + 8 - 13, "Fields")
bullet_list(SX + 8, y + MH + 8 - 25,
            ["Client name, address, phone, email",
             "Bid date · Project ID (auto-generated)",
             "Installation type (EWP / Contractor)"], DARK)

arrow(MX + MW/2, y, MX + MW/2, y - 10)

# ── 5. STEP 2 ROOMS ──────────────────────────────────────────────────────────
y -= 10 + MH + 14
rect_box(MX, y, MW, MH + 14, SLATE, "WIZARD STEP 2 — ROOM ESTIMATES",
         "Per-room cabinetry & costs", font_size=8.5)

c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.setLineWidth(0.8)
nh = MH + 38
c.roundRect(SX, y, SW, nh, 5, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(SX, y, 3, nh, fill=1, stroke=0)
section_label(SX + 8, y + nh - 13, "4 subsections per room")
bullet_list(SX + 8, y + nh - 25,
            ["Cabinetry  — product, construction, wood, qty",
             "Upgrades   — override items & unit prices",
             "Finishing  — type & linear feet",
             "Installation — hourly or % of cabinetry",
             "Multiple rooms supported (tabs)",
             "Duplicate room shortcut available"], DARK)

arrow(MX + MW/2, y, MX + MW/2, y - 10)

# ── 6. STEP 3 REVIEW ─────────────────────────────────────────────────────────
y -= 10 + MH
rect_box(MX, y, MW, MH, SLATE, "WIZARD STEP 3 — REVIEW & FINALISE",
         "Delivery, tax, grand total", font_size=8.5)

c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.setLineWidth(0.8)
c.roundRect(SX, y, SW, MH + 10, 5, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(SX, y, 3, MH + 10, fill=1, stroke=0)
section_label(SX + 8, y + MH + 10 - 13, "Summary view")
bullet_list(SX + 8, y + MH + 10 - 25,
            ["All rooms listed with subtotals",
             "Delivery charge input",
             "Tax applied if Contractor install",
             "Grand total (all rooms + delivery + tax)"], DARK)

arrow(MX + MW/2, y, MX + MW/2, y - 10)

# ── 7. DECISION ───────────────────────────────────────────────────────────────
y -= 10 + 28
diamond(MX + MW/2, y, 72, 22, HexColor("#3a3060"), "Ready to save?", font_size=8)

# Yes arrow down
arrow(MX + MW/2, y - 22, MX + MW/2, y - 32, "Yes", GREEN)

# No arrow left → back
c.saveState()
c.setStrokeColor(RED)
c.setFillColor(RED)
c.setLineWidth(1.2)
bx = MX + MW/2 - 72
c.line(bx, y, bx - 18, y)
c.line(bx - 18, y, bx - 18, y + (MH + 14) + 10 + MH + 10 + 22 + 10 + MH + 8)
c.line(bx - 18, y + (MH + 14) + 10 + MH + 10 + 22 + 10 + MH + 8,
       MX, y + (MH + 14) + 10 + MH + 10 + 22 + 10 + MH + 8)
c.setFont("Helvetica", 7)
c.setFillColor(RED)
c.drawString(bx - 36, y + 2, "Edit")
c.restoreState()

# ── 8. ACTIONS ───────────────────────────────────────────────────────────────
y -= 32 + MH
rect_box(MX, y, MW, MH, HexColor("#1e4d3a"), "SAVE & ACTIONS",
         "Persist + export options", font_size=8.5, border=GREEN)

# 3 action sub-boxes below
ay = y - 12 - 28
bw = 50
for i, (lbl, col) in enumerate([
    ("Save to DB", SLATE),
    ("Customer PDF", SLATE),
    ("Internal PDF", SLATE),
]):
    bx = MX + i * (bw + 6)
    rect_box(bx, ay, bw, 26, col, lbl, font_size=7, radius=4)
    arrow(bx + bw/2, y, bx + bw/2, ay + 26)

# Email action
rect_box(MX + 3*(bw+6), ay, bw, 26, SLATE, "Send Email", font_size=7, radius=4)
arrow(MX + MW/2, y, MX + 3*(bw+6) + bw/2, ay + 26)

# ── Footer ────────────────────────────────────────────────────────────────────
c.setFillColor(DARK)
c.rect(0, 0, W, 22, fill=1, stroke=0)
c.setFillColor(HexColor("#9a9080"))
c.setFont("Helvetica", 7)
c.drawString(28, 8, "EWP Estimate Manager  ·  Engstrom Wood Products, Rogers MN  ·  Page 1 of 2")

c.showPage()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 — Admin panel + data flow + pricing engine
# ══════════════════════════════════════════════════════════════════════════════

c.setFillColor(IVORY)
c.rect(0, 0, W, H, fill=1, stroke=0)

# Header
c.setFillColor(DARK)
c.rect(0, H - 52, W, 52, fill=1, stroke=0)
c.setFillColor(GOLD)
c.rect(0, H - 55, W, 3, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 15)
c.drawString(28, H - 30, "EWP Estimate Manager")
c.setFont("Helvetica", 9)
c.setFillColor(HexColor("#c9b89a"))
c.drawString(28, H - 44, "System Architecture & Admin Workflow — Page 2")

top2 = H - 72

# ── LEFT: Admin workflow ───────────────────────────────────────────────────────
section_label(28, top2, "Admin Panel (admin users only)")

ax, aw, ah = 28, 175, 32
ay = top2 - 14

rect_box(ax, ay - ah, aw, ah, SLATE, "ADMIN PANEL ENTRY",
         "Via Admin button on dashboard", font_size=8.5)
arrow(ax + aw/2, ay - ah, ax + aw/2, ay - ah - 10)

ay -= ah + 10
rect_box(ax, ay - ah, aw, ah, SLATE, "USER MANAGEMENT",
         "Approve / reject pending users", font_size=8.5)

c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.roundRect(ax + aw + 8, ay - ah, 130, ah + 8, 4, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(ax + aw + 8, ay - ah, 3, ah + 8, fill=1, stroke=0)
bullet_list(ax + aw + 18, ay - 10,
            ["View pending approval requests",
             "Badge count on admin button",
             "Approve or reject access"], DARK)

arrow(ax + aw/2, ay - ah, ax + aw/2, ay - ah - 10)

ay -= ah + 10
rect_box(ax, ay - ah, aw, ah, SLATE, "PRICING MANAGEMENT",
         "Edit live pricing tables", font_size=8.5)

c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.roundRect(ax + aw + 8, ay - ah, 130, ah + 20, 4, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(ax + aw + 8, ay - ah, 3, ah + 20, fill=1, stroke=0)
bullet_list(ax + aw + 18, ay - 6,
            ["Woodwork products & base prices",
             "Construction premiums (framed, etc.)",
             "Wood type premiums (oak, maple…)",
             "Upgrade items & prices",
             "Finishing types & price/LF",
             "Install types & rates"], DARK)

arrow(ax + aw/2, ay - ah, ax + aw/2, ay - ah - 10)

ay -= ah + 10
rect_box(ax, ay - ah, aw, ah, HexColor("#1e4d3a"), "SAVE PRICING TO DATABASE",
         "Changes apply to all future quotes", font_size=8.5, border=GREEN)

# ── RIGHT: Data / tech stack ──────────────────────────────────────────────────
rx = 310
section_label(rx, top2, "Technology Stack & Data Flow")

boxes = [
    ("FRONTEND", "React (Vite) · Hosted on Vercel/Netlify",
     "App.jsx, Auth.jsx, AdminPanel.jsx, PDFTemplates.jsx"),
    ("AUTHENTICATION", "Supabase Auth",
     "Email/password · JWT sessions · RLS policies"),
    ("DATABASE", "Supabase PostgreSQL",
     "projects table · pricing table · users"),
    ("PDF GENERATION", "jsPDF (client-side)",
     "Customer PDF · Internal cost sheet"),
    ("EMAIL", "Supabase Edge Function",
     "send-quote-email · Resend API"),
]

by = top2 - 14
bw2, bh2 = 240, 38
for title, sub, detail in boxes:
    rect_box(rx, by - bh2, bw2, bh2, SLATE, title, sub, font_size=8.5)
    c.setFont("Helvetica", 6.8)
    c.setFillColor(HexColor("#b0a090"))
    c.drawString(rx + 8, by - bh2 + 6, detail)
    if title != boxes[-1][0]:
        arrow(rx + bw2/2, by - bh2, rx + bw2/2, by - bh2 - 8)
    by -= bh2 + 8

# ── Pricing Engine box ────────────────────────────────────────────────────────
pe_y = ay - ah - 30
section_label(28, pe_y + 8, "Pricing Calculation Engine")
pe_h = 90
c.setFillColor(IVORY2)
c.setStrokeColor(HexColor("#e0d5c5"))
c.setLineWidth(0.8)
c.roundRect(28, pe_y - pe_h, W - 56, pe_h, 6, fill=1, stroke=1)
c.setFillColor(GOLD2)
c.rect(28, pe_y - pe_h, 3, pe_h, fill=1, stroke=0)

formulas = [
    ("Cabinetry Line",  "Base Price × (1 + Construction Premium) × (1 + Wood Premium) × Qty × (1 + Adj%)"),
    ("Upgrades Line",   "Upgrade Unit Price × Qty × (1 + Adj%)"),
    ("Finishing Line",  "Price per LF × Linear Feet × (1 + Adj%)"),
    ("Installation",    "Hourly: Rate × Hours  |  Percentage: Cabinetry Total × Rate  [rounded to nearest $5]"),
    ("Room Total",      "Cabinetry + Upgrades + Finishing + Installation"),
    ("Grand Total",     "Σ All Room Totals + Delivery + Tax (if Contractor install, 8.53%)"),
]

fy = pe_y - 14
c.setFont("Helvetica-Bold", 7.5)
c.setFillColor(GOLD2)
c.drawString(36, fy, "Formula")
c.drawString(160, fy, "Calculation")
fy -= 10
for lbl, formula in formulas:
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(DARK)
    c.drawString(36, fy, lbl)
    c.setFont("Helvetica", 7)
    c.setFillColor(MUTED)
    c.drawString(160, fy, formula)
    fy -= 11

# Footer
c.setFillColor(DARK)
c.rect(0, 0, W, 22, fill=1, stroke=0)
c.setFillColor(HexColor("#9a9080"))
c.setFont("Helvetica", 7)
c.drawString(28, 8, "EWP Estimate Manager  ·  Engstrom Wood Products, Rogers MN  ·  Page 2 of 2")

c.save()
print("PDF saved: EWP_App_Workflow.pdf")
