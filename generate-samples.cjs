const React = require("react")
const { Document, Page, View, Text, StyleSheet, Font, renderToFile } = require("@react-pdf/renderer")
const path = require("path")
const fs = require("fs")
const e = React.createElement

Font.registerHyphenationCallback(word => [word])

const SANS = "Helvetica"
const SANS_BD = "Helvetica-Bold"
const SERIF = "Times-Roman"
const SERIF_BD = "Times-Bold"

// ── SAMPLE DATA ──
const project = { name: "Anderson Residence", address: "4217 Ridgewood Lane, Wayzata, MN 55391", contactName: "Sarah Anderson", contactPhone: "(612) 555-0184", email: "sarah.anderson@email.com" }
const rooms = [
  { name: "Kitchen", cab: 18200, upg: 4200, ctp: 8500, fin: 0, inst: 3200, total: 34100 },
  { name: "Pantry", cab: 4800, upg: 0, ctp: 0, fin: 0, inst: 1200, total: 6000 },
  { name: "Mudroom", cab: 4185, upg: 1500, ctp: 0, fin: 0, inst: 1500, total: 7185 },
]
const cabItems = [
  { product: 'Base Cabinet 36" W', notes: "Maple · Dovetail", qty: 4 },
  { product: 'Wall Cabinet 30" W × 42" H', notes: "Maple · Dovetail", qty: 6 },
  { product: 'Island Cabinet 48" W × 25" D', notes: "Maple · Full Overlay", qty: 1 },
  { product: 'Tall Pantry Unit 24" W × 96" H', notes: "Maple · Soft Close", qty: 1 },
  { product: 'Drawer Base 24" W', notes: "Maple · Dovetail", qty: 3 },
  { product: 'Corner Lazy Susan 36" W', notes: "Maple · Full Overlay", qty: 1 },
]
const upgItems = [
  { upgrade: "Soft-Close Hinges (Blum)", qty: 28 },
  { upgrade: "Under-Cabinet LED Lighting", qty: 3 },
  { upgrade: "Pull-Out Waste Bins", qty: 2 },
]
const delivery = 1200
const taxRate = 8.53
const roomsTotal = rooms.reduce((s, r) => s + r.total, 0)
const subtotal = roomsTotal + delivery
const taxAmt = Math.round(subtotal * (taxRate / 100) * 100) / 100
const grandTotal = subtotal + taxAmt
const fmt = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quoteId = "B-260622-0724"
const quoteDate = "June 22, 2026"

// ── PALETTE ──
const ink = "#1A1A1A"
const gold = "#B8A080"
const goldLight = "#D4C4A8"
const ivory = "#F8F6F2"
const warmGray = "#F0EDE8"
const border = "#E2DDD5"
const mutedText = "#777777"
const lightText = "#AAAAAA"


// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════════════

