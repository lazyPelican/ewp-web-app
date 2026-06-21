import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "./supabase.js"
import { logError } from "./logger.js"
import { Document, Page, View, Text, Image, Font, StyleSheet, pdf } from "@react-pdf/renderer"

// ── Register Google Fonts ───────────────────────────────────────
Font.register({
  family: "Space Grotesk",
  fonts: [
    { src: "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7aUUsj.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj42Vksj.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf", fontWeight: 700 },
  ],
})
Font.register({
  family: "Archivo",
  fonts: [
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTNDNp8A.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTBjNp8A.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT6jRp8A.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT0zRp8A.ttf", fontWeight: 700 },
  ],
})

const HOURLY_RATE = 33.10
const CLIENT_EMAIL = "kmenzel@engstromwoodproducts.com"
const BILAL_EMAIL = "11bilalahmed@gmail.com"

// Preload logo — only include in PDF if the file exists in public/
let invoiceLogoUrl = null
if (typeof window !== "undefined") {
  const img = new window.Image()
  img.onload = () => { invoiceLogoUrl = img.src }
  img.src = window.location.origin + "/logo.png"
}

// ── Helpers ──────────────────────────────────────────────────────
const fmtDuration = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const fmtHours = (sec) => (sec / 3600).toFixed(2)

const fmtTime = (iso) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
}