function CoverPage() {
  return e(Page, { size: "LETTER", orientation: "landscape", style: { padding: 0, backgroundColor: "#FFFFFF" } },

    // ── LEFT PANEL (38%) — warm ivory background ──
    e(View, { style: { position: "absolute", top: 0, bottom: 0, left: 0, width: "38%", backgroundColor: ivory } }),

    // ── Vertical accent — 3pt gold line at the split ──
    e(View, { style: { position: "absolute", top: 0, bottom: 0, left: "38%", width: 3, backgroundColor: gold } }),

    // ── LEFT CONTENT ──
    e(View, { style: { position: "absolute", top: 0, left: 0, width: "38%", paddingTop: 32, paddingLeft: 32, paddingRight: 24 } },

      // Company identity block
      e(Text, { style: { fontFamily: SANS_BD, fontSize: 10, color: ink, letterSpacing: 3, textTransform: "uppercase" } }, "ENGSTROM"),
      e(Text, { style: { fontFamily: SANS, fontSize: 10, color: ink, letterSpacing: 3, textTransform: "uppercase" } }, "WOOD PRODUCTS"),
      e(View, { style: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 } },
        e(View, { style: { width: 20, height: 1.5, backgroundColor: gold } }),
        e(Text, { style: { fontFamily: SANS, fontSize: 6, color: mutedText, letterSpacing: 1.5 } }, "EST. MINNESOTA"),
      ),

      // Grand total hero
      e(View, { style: { marginTop: 40 } },
        e(Text, { style: { fontFamily: SANS, fontSize: 6, color: gold, letterSpacing: 3, textTransform: "uppercase" } }, "PROJECT INVESTMENT"),
        e(View, { style: { height: 2, backgroundColor: gold, width: 32, marginTop: 6, marginBottom: 8 } }),
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 38, color: ink, letterSpacing: -0.5 } }, fmt(grandTotal)),
      ),

      // Metric grid — 2×2
      e(View, { style: { marginTop: 20, flexDirection: "row", flexWrap: "wrap" } },
        ...[
          ["ROOMS", "3"],
          ["CABINETS", String(cabItems.reduce((s,c) => s+c.qty, 0))],
          ["MATERIALS", fmt(roomsTotal - rooms.reduce((s,r)=>s+r.inst,0))],
          ["INSTALLATION", fmt(rooms.reduce((s,r)=>s+r.inst,0))],
        ].map(([label, val], i) =>
          e(View, { key: i, style: { width: "50%", marginBottom: 14 } },
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: mutedText, letterSpacing: 1.5 } }, label),
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 16, color: ink, marginTop: 2 } }, val),
          )
        ),
      ),

      // Quote meta at bottom of left panel
      e(View, { style: { marginTop: 24, paddingTop: 10, borderTop: `1 solid ${border}` } },
        e(Text, { style: { fontFamily: SANS, fontSize: 7, color: mutedText } }, quoteId),
        e(Text, { style: { fontFamily: SANS, fontSize: 7, color: mutedText, marginTop: 2 } }, quoteDate),
        e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: lightText, marginTop: 2 } }, "Valid for 30 days"),
      ),
    ),

    // ── RIGHT CONTENT (62%) ──
    e(View, { style: { position: "absolute", top: 0, left: "38%", right: 0, paddingTop: 32, paddingLeft: 28, paddingRight: 32 } },

      // Section label
      e(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2.5 } }, "PROPOSAL"),
        e(View, { style: { flex: 1, height: 0.75, backgroundColor: border, marginLeft: 12 } }),
      ),

      // Project name
      e(Text, { style: { fontFamily: SANS_BD, fontSize: 22, color: ink, marginTop: 4, marginBottom: 2 } }, project.name),
      e(Text, { style: { fontFamily: SANS, fontSize: 8.5, color: mutedText, marginBottom: 16 } }, project.address),

      // Info cards — 2×2 grid on warm background
      e(View, { style: { backgroundColor: warmGray, padding: "10 14", marginBottom: 16, flexDirection: "row", flexWrap: "wrap" } },
        ...[["Prepared for", project.contactName], ["Phone", project.contactPhone], ["Email", project.email], ["Valid through", "July 22, 2026"]].map(([l,v], i) =>
          e(View, { key: i, style: { width: "50%", paddingVertical: 5 } },
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: mutedText, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 } }, l),
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 9, color: ink } }, v),
          )
        ),
      ),

      // Room schedule header
      e(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2.5 } }, "ROOM SCHEDULE"),
        e(View, { style: { flex: 1, height: 0.75, backgroundColor: border, marginLeft: 12 } }),
      ),

      // Room rows
      ...rooms.map((r, i) =>
        e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottom: `0.75 solid ${border}` } },
          e(View, { style: { flex: 1 } },
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 11, color: ink } }, r.name),
            e(View, { style: { flexDirection: "row", marginTop: 3, gap: 6 } },
              ...[
                r.cab+r.upg > 0 && `Cabinetry ${fmt(r.cab+r.upg)}`,
                r.ctp > 0 && `Countertops ${fmt(r.ctp)}`,
                r.inst > 0 && `Install ${fmt(r.inst)}`,
              ].filter(Boolean).map((tag, j) =>
                e(View, { key: j, style: { backgroundColor: warmGray, paddingHorizontal: 6, paddingVertical: 2 } },
                  e(Text, { style: { fontFamily: SANS, fontSize: 6, color: mutedText } }, tag),
                )
              ),
            ),
          ),
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 15, color: ink } }, fmt(r.total)),
        )
      ),

      // Totals block
      e(View, { style: { marginTop: 10, paddingTop: 8, borderTop: `2 solid ${ink}` } },
        ...[["Subtotal", fmt(roomsTotal)], ["Delivery", fmt(delivery)], [`Tax (${taxRate}%)`, fmt(taxAmt)]].map(([l,v], i) =>
          e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 } },
            e(Text, { style: { fontFamily: SANS, fontSize: 8, color: mutedText } }, l),
            e(Text, { style: { fontFamily: SANS, fontSize: 8, color: ink } }, v),
          )
        ),
        // Grand total row with gold left accent
        e(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 8, paddingBottom: 8, paddingLeft: 10, borderLeft: `3 solid ${gold}`, backgroundColor: warmGray } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 9, color: ink, letterSpacing: 1 } }, "GRAND TOTAL"),
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 16, color: ink, paddingRight: 10 } }, fmt(grandTotal)),
        ),
      ),
    ),

    // ── Footer ──
    e(View, { style: { position: "absolute", bottom: 8, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" } },
      e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: lightText } }, "Engstrom Wood Products  ·  Custom Cabinetry & Fine Woodworking"),
      e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: lightText } }, "Page 1"),
    ),
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE 2 — ROOM DETAIL (Kitchen)
// ═══════════════════════════════════════════════════════════════════════════════

function RoomPage() {
  return e(Page, { size: "LETTER", orientation: "landscape", style: { padding: 0, backgroundColor: "#FFFFFF" } },

    // ── Top bar — thin warm gray strip with company + room ──
    e(View, { style: { backgroundColor: warmGray, paddingVertical: 6, paddingHorizontal: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `1 solid ${border}` } },
      e(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: ink, letterSpacing: 2 } }, "ENGSTROM WOOD PRODUCTS"),
        e(View, { style: { width: 1, height: 10, backgroundColor: border } }),
        e(Text, { style: { fontFamily: SANS, fontSize: 7, color: mutedText } }, quoteId),
      ),
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: mutedText } }, "Room 1 of 3"),
    ),

    // ── Room header ──
    e(View, { style: { paddingHorizontal: 32, paddingTop: 14 } },
      e(View, { style: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" } },
        e(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 } },
          e(View, { style: { width: 3, height: 22, backgroundColor: gold } }),
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 22, color: ink } }, "Kitchen"),
        ),
        e(View, { style: { alignItems: "flex-end" } },
          e(Text, { style: { fontFamily: SANS, fontSize: 6, color: gold, letterSpacing: 2 } }, "ROOM TOTAL"),
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 20, color: ink, marginTop: 1 } }, fmt(34100)),
        ),
      ),
      e(View, { style: { height: 1.5, backgroundColor: ink, marginTop: 8, marginBottom: 14 } }),
    ),

    // ── Two-column layout ──
    e(View, { style: { flexDirection: "row", paddingHorizontal: 32, gap: 20 } },

      // LEFT COLUMN — Cabinet items
      e(View, { style: { flex: 3 } },
        // Section header
        e(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2 } }, "CABINETS / CASEWORK"),
          e(View, { style: { flex: 1, height: 0.5, backgroundColor: border } }),
        ),
        // Table header
        e(View, { style: { flexDirection: "row", paddingBottom: 4, borderBottom: `1 solid ${ink}`, marginBottom: 2 } },
          e(View, { style: { width: "50%" } }, e(Text, { style: { fontFamily: SANS_BD, fontSize: 6, color: ink, letterSpacing: 0.5 } }, "ITEM")),
          e(View, { style: { width: "36%" } }, e(Text, { style: { fontFamily: SANS, fontSize: 6, color: mutedText, letterSpacing: 0.5 } }, "SPECIFICATION")),
          e(View, { style: { width: "14%" } }, e(Text, { style: { fontFamily: SANS, fontSize: 6, color: mutedText, textAlign: "right", letterSpacing: 0.5 } }, "QTY")),
        ),
        // Items
        ...cabItems.map((item, i) =>
          e(View, { key: i, style: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottom: `0.5 solid ${border}`, backgroundColor: i % 2 === 0 ? "#FFFFFF" : warmGray } },
            e(View, { style: { width: "50%", paddingLeft: 4 } }, e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink } }, item.product)),
            e(View, { style: { width: "36%" } }, e(Text, { style: { fontFamily: SANS, fontSize: 8, color: mutedText } }, item.notes)),
            e(View, { style: { width: "14%", paddingRight: 4 } }, e(Text, { style: { fontFamily: SANS_BD, fontSize: 8.5, color: ink, textAlign: "right" } }, String(item.qty))),
          )
        ),
      ),

      // RIGHT COLUMN — Upgrades + Summary
      e(View, { style: { flex: 2 } },
        // Upgrades section
        e(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2 } }, "UPGRADES"),
          e(View, { style: { flex: 1, height: 0.5, backgroundColor: border } }),
        ),
        ...upgItems.map((item, i) =>
          e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottom: `0.5 solid ${border}` } },
            e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink } }, item.upgrade),
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 8.5, color: ink } }, `×${item.qty}`),
          )
        ),

        // Installation
        e(View, { style: { marginTop: 10, flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2 } }, "INSTALLATION"),
          e(View, { style: { flex: 1, height: 0.5, backgroundColor: border } }),
        ),
        e(View, { style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottom: `0.5 solid ${border}` } },
          e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink } }, "Professional Installation"),
          e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink } }, "Per Project"),
        ),

        // Room total card
        e(View, { style: { marginTop: 14, backgroundColor: ivory, borderLeft: `3 solid ${gold}`, padding: "14 16" } },
          e(Text, { style: { fontFamily: SANS, fontSize: 6, color: gold, letterSpacing: 2 } }, "ROOM INVESTMENT"),
          e(View, { style: { height: 1, backgroundColor: border, marginVertical: 6 } }),
          ...[["Cabinetry", fmt(18200)], ["Upgrades", fmt(4200)], ["Countertops", fmt(8500)], ["Installation", fmt(3200)]].map(([l,v], i) =>
            e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 } },
              e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: mutedText } }, l),
              e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: ink } }, v),
            )
          ),
          e(View, { style: { height: 1.5, backgroundColor: ink, marginTop: 6, marginBottom: 6 } }),
          e(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } },
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 8, color: ink, letterSpacing: 1 } }, "TOTAL"),
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 18, color: ink } }, fmt(34100)),
          ),
        ),
      ),
    ),

    // ── Footer ──
    e(View, { style: { position: "absolute", bottom: 8, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" } },
      e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: lightText } }, `${quoteId}  ·  ${quoteDate}`),
      e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: lightText } }, "Page 2"),
    ),
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE 3 — TERMS & ACCEPTANCE
// ═══════════════════════════════════════════════════════════════════════════════