const fmtDateShort = (iso) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const fmtDateFull = (iso) => {
  if (!iso) return "—"
  const d = new Date(typeof iso === "string" && !iso.includes("T") ? iso + "T00:00:00" : iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const getMonday = (d) => {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
  dt.setDate(diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

const getSunday = (mon) => {
  const s = new Date(mon)
  s.setDate(s.getDate() + 6)
  return s
}

const toDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dy = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dy}`
}

// ── Invoice PDF (exact match to branded HTML invoice) ───────────
const CL = {
  ink: "#17181a", inkSoft: "#26282b", muted: "#6c6f73", faint: "#a3a6aa",
  line: "#e8e9eb", paper: "#ffffff", accent: "#c2693c", accentDeep: "#a8542d", wash: "#f7f5f2",
}
const sg = "Space Grotesk"
const ar = "Archivo"

const ps = StyleSheet.create({
  page: { fontSize: 10, fontFamily: ar, color: CL.ink },
  // Masthead
  masthead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingTop: 33, paddingBottom: 22, paddingHorizontal: 50,
    borderBottomWidth: 4, borderBottomColor: CL.accent, borderBottomStyle: "solid",
  },
  ident: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 6 },
  logo: { width: 54, height: 54 },
  identName: { fontFamily: sg, fontWeight: 600, fontSize: 17, color: CL.ink, letterSpacing: -0.2 },
  identRole: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: CL.muted, marginTop: 4 },
  docBlock: { textAlign: "right" },
  docWord: { fontFamily: sg, fontWeight: 700, fontSize: 44, lineHeight: 0.9, letterSpacing: -1, textTransform: "uppercase", color: CL.ink },
  docSub: { fontFamily: sg, fontWeight: 500, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: CL.accentDeep, marginTop: 10 },
  // Body
  body: { paddingTop: 30, paddingBottom: 24, paddingHorizontal: 50, flex: 1 },
  // From / Bill To panels
  metaGrid: { flexDirection: "row", gap: 20, marginBottom: 0 },
  panel: { backgroundColor: CL.wash, borderRadius: 10, padding: "16 20", flex: 1 },
  panelLabel: { fontFamily: sg, fontWeight: 600, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", color: CL.accentDeep, marginBottom: 9 },
  panelWho: { fontFamily: sg, fontSize: 16, fontWeight: 600, marginBottom: 7, letterSpacing: -0.1 },
  panelLine: { fontSize: 11, lineHeight: 1.7, color: CL.muted },
  // Invoice meta row
  invoiceMeta: { flexDirection: "row", gap: 30, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CL.line, borderBottomStyle: "solid", marginTop: 20 },
  mi: {},
  miLabel: { fontFamily: sg, fontWeight: 600, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", color: CL.accentDeep, marginBottom: 5 },
  miVal: { fontFamily: sg, fontSize: 11, fontWeight: 500, color: CL.ink },
  // Table
  tHead: { flexDirection: "row", backgroundColor: CL.ink, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, marginTop: 16, marginBottom: 2 },
  tHeadCell: { fontFamily: sg, fontSize: 7.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#ffffff" },
  tRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: CL.line, borderBottomStyle: "solid" },
  tRowLast: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 12 },
  tCellDate: { fontFamily: sg, fontSize: 10, color: CL.muted },
  tCellDesc: { fontSize: 10.5, color: CL.ink, fontWeight: 500 },
  tCell: { fontFamily: sg, fontSize: 10.5, color: CL.ink },
  // Foot: Notes + Totals
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginTop: 14 },
  terms: { maxWidth: 230 },
  notesLabel: { fontFamily: sg, fontWeight: 600, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", color: CL.accentDeep, marginBottom: 5 },
  notesText: { fontSize: 10, lineHeight: 1.7, color: CL.muted },
  totals: { width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 10.5, paddingVertical: 7, color: CL.muted },
  totalRowDiv: { flexDirection: "row", justifyContent: "space-between", fontSize: 10.5, paddingVertical: 7, color: CL.muted, borderTopWidth: 1, borderTopColor: CL.line, borderTopStyle: "solid" },
  totalLbl: { fontSize: 10.5, color: CL.muted },
  totalVal: { fontFamily: sg, fontSize: 10.5, color: CL.ink },
  dueBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingVertical: 11, paddingHorizontal: 18, backgroundColor: CL.accent, borderRadius: 8 },
  dueK: { fontFamily: sg, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.85)" },
  dueV: { fontFamily: sg, fontSize: 22, fontWeight: 700, letterSpacing: -0.2, color: "#ffffff" },
  // Footer
  thanks: {
    marginTop: "auto", paddingTop: 11, paddingBottom: 22, paddingHorizontal: 50,
    borderTopWidth: 1, borderTopColor: CL.line, borderTopStyle: "solid",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  thanksMsg: { fontFamily: sg, fontWeight: 600, fontSize: 12, color: CL.ink, letterSpacing: -0.1 },
  thanksContact: { textAlign: "right" },
  thanksName: { fontSize: 9.5, color: CL.faint },
  thanksEmail: { fontSize: 9.5, color: CL.faint, marginTop: 1 },
})

// Group entries by date and sum hours per day
function groupEntriesByDate(entries) {
  const map = {}
  entries.forEach(e => {
    const dateKey = new Date(e.started_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    if (!map[dateKey]) map[dateKey] = { date: dateKey, totalSeconds: 0 }
    map[dateKey].totalSeconds += e.duration_seconds || 0
  })
  return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date))
}

function InvoicePDFDoc({ invoice, entries }) {
  const dailyRows = groupEntriesByDate(entries)
  const issuedDate = fmtDateFull(invoice.created_at || toDateStr(new Date()))
  const pStart = new Date(invoice.week_start + "T00:00:00")
  const pEnd = new Date(invoice.week_end + "T00:00:00")
  const periodLabel = `${pStart.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${pEnd.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}, ${pStart.getFullYear()}`
  const periodShort = `${pStart.toLocaleDateString("en-US", { month: "long" })} ${pStart.getDate()}–${pEnd.getDate()}, ${pStart.getFullYear()}`
  const logoSrc = invoiceLogoUrl

  return (
    <Document>
      <Page size="LETTER" style={ps.page}>
        {/* ── Masthead ── */}
        <View style={ps.masthead}>
          <View style={ps.ident}>
            {logoSrc && <Image src={logoSrc} style={ps.logo} />}
            <View>
              <Text style={ps.identName}>Bilal Ahmed</Text>
              <Text style={ps.identRole}>Business Automation Consultant</Text>
            </View>
          </View>
          <View style={ps.docBlock}>
            <Text style={ps.docWord}>Invoice</Text>
            <Text style={ps.docSub}>Quotation Manager Web App</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={ps.body}>
          {/* From / Bill To */}
          <View style={ps.metaGrid}>
            <View style={ps.panel}>
              <Text style={ps.panelLabel}>From</Text>
              <Text style={ps.panelWho}>Bilal Ahmed</Text>
              <Text style={ps.panelLine}>Business Automation Consultant</Text>
              <Text style={ps.panelLine}>{BILAL_EMAIL}</Text>
            </View>
            <View style={ps.panel}>
              <Text style={ps.panelLabel}>Bill To</Text>
              <Text style={ps.panelWho}>Engstrom Wood Products</Text>
              <Text style={ps.panelLine}>13325 Commerce Boulevard</Text>
              <Text style={ps.panelLine}>Rogers, Minnesota 55374</Text>
              <Text style={ps.panelLine}>United States</Text>
              <Text style={ps.panelLine}>763-494-8855</Text>
            </View>
          </View>

          {/* Invoice meta row */}
          <View style={ps.invoiceMeta}>
            <View style={ps.mi}>
              <Text style={ps.miLabel}>Invoice No.</Text>
              <Text style={ps.miVal}>{invoice.invoice_number}</Text>
            </View>
            <View style={ps.mi}>
              <Text style={ps.miLabel}>Issue Date</Text>
              <Text style={ps.miVal}>{issuedDate}</Text>
            </View>
            <View style={ps.mi}>
              <Text style={ps.miLabel}>Billing Period</Text>
              <Text style={ps.miVal}>{periodLabel}</Text>
            </View>
          </View>

          {/* Table header */}
          <View style={ps.tHead}>
            <Text style={[ps.tHeadCell, { width: "17%", textAlign: "left" }]}>Date</Text>
            <Text style={[ps.tHeadCell, { width: "37%", textAlign: "left" }]}>Description</Text>
            <Text style={[ps.tHeadCell, { width: "14%", textAlign: "right" }]}>Hours</Text>
            <Text style={[ps.tHeadCell, { width: "14%", textAlign: "right" }]}>Rate</Text>
            <Text style={[ps.tHeadCell, { width: "18%", textAlign: "right" }]}>Amount</Text>
          </View>
          {dailyRows.map((row, i) => {
            const hrs = parseFloat((row.totalSeconds / 3600).toFixed(2))
            const amt = hrs * invoice.hourly_rate
            const isLast = i === dailyRows.length - 1
            return (
              <View key={i} style={isLast ? ps.tRowLast : ps.tRow}>
                <Text style={[ps.tCellDate, { width: "17%" }]}>{row.date}</Text>
                <Text style={[ps.tCellDesc, { width: "37%" }]}>Development work — EWP quoting tool</Text>
                <Text style={[ps.tCell, { width: "14%", textAlign: "right" }]}>{hrs.toFixed(2)}</Text>
                <Text style={[ps.tCell, { width: "14%", textAlign: "right" }]}>{fmtMoney(invoice.hourly_rate)}</Text>
                <Text style={[ps.tCell, { width: "18%", textAlign: "right" }]}>{fmtMoney(amt)}</Text>
              </View>
            )
          })}

          {/* Notes + Totals */}
          <View style={ps.foot}>
            <View style={ps.terms}>
              <Text style={ps.notesLabel}>Notes</Text>
              <Text style={ps.notesText}>Billable hours logged {periodShort} at {fmtMoney(invoice.hourly_rate)}/hr for development of the EWP quotation manager web app.</Text>
            </View>
            <View style={ps.totals}>
              <View style={ps.totalRow}>
                <Text style={ps.totalLbl}>Total hours</Text>
                <Text style={ps.totalVal}>{Number(invoice.total_hours).toFixed(2)}</Text>
              </View>
              <View style={ps.totalRow}>
                <Text style={ps.totalLbl}>Subtotal</Text>
                <Text style={ps.totalVal}>{fmtMoney(invoice.total_amount)}</Text>
              </View>
              <View style={ps.totalRowDiv}>
                <Text style={ps.totalLbl}>Tax</Text>
                <Text style={ps.totalVal}>$0.00</Text>
              </View>
              <View style={ps.dueBox}>
                <Text style={ps.dueK}>Total Due</Text>
                <Text style={ps.dueV}>{fmtMoney(invoice.total_amount)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={ps.thanks}>
          <Text style={ps.thanksMsg}></Text>
          <View style={ps.thanksContact}>
            <Text style={ps.thanksName}>Bilal Ahmed</Text>
            <Text style={ps.thanksEmail}>{BILAL_EMAIL}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ── Main Component ───────────────────────────────────────────────
export function TimeTrackerTab({ session, t, font, serif, showToast }) {
  // Timer state
  const [activeEntry, setActiveEntry] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [description, setDescription] = useState("")
  const [timerLoading, setTimerLoading] = useState(false)
  const intervalRef = useRef(null)

  // Data
  const [entries, setEntries] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  // Sub-section toggle
  const [expandedWeek, setExpandedWeek] = useState(null)

  // Inline editing: { entryId, field } → tracks which cell is being edited
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState("")

  const descSaveTimer = useRef(null)

  // ── Load data on mount ──
  useEffect(() => {
    loadData()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (descSaveTimer.current) clearTimeout(descSaveTimer.current)
    }
  }, [])

  // ── Auto-stop timer on browser close / shutdown ──
  useEffect(() => {
    const stopOnUnload = () => {
      if (!activeEntry) return
      const now = new Date().toISOString()
      const durationSeconds = Math.round((Date.now() - new Date(activeEntry.started_at).getTime()) / 1000)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/time_entries?id=eq.${activeEntry.id}`
      const token = session?.access_token
      fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ stopped_at: now, duration_seconds: durationSeconds }),
        keepalive: true,
      })
    }
    window.addEventListener("beforeunload", stopOnUnload)
    return () => window.removeEventListener("beforeunload", stopOnUnload)
  }, [activeEntry, session])

  const loadData = async () => {
    setLoading(true)
    try {
      const [entriesRes, invoicesRes] = await Promise.all([
        supabase.from("time_entries").select("*").order("started_at", { ascending: false }),
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      ])
      if (entriesRes.error) throw entriesRes.error
      if (invoicesRes.error) throw invoicesRes.error

      const all = entriesRes.data || []
      setEntries(all)
      setInvoices(invoicesRes.data || [])

      // Resume running timer
      const running = all.find(e => !e.stopped_at)
      if (running) {
        setActiveEntry(running)
        setDescription(running.description || "")
        const elapsedSec = Math.round((Date.now() - new Date(running.started_at).getTime()) / 1000)
        setElapsed(elapsedSec)
        startTicking(new Date(running.started_at).getTime())
      }
    } catch (err) {
      logError("timetracker.load", err)
      showToast("Failed to load time entries")
    }
    setLoading(false)
  }

  const startTicking = (startMs) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startMs) / 1000))
    }, 1000)
  }

  const updateDescription = (val) => {
    setDescription(val)
    if (!activeEntry) return
    if (descSaveTimer.current) clearTimeout(descSaveTimer.current)
    descSaveTimer.current = setTimeout(async () => {
      try {
        await supabase.from("time_entries").update({ description: val.trim() || null }).eq("id", activeEntry.id)
        setEntries(prev => prev.map(e => e.id === activeEntry.id ? { ...e, description: val.trim() || null } : e))
      } catch (err) {
        logError("timetracker.updateDesc", err)
      }
    }, 800)
  }

  // ── Inline edit helpers ──
  const startEdit = (entryId, field, currentValue) => {
    setEditing({ entryId, field })
    setEditVal(currentValue)
  }

  const cancelEdit = () => { setEditing(null); setEditVal("") }

  const saveEdit = async () => {
    if (!editing) return
    const { entryId, field } = editing
    const entry = entries.find(e => e.id === entryId)
    if (!entry) { cancelEdit(); return }

    try {
      const updates = {}
      if (field === "description") {
        updates.description = editVal.trim() || null
      } else if (field === "started_at" || field === "stopped_at") {
        const dateStr = new Date(entry[field]).toISOString().slice(0, 10)
        const timeParts = editVal.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
        if (!timeParts) { showToast("Invalid time format"); cancelEdit(); return }
        let hours = parseInt(timeParts[1], 10)
        const mins = parseInt(timeParts[2], 10)
        const ampm = timeParts[3]
        if (ampm) {
          if (ampm.toLowerCase() === "pm" && hours !== 12) hours += 12
          if (ampm.toLowerCase() === "am" && hours === 12) hours = 0
        }
        const newDate = new Date(dateStr + "T" + String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0") + ":00")
        if (isNaN(newDate.getTime())) { showToast("Invalid time"); cancelEdit(); return }
        updates[field] = newDate.toISOString()
        if (field === "started_at" && entry.stopped_at) {
          updates.duration_seconds = Math.round((new Date(entry.stopped_at).getTime() - newDate.getTime()) / 1000)
        } else if (field === "stopped_at" && entry.started_at) {
          updates.duration_seconds = Math.round((newDate.getTime() - new Date(entry.started_at).getTime()) / 1000)
        }
        if (updates.duration_seconds != null && updates.duration_seconds < 0) {
          showToast("Stop time must be after start time"); cancelEdit(); return
        }
      }
      const { error } = await supabase.from("time_entries").update(updates).eq("id", entryId)
      if (error) throw error
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...updates } : e))
      showToast("Entry updated")
    } catch (err) {
      logError("timetracker.editEntry", err)
      showToast("Failed to update entry")
    }
    cancelEdit()
  }

  const editKeyDown = (e) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const renderEditableCell = (entry, field, displayValue) => {
    const isEditing = editing && editing.entryId === entry.id && editing.field === field
    if (isEditing) {
      return (
        <input
          autoFocus
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={editKeyDown}
          style={{
            width: "100%", padding: "2px 4px", borderRadius: 4,
            border: `1px solid ${t.gold}`, background: t.inputBg, color: t.inputText,
            fontSize: 12, fontFamily: font, outline: "none", boxSizing: "border-box",
          }}
        />
      )
    }
    const isInvoiced = !!entry.invoice_id
    const isRunning = !entry.stopped_at && field !== "description"
    const clickable = !isInvoiced && !isRunning
    const currentVal = field === "description"
      ? (entry.description || "")
      : fmtTime(entry[field])
    return (
      <span
        onClick={clickable ? (e) => { e.stopPropagation(); startEdit(entry.id, field, currentVal) } : undefined}
        style={{ cursor: clickable ? "pointer" : "default", borderBottom: clickable ? `1px dashed ${t.border}` : "none" }}
        title={clickable ? "Click to edit" : isInvoiced ? "Invoiced — cannot edit" : ""}
      >
        {displayValue}
      </span>
    )
  }

  // ── Start timer ──
  const handleStart = async () => {
    setTimerLoading(true)
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase.from("time_entries").insert({
        user_id: session.user.id,
        started_at: now,
        description: description.trim() || null,
      }).select().single()
      if (error) throw error
      setActiveEntry(data)
      setElapsed(0)
      startTicking(new Date(now).getTime())
      setEntries(prev => [data, ...prev])
      showToast("Timer started")
    } catch (err) {
      logError("timetracker.start", err)
      showToast("Failed to start timer")
    }
    setTimerLoading(false)
  }

  // ── Stop timer ──
  const handleStop = async () => {
    if (!activeEntry) return
    setTimerLoading(true)
    try {
      const now = new Date().toISOString()
      const durationSeconds = Math.round((Date.now() - new Date(activeEntry.started_at).getTime()) / 1000)
      const { error } = await supabase.from("time_entries").update({
        stopped_at: now,
        duration_seconds: durationSeconds,
        description: description.trim() || null,
      }).eq("id", activeEntry.id)
      if (error) throw error
      if (intervalRef.current) clearInterval(intervalRef.current)
      setEntries(prev => prev.map(e => e.id === activeEntry.id ? { ...e, stopped_at: now, duration_seconds: durationSeconds, description: description.trim() || null } : e))
      setActiveEntry(null)
      setElapsed(0)
      setDescription("")
      showToast(`Logged ${fmtDuration(durationSeconds)}`)
    } catch (err) {
      logError("timetracker.stop", err)
      showToast("Failed to stop timer")
    }
    setTimerLoading(false)
  }

  // ── Delete entry ──
  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Delete this time entry?")) return
    try {
      const { error } = await supabase.from("time_entries").delete().eq("id", id)
      if (error) throw error
      setEntries(prev => prev.filter(e => e.id !== id))
      showToast("Entry deleted")
    } catch (err) {
      logError("timetracker.delete", err)
      showToast("Failed to delete entry")
    }
  }

  // ── Weekly grouping ──
  const weeks = useMemo(() => {
    const map = {}
    entries.forEach(e => {
      if (!e.stopped_at) return
      const mon = getMonday(new Date(e.started_at))
      const key = toDateStr(mon)
      if (!map[key]) map[key] = { start: mon, end: getSunday(mon), entries: [], totalSeconds: 0 }
      map[key].entries.push(e)
      map[key].totalSeconds += e.duration_seconds || 0
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({ key, ...val }))
  }, [entries])

  // ── Generate invoice ──
  const handleGenerateInvoice = async (week) => {
    try {
      // Invoice number: INV-YYYY-MMDD (from week start date)
      const ws = toDateStr(week.start)
      const invoiceNumber = `INV-${ws.slice(0,4)}-${ws.slice(5,7)}${ws.slice(8,10)}`
      const totalHours = parseFloat(fmtHours(week.totalSeconds))
      const totalAmount = parseFloat((totalHours * HOURLY_RATE).toFixed(2))

      const { data: inv, error } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        week_start: toDateStr(week.start),
        week_end: toDateStr(week.end),
        hourly_rate: HOURLY_RATE,
        total_hours: totalHours,
        total_amount: totalAmount,
        status: "pending",
      }).select().single()
      if (error) throw error

      // Link entries to invoice
      const entryIds = week.entries.map(e => e.id)
      await supabase.from("time_entries").update({ invoice_id: inv.id }).in("id", entryIds)

      setInvoices(prev => [inv, ...prev])
      setEntries(prev => prev.map(e => entryIds.includes(e.id) ? { ...e, invoice_id: inv.id } : e))

      // Generate and download PDF
      await downloadInvoicePDF(inv, week.entries)
      showToast(`Invoice ${invoiceNumber} generated`)
    } catch (err) {
      logError("timetracker.generateInvoice", err)
      showToast("Failed to generate invoice")
    }
  }

  // ── Download PDF ──
  const downloadInvoicePDF = async (invoice, weekEntries) => {
    const sorted = [...weekEntries].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    const blob = await pdf(<InvoicePDFDoc invoice={invoice} entries={sorted} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${invoice.invoice_number}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  // ── Email invoice ──
  const handleEmailInvoice = async (invoice) => {
    try {
      showToast("Generating PDF…")
      const weekEntries = entries.filter(e => e.invoice_id === invoice.id)
      const sorted = [...weekEntries].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
      const blob = await pdf(<InvoicePDFDoc invoice={invoice} entries={sorted} />).toBlob()
      const arrayBuf = await blob.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuf)
      let binary = ""
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
      const pdfBase64 = btoa(binary)

      showToast("Sending email…")
      const { error } = await supabase.functions.invoke("send-quote-email", {
        body: {
          to: CLIENT_EMAIL,
          subject: `Invoice ${invoice.invoice_number} — Bilal Ahmed`,
          body: `Hi Kyle,\n\nPlease find attached invoice ${invoice.invoice_number} for the period ${fmtDateFull(invoice.week_start)} — ${fmtDateFull(invoice.week_end)}.\n\nTotal: ${fmtMoney(invoice.total_amount)}\n\nThank you,\nBilal`,
          pdfBase64,
          filename: `${invoice.invoice_number}.pdf`,
          replyTo: BILAL_EMAIL,
          fromName: "Bilal Ahmed",
        },
      })
      if (error) throw error

      await supabase.from("invoices").update({ emailed_at: new Date().toISOString() }).eq("id", invoice.id)
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, emailed_at: new Date().toISOString() } : inv))
      showToast(`Invoice emailed to ${CLIENT_EMAIL}`)
    } catch (err) {
      logError("timetracker.email", err)
      showToast("Failed to send email")
    }
  }

  // ── Toggle payment received ──
  const togglePaymentReceived = async (inv) => {
    try {
      const isPaid = inv.status === "paid"
      const updates = isPaid
        ? { status: "pending", paid_on: null, received_on: null }
        : { status: "paid", paid_on: toDateStr(new Date()), received_on: toDateStr(new Date()) }
      const { error } = await supabase.from("invoices").update(updates).eq("id", inv.id)
      if (error) throw error
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...updates } : i))
      showToast(isPaid ? "Marked as unpaid" : "Payment received!")
    } catch (err) {
      logError("timetracker.togglePayment", err)
      showToast("Failed to update invoice")
    }
  }

  // ── Delete invoice ──
  const handleDeleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}? This will unlink its time entries so they can be re-invoiced.`)) return
    try {
      await supabase.from("time_entries").update({ invoice_id: null }).eq("invoice_id", inv.id)
      const { error } = await supabase.from("invoices").delete().eq("id", inv.id)
      if (error) throw error
      setEntries(prev => prev.map(e => e.invoice_id === inv.id ? { ...e, invoice_id: null } : e))
      setInvoices(prev => prev.filter(i => i.id !== inv.id))
      showToast(`Invoice ${inv.invoice_number} deleted`)
    } catch (err) {
      logError("timetracker.deleteInvoice", err)
      showToast("Failed to delete invoice")
    }
  }

  // ── Helpers for checking if week has invoice ──
  const weekHasInvoice = (weekKey) => invoices.some(inv => inv.week_start === weekKey)
  const getWeekInvoice = (weekKey) => invoices.find(inv => inv.week_start === weekKey)

  // ── Current week key ──
  const currentWeekKey = toDateStr(getMonday(new Date()))

  // ── Today's entries ──
  const todayStr = toDateStr(new Date())
  const todayEntries = entries.filter(e => {
    const d = new Date(e.started_at)
    return toDateStr(d) === todayStr
  })

  // ── Shared styles ──
  const card = { background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "24px 28px", marginBottom: 20 }
  const sectionHeader = { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.gold, marginBottom: 16, fontFamily: font }
  const inputStyle = { padding: "8px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.inputBg, color: t.inputText, fontSize: 13, fontFamily: font, outline: "none", transition: "border-color 0.15s" }
  const btnBase = { padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: font, transition: "all 0.15s" }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: font }}>Loading time tracker…</div>
  }

  return (
    <div>
      {/* Section title */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: serif }}>Time Tracker</div>
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>Track hours, generate invoices, manage billing</div>
        <div style={{ height: 2, background: t.gold, width: 48, marginTop: 12 }} />
      </div>

      {/* ── SECTION A: TIMER ── */}
      <div style={card}>
        <div style={sectionHeader}>Timer</div>

        {/* Elapsed display */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{
            fontSize: 56, fontWeight: 800, fontFamily: font, color: activeEntry ? t.text : t.textMuted,
            letterSpacing: "0.05em", lineHeight: 1,
          }}>
            {fmtDuration(elapsed)}
          </div>
          {activeEntry && (
            <div style={{ fontSize: 11, color: t.textMid, marginTop: 6 }}>
              Started {fmtTime(activeEntry.started_at)}
            </div>
          )}
        </div>

        {/* Description + buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <input
            value={description}
            onChange={e => updateDescription(e.target.value)}
            placeholder="What are you working on?"
            style={{ ...inputStyle, flex: 1, minWidth: 200, maxWidth: 400 }}
            onKeyDown={e => { if (e.key === "Enter" && !activeEntry) handleStart() }}
          />
          {!activeEntry ? (
            <button onClick={handleStart} disabled={timerLoading} style={{
              ...btnBase, background: "#2E7D32", color: "#fff", padding: "10px 28px", fontSize: 14,
              opacity: timerLoading ? 0.6 : 1,
            }}>
              ▶ Start
            </button>
          ) : (
            <button onClick={handleStop} disabled={timerLoading} style={{
              ...btnBase, background: "#C62828", color: "#fff", padding: "10px 28px", fontSize: 14,
              opacity: timerLoading ? 0.6 : 1,
            }}>
              ◼ Stop
            </button>
          )}
        </div>

        {/* Today's entries */}
        {todayEntries.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Today</div>
            <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${t.border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "90px 80px 80px 80px 1fr 40px", padding: "8px 12px", background: t.cardAlt, fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span>Date</span><span>Start</span><span>Stop</span><span>Duration</span><span>Description</span><span></span>
              </div>
              {todayEntries.map(e => (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: "90px 80px 80px 80px 1fr 40px", padding: "8px 12px", borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.text, alignItems: "center" }}>
                  <span>{fmtDateShort(e.started_at)}</span>
                  <span>{renderEditableCell(e, "started_at", fmtTime(e.started_at))}</span>
                  <span>{e.stopped_at ? renderEditableCell(e, "stopped_at", fmtTime(e.stopped_at)) : "⏱ running"}</span>
                  <span style={{ fontWeight: 600 }}>{e.stopped_at ? fmtDuration(e.duration_seconds || 0) : fmtDuration(elapsed)}</span>
                  <span style={{ color: t.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{renderEditableCell(e, "description", e.description || "—")}</span>
                  <span>
                    {e.stopped_at && (
                      <button onClick={() => handleDeleteEntry(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: t.textMuted, padding: 2 }} title="Delete">🗑</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── SECTION B: WEEKLY SUMMARIES ── */}
      <div style={card}>
        <div style={sectionHeader}>Weekly Summaries</div>

        {weeks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: t.textMuted, fontSize: 13 }}>No completed time entries yet.</div>
        ) : (
          weeks.map(week => {
            const isExpanded = expandedWeek === week.key
            const inv = getWeekInvoice(week.key)
            const totalHrs = parseFloat(fmtHours(week.totalSeconds))
            const totalAmt = totalHrs * HOURLY_RATE
            const isCurrentWeek = week.key === currentWeekKey

            return (
              <div key={week.key} style={{ border: `1px solid ${isCurrentWeek ? "#5B8C5A" : t.border}`, borderRadius: 8, marginBottom: 10, overflow: "hidden", background: isCurrentWeek ? "rgba(91,140,90,0.07)" : "transparent" }}>
                {/* Week header */}
                <div
                  onClick={() => setExpandedWeek(isExpanded ? null : week.key)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", cursor: "pointer", background: isExpanded ? t.cardAlt : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: t.textMuted, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: font, display: "flex", alignItems: "center", gap: 8 }}>
                        {fmtDateFull(toDateStr(week.start))} — {fmtDateFull(toDateStr(week.end))}
                        {isCurrentWeek && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#5B8C5A", color: "#fff", letterSpacing: "0.03em" }}>THIS WEEK</span>}
                      </div>
                      <div style={{ fontSize: 11, color: t.textMid, marginTop: 2 }}>
                        {week.entries.length} entr{week.entries.length === 1 ? "y" : "ies"} · {totalHrs} hrs · {fmtMoney(totalAmt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                    {inv ? (
                      <>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                          background: t.badgeApproved.bg, color: t.badgeApproved.color,
                        }}>{inv.invoice_number}</span>
                        <button onClick={() => downloadInvoicePDF(inv, week.entries)} style={{ ...btnBase, padding: "5px 10px", fontSize: 11, background: t.cardAlt, color: t.text, border: `1px solid ${t.border}` }}>📄 PDF</button>
                        <button onClick={() => handleEmailInvoice(inv)} style={{ ...btnBase, padding: "5px 10px", fontSize: 11, background: t.cardAlt, color: t.text, border: `1px solid ${t.border}` }}>
                          {inv.emailed_at ? "📧 Resend" : "📧 Email"}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleGenerateInvoice(week)} style={{ ...btnBase, padding: "6px 14px", fontSize: 11, background: "#2E7D32", color: "#fff" }}>
                        Generate Invoice
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded entries table */}
                {isExpanded && (
                  <div style={{ padding: "0 16px 12px" }}>
                    <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${t.border}`, marginTop: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "90px 80px 80px 80px 1fr 40px", padding: "8px 12px", background: t.cardAlt, fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <span>Date</span><span>Start</span><span>Stop</span><span>Duration</span><span>Description</span><span></span>
                      </div>
                      {[...week.entries].sort((a, b) => new Date(a.started_at) - new Date(b.started_at)).map(e => (
                        <div key={e.id} style={{ display: "grid", gridTemplateColumns: "90px 80px 80px 80px 1fr 40px", padding: "8px 12px", borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.text, alignItems: "center" }}>
                          <span>{fmtDateShort(e.started_at)}</span>
                          <span>{renderEditableCell(e, "started_at", fmtTime(e.started_at))}</span>
                          <span>{renderEditableCell(e, "stopped_at", fmtTime(e.stopped_at))}</span>
                          <span style={{ fontWeight: 600 }}>{fmtDuration(e.duration_seconds || 0)}</span>
                          <span style={{ color: t.textMid }}>{renderEditableCell(e, "description", e.description || "—")}</span>
                          <span>
                            <button onClick={() => handleDeleteEntry(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: t.textMuted, padding: 2 }} title="Delete">🗑</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── SECTION C: INVOICE LEDGER ── */}
      <div style={card}>
        <div style={sectionHeader}>Invoice Ledger</div>

        {invoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: t.textMuted, fontSize: 13 }}>No invoices generated yet.</div>
        ) : (
          <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${t.border}` }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px 100px 100px 1fr", padding: "10px 14px", background: t.cardAlt, fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Invoice #</span><span>Period</span><span>Hours</span><span>Amount</span><span>Status</span><span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {invoices.map(inv => (
              <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px 100px 100px 1fr", padding: "12px 14px", borderTop: `1px solid ${t.border}`, fontSize: 13, color: t.text, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{inv.invoice_number}</span>
                <span style={{ fontSize: 12, color: t.textMid }}>{fmtDateFull(inv.week_start)} — {fmtDateFull(inv.week_end)}</span>
                <span>{Number(inv.total_hours).toFixed(2)}</span>
                <span style={{ fontWeight: 700 }}>{fmtMoney(inv.total_amount)}</span>
                <span>
                  <button
                    onClick={() => togglePaymentReceived(inv)}
                    style={{
                      ...btnBase,
                      padding: "6px 14px", fontSize: 12,
                      background: inv.status === "paid" ? t.badgeApproved.bg : t.badgePending.bg,
                      color: inv.status === "paid" ? t.badgeApproved.color : t.badgePending.color,
                      border: `1px solid ${inv.status === "paid" ? t.badgeApproved.color + "33" : t.badgePending.color + "33"}`,
                    }}
                    title={inv.status === "paid" ? "Click to mark unpaid" : "Click to mark as paid"}
                  >
                    {inv.status === "paid" ? "✓ Paid" : "○ Pending"}
                  </button>
                </span>
                <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => {
                    const weekEntries = entries.filter(e => e.invoice_id === inv.id)
                    downloadInvoicePDF(inv, weekEntries)
                  }} style={{
                    ...btnBase, padding: "7px 14px", fontSize: 12,
                    background: t.cardAlt, color: t.text, border: `1px solid ${t.border}`,
                  }} title="Download PDF">📄 PDF</button>
                  <button onClick={() => handleEmailInvoice(inv)} style={{
                    ...btnBase, padding: "7px 14px", fontSize: 12,
                    background: t.cardAlt, color: t.text, border: `1px solid ${t.border}`,
                  }} title="Email invoice">📧 Email</button>
                  <button onClick={() => handleDeleteInvoice(inv)} style={{
                    ...btnBase, padding: "7px 14px", fontSize: 12,
                    background: t.cardAlt, color: "#C62828", border: `1px solid ${t.border}`,
                  }} title="Delete invoice">🗑</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