function TermsPage() {
  return e(Page, { size: "LETTER", orientation: "landscape", style: { padding: 0, backgroundColor: "#FFFFFF" } },

    // ── Top bar ──
    e(View, { style: { backgroundColor: warmGray, paddingVertical: 6, paddingHorizontal: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `1 solid ${border}` } },
      e(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: ink, letterSpacing: 2 } }, "ENGSTROM WOOD PRODUCTS"),
        e(View, { style: { width: 1, height: 10, backgroundColor: border } }),
        e(Text, { style: { fontFamily: SANS, fontSize: 7, color: mutedText } }, quoteId),
      ),
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: mutedText } }, quoteDate),
    ),

    // ── Page title ──
    e(View, { style: { paddingHorizontal: 32, paddingTop: 14 } },
      e(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 } },
        e(View, { style: { width: 3, height: 18, backgroundColor: gold } }),
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 18, color: ink } }, "Terms & Acceptance"),
      ),
      e(View, { style: { height: 1.5, backgroundColor: ink, marginTop: 8, marginBottom: 16 } }),
    ),

    // ── Two-column layout ──
    e(View, { style: { flexDirection: "row", paddingHorizontal: 32, gap: 24 } },

      // LEFT — Terms
      e(View, { style: { flex: 1 } },
        e(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2 } }, "IMPORTANT NOTICES"),
          e(View, { style: { flex: 1, height: 0.5, backgroundColor: border } }),
        ),

        // Pricing disclaimer
        e(View, { style: { backgroundColor: ivory, borderLeft: `3 solid ${gold}`, padding: "10 14", marginBottom: 12 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 9, color: ink, marginBottom: 4 } }, "Pricing Disclaimer"),
          e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: mutedText, lineHeight: 1.65 } }, "Pricing provided in this proposal is based on preliminary cabinet layouts, specifications, and selections. Final pricing is subject to adjustment upon completion and approval of final cabinet build plans, dimensions, materials, finishes, hardware, accessories, and any other customer-selected options."),
        ),

        // Payment terms
        e(View, { style: { backgroundColor: ivory, borderLeft: `3 solid ${gold}`, padding: "10 14", marginBottom: 12 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 9, color: ink, marginBottom: 4 } }, "Payment Terms"),
          e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: mutedText, lineHeight: 1.65 } }, "A deposit of 50% is due upon acceptance. The remaining balance is due upon completion of installation. All payments are non-refundable once materials have been ordered."),
        ),

        // Acceptance note
        e(View, { style: { paddingTop: 4 } },
          e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: mutedText, lineHeight: 1.5 } }, "By signing below, the client acknowledges review of the scope of work, pricing, and terms outlined in this proposal and agrees to proceed as described."),
        ),
      ),

      // RIGHT — Signatures
      e(View, { style: { flex: 1 } },
        e(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: gold, letterSpacing: 2 } }, "AUTHORIZATION"),
          e(View, { style: { flex: 1, height: 0.5, backgroundColor: border } }),
        ),

        // Client signature block
        e(View, { style: { border: `1 solid ${border}`, padding: 16, marginBottom: 14, backgroundColor: ivory } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: gold, letterSpacing: 1.5, marginBottom: 12 } }, "CLIENT"),
          e(View, { style: { borderBottom: `2 solid ${ink}`, height: 28, marginBottom: 3 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6, color: lightText, marginBottom: 10 } }, "Signature"),
          e(View, { style: { flexDirection: "row", gap: 14 } },
            e(View, { style: { flex: 1 } },
              e(View, { style: { borderBottom: `1 solid ${border}`, height: 18, marginBottom: 3 } }),
              e(Text, { style: { fontFamily: SANS, fontSize: 6, color: lightText } }, "Printed Name"),
            ),
            e(View, { style: { flex: 1 } },
              e(View, { style: { borderBottom: `1 solid ${border}`, height: 18, marginBottom: 3 } }),
              e(Text, { style: { fontFamily: SANS, fontSize: 6, color: lightText } }, "Date"),
            ),
          ),
        ),

        // EWP signature block
        e(View, { style: { border: `1 solid ${border}`, padding: 16, backgroundColor: ivory } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: gold, letterSpacing: 1.5, marginBottom: 12 } }, "ENGSTROM WOOD PRODUCTS"),
          e(View, { style: { borderBottom: `2 solid ${ink}`, height: 28, marginBottom: 3 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6, color: lightText, marginBottom: 10 } }, "Signature"),
          e(View, { style: { flexDirection: "row", gap: 14 } },
            e(View, { style: { flex: 1 } },
              e(View, { style: { borderBottom: `1 solid ${border}`, height: 18, marginBottom: 3 } }),
              e(Text, { style: { fontFamily: SANS, fontSize: 6, color: lightText } }, "Printed Name"),
            ),
            e(View, { style: { flex: 1 } },
              e(View, { style: { borderBottom: `1 solid ${border}`, height: 18, marginBottom: 3 } }),
              e(Text, { style: { fontFamily: SANS, fontSize: 6, color: lightText } }, "Date"),
            ),
          ),
        ),
      ),
    ),

    // ── Footer ──
    e(View, { style: { position: "absolute", bottom: 8, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" } },
      e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: lightText } }, "Engstrom Wood Products  ·  Custom Cabinetry & Fine Woodworking"),
      e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: lightText } }, "Page 3"),
    ),
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
//  ORIGINAL V1 — "RULED EDITORIAL" (for comparison)
// ═══════════════════════════════════════════════════════════════════════════════

const origMuted = "#666666"
const origLightMuted = "#999999"

function Orig_Cover() {
  return e(Page, { size: "LETTER", orientation: "landscape", style: { padding: 0, backgroundColor: "#FFFFFF" } },
    e(View, { style: { position: "absolute", top: 0, bottom: 0, left: "38%", width: 4, backgroundColor: ink } }),
    e(View, { style: { position: "absolute", top: 36, left: 36, width: 240 } },
      e(Text, { style: { fontFamily: SERIF_BD, fontSize: 28, color: ink, lineHeight: 1.15 } }, "Engstrom\nWood\nProducts"),
      e(View, { style: { width: 36, height: 2, backgroundColor: "#C8B89A", marginTop: 12, marginBottom: 10 } }),
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted, letterSpacing: 1.2, textTransform: "uppercase" } }, "Custom Cabinetry\n& Fine Woodworking"),
      e(View, { style: { marginTop: 36 } },
        e(Text, { style: { fontFamily: SANS, fontSize: 6, color: "#C8B89A", letterSpacing: 2.5, textTransform: "uppercase" } }, "PROJECT INVESTMENT"),
        e(Text, { style: { fontFamily: SERIF_BD, fontSize: 42, color: ink, letterSpacing: -1 } }, fmt(grandTotal)),
        e(View, { style: { width: 30, height: 1.5, backgroundColor: "#C8B89A", marginTop: 8, marginBottom: 12 } }),
        e(View, { style: { flexDirection: "row", gap: 24 } },
          e(View, null,
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: origLightMuted, letterSpacing: 1.2, textTransform: "uppercase" } }, "ROOMS"),
            e(Text, { style: { fontFamily: SERIF_BD, fontSize: 24, color: ink } }, "3"),
          ),
          e(View, null,
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: origLightMuted, letterSpacing: 1.2, textTransform: "uppercase" } }, "MATERIALS"),
            e(Text, { style: { fontFamily: SERIF_BD, fontSize: 18, color: ink } }, fmt(roomsTotal - rooms.reduce((s,r)=>s+r.inst,0))),
          ),
        ),
        e(View, { style: { flexDirection: "row", gap: 24, marginTop: 10 } },
          e(View, null,
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: origLightMuted, letterSpacing: 1.2, textTransform: "uppercase" } }, "INSTALLATION"),
            e(Text, { style: { fontFamily: SERIF_BD, fontSize: 18, color: ink } }, fmt(rooms.reduce((s,r)=>s+r.inst,0))),
          ),
          e(View, null,
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: origLightMuted, letterSpacing: 1.2, textTransform: "uppercase" } }, "DELIVERY"),
            e(Text, { style: { fontFamily: SERIF_BD, fontSize: 18, color: ink } }, fmt(delivery)),
          ),
        ),
      ),
      e(View, { style: { marginTop: 44 } },
        e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: origLightMuted } }, quoteId),
        e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: origLightMuted, marginTop: 1 } }, quoteDate),
      ),
    ),
    e(View, { style: { position: "absolute", top: 36, left: "41%", right: 36 } },
      e(Text, { style: { fontFamily: SANS_BD, fontSize: 8, color: "#C8B89A", letterSpacing: 2.5, textTransform: "uppercase" } }, "PROPOSAL"),
      e(Text, { style: { fontFamily: SERIF_BD, fontSize: 24, color: ink, marginTop: 4, marginBottom: 2 } }, project.name),
      e(Text, { style: { fontFamily: SANS, fontSize: 9, color: origMuted, marginBottom: 16 } }, project.address),
      e(View, { style: { flexDirection: "row", flexWrap: "wrap", marginBottom: 18 } },
        ...[["Prepared for", project.contactName], ["Phone", project.contactPhone], ["Email", project.email], ["Valid through", "July 22, 2026"]].map(([l,v], i) =>
          e(View, { key: i, style: { width: "48%", marginBottom: 10 } },
            e(Text, { style: { fontFamily: SANS, fontSize: 5.5, color: origLightMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 } }, l),
            e(Text, { style: { fontFamily: SANS, fontSize: 9.5, color: ink } }, v),
          )
        ),
      ),
      e(View, { style: { borderBottom: "1 solid #E0E0E0", paddingBottom: 4, marginBottom: 6 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: ink, letterSpacing: 1.5, textTransform: "uppercase" } }, "ROOM BREAKDOWN"),
      ),
      ...rooms.map((r, i) =>
        e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottom: "0.75 solid #E8E8E8" } },
          e(View, null,
            e(Text, { style: { fontFamily: SANS_BD, fontSize: 11, color: ink } }, r.name),
            e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted, marginTop: 2 } },
              [r.cab+r.upg > 0 && `Cabinetry ${fmt(r.cab+r.upg)}`, r.ctp > 0 && `Countertops ${fmt(r.ctp)}`, r.inst > 0 && `Install ${fmt(r.inst)}`].filter(Boolean).join("  ·  ")
            ),
          ),
          e(Text, { style: { fontFamily: SERIF_BD, fontSize: 16, color: ink } }, fmt(r.total)),
        )
      ),
      e(View, { style: { marginTop: 8, borderTop: "3 solid " + ink, paddingTop: 8 } },
        ...[["Subtotal", fmt(roomsTotal)], ["Delivery", fmt(delivery)], [`Tax (${taxRate}%)`, fmt(taxAmt)]].map(([l,v], i) =>
          e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 } },
            e(Text, { style: { fontFamily: SANS, fontSize: 8.5, color: origLightMuted } }, l),
            e(Text, { style: { fontFamily: SANS, fontSize: 8.5, color: ink } }, v),
          )
        ),
        e(View, { style: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTop: "1.5 solid #DDD" } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 10, color: ink } }, "Grand Total"),
          e(Text, { style: { fontFamily: SERIF_BD, fontSize: 16, color: ink } }, fmt(grandTotal)),
        ),
      ),
    ),
  )
}

function Orig_Room() {
  return e(Page, { size: "LETTER", orientation: "landscape", style: { paddingHorizontal: 36, paddingTop: 30, paddingBottom: 28, backgroundColor: "#FFFFFF" } },
    e(Text, { style: { fontFamily: SERIF_BD, fontSize: 24, color: ink } }, "Kitchen"),
    e(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "3 solid " + ink, paddingBottom: 4, marginBottom: 14 } },
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted } }, "Engstrom Wood Products"),
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted } }, "Room 1 of 3"),
    ),
    e(View, { style: { flexDirection: "row", gap: 24 } },
      e(View, { style: { flex: 3 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: "#C8B89A", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 } }, "CABINETS / CASEWORK"),
        ...cabItems.map((item, i) =>
          e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 6, borderBottom: "0.5 dashed #DDD" } },
            e(View, { style: { flex: 1 } },
              e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink } }, item.product),
              e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted, marginTop: 1 } }, item.notes),
            ),
            e(Text, { style: { fontFamily: SANS, fontSize: 8, color: origMuted, width: 30, textAlign: "right" } }, `×${item.qty}`),
          )
        ),
      ),
      e(View, { style: { flex: 2 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: "#C8B89A", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 } }, "UPGRADES & ADDITIONS"),
        ...upgItems.map((item, i) =>
          e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: "0.5 dashed #DDD" } },
            e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink } }, item.upgrade),
            e(Text, { style: { fontFamily: SANS, fontSize: 8, color: origMuted } }, `×${item.qty}`),
          )
        ),
        e(View, { style: { marginTop: 12 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: "#C8B89A", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 } }, "INSTALLATION"),
          e(Text, { style: { fontFamily: SANS, fontSize: 9, color: ink, paddingVertical: 5 } }, "Professional Installation — Per Project"),
        ),
        e(View, { style: { marginTop: 16, borderLeft: "4 solid " + ink, backgroundColor: "#FAF7F2", padding: "12 14" } },
          e(Text, { style: { fontFamily: SANS, fontSize: 6, color: "#C8B89A", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 } }, "ROOM TOTAL"),
          e(Text, { style: { fontFamily: SERIF_BD, fontSize: 26, color: ink } }, fmt(34100)),
          e(View, { style: { width: 24, height: 1.5, backgroundColor: "#C8B89A", marginVertical: 6 } }),
          ...[["Cabinetry", fmt(18200)], ["Upgrades", fmt(4200)], ["Countertops", fmt(8500)], ["Installation", fmt(3200)]].map(([l,v], i) =>
            e(View, { key: i, style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 } },
              e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: origMuted } }, l),
              e(Text, { style: { fontFamily: SANS, fontSize: 7.5, color: ink } }, v),
            )
          ),
        ),
      ),
    ),
    e(View, { style: { position: "absolute", bottom: 10, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between" } },
      e(Text, { style: { fontFamily: SANS, fontSize: 6, color: "#BBB" } }, `${quoteId}  ·  ${quoteDate}`),
      e(Text, { style: { fontFamily: SANS, fontSize: 6, color: "#BBB" } }, "Engstrom Wood Products"),
    ),
  )
}

function Orig_Terms() {
  return e(Page, { size: "LETTER", orientation: "landscape", style: { paddingHorizontal: 36, paddingTop: 30, paddingBottom: 28, backgroundColor: "#FFFFFF" } },
    e(Text, { style: { fontFamily: SERIF_BD, fontSize: 20, color: ink } }, "Terms & Acceptance"),
    e(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "3 solid " + ink, paddingBottom: 4, marginBottom: 16 } },
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted } }, "Engstrom Wood Products"),
      e(Text, { style: { fontFamily: SANS, fontSize: 7, color: origLightMuted } }, `${quoteId}  ·  ${quoteDate}`),
    ),
    e(View, { style: { flexDirection: "row", gap: 30 } },
      e(View, { style: { flex: 1 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: "#C8B89A", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 } }, "IMPORTANT NOTICES"),
        e(View, { style: { borderLeft: "2 solid #E0E0E0", paddingLeft: 12, marginBottom: 14 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 9, color: ink, marginBottom: 4 } }, "Pricing Disclaimer"),
          e(Text, { style: { fontFamily: SANS, fontSize: 8, color: origMuted, lineHeight: 1.6 } }, "Pricing provided in this proposal is based on preliminary cabinet layouts, specifications, and selections. Final pricing is subject to adjustment upon completion and approval of final cabinet build plans, dimensions, materials, finishes, hardware, accessories, and any other customer-selected options."),
        ),
        e(View, { style: { borderLeft: "2 solid #E0E0E0", paddingLeft: 12, marginBottom: 14 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 9, color: ink, marginBottom: 4 } }, "Payment Terms"),
          e(Text, { style: { fontFamily: SANS, fontSize: 8, color: origMuted, lineHeight: 1.6 } }, "A deposit of 50% is due upon acceptance. The remaining balance is due upon completion of installation. All payments are non-refundable once materials have been ordered."),
        ),
        e(Text, { style: { fontFamily: SANS, fontSize: 8, color: origMuted, lineHeight: 1.5, marginTop: 4 } }, "By signing below, the client acknowledges review of the scope of work, pricing, and terms outlined in this proposal and agrees to proceed as described."),
      ),
      e(View, { style: { flex: 1 } },
        e(Text, { style: { fontFamily: SANS_BD, fontSize: 6.5, color: "#C8B89A", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 } }, "AUTHORIZATION"),
        e(View, { style: { border: "1 solid #E0E0E0", padding: 16, marginBottom: 14 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: origLightMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 } }, "CLIENT"),
          e(View, { style: { borderBottom: "3 solid " + ink, height: 28, marginBottom: 4 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: "#AAA", marginBottom: 10 } }, "Signature"),
          e(View, { style: { borderBottom: "1 solid #DDD", height: 18, marginBottom: 4 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: "#AAA", marginBottom: 10 } }, "Printed Name"),
          e(View, { style: { borderBottom: "1 solid #DDD", height: 18, marginBottom: 4 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: "#AAA" } }, "Date"),
        ),
        e(View, { style: { border: "1 solid #E0E0E0", padding: 16 } },
          e(Text, { style: { fontFamily: SANS_BD, fontSize: 7, color: origLightMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 } }, "ENGSTROM WOOD PRODUCTS"),
          e(View, { style: { borderBottom: "3 solid " + ink, height: 28, marginBottom: 4 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: "#AAA", marginBottom: 10 } }, "Signature"),
          e(View, { style: { borderBottom: "1 solid #DDD", height: 18, marginBottom: 4 } }),
          e(Text, { style: { fontFamily: SANS, fontSize: 6.5, color: "#AAA" } }, "Date"),
        ),
      ),
    ),
    e(View, { style: { position: "absolute", bottom: 10, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between" } },
      e(Text, { style: { fontFamily: SANS, fontSize: 6, color: "#BBB" } }, `${quoteId}  ·  ${quoteDate}`),
      e(Text, { style: { fontFamily: SANS, fontSize: 6, color: "#BBB" } }, "Engstrom Wood Products"),
    ),
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
//  GENERATE
// ═══════════════════════════════════════════════════════════════════════════════

const outDir = path.join(__dirname, "pdf-samples")

async function generate() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
  for (const f of fs.readdirSync(outDir)) {
    try { fs.unlinkSync(path.join(outDir, f)) } catch {}
  }

  console.log("Generating Original V1 — Ruled Editorial...")
  await renderToFile(
    e(Document, null, e(Orig_Cover), e(Orig_Room), e(Orig_Terms)),
    path.join(outDir, "V1_Original_Ruled_Editorial.pdf")
  )

  console.log("Generating Refined V1 — Modern Business...")
  await renderToFile(
    e(Document, null, e(CoverPage), e(RoomPage), e(TermsPage)),
    path.join(outDir, "V1_Refined_Modern_Business.pdf")
  )

  console.log("\nDone! Files saved to:", outDir)
}

generate().catch(err => { console.error(err); process.exit(1) })
