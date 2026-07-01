import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase.js"
import { DEFAULT_PRICING } from "./pricing.js"
import { sanitizeName, sanitizeText, sanitizeNumeric, sanitizeEmail, isValidEmail } from "./sanitize.js"
import { logError } from "./logger.js"
import { TimeTrackerTab } from "./TimeTracker.jsx"

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase())

// ── SheetJS loader (CDN, loaded once) ─────────────────────────
let _XLSX = null
const loadXLSX = () => new Promise((resolve, reject) => {
  if (_XLSX) return resolve(_XLSX)
  if (window.XLSX) { _XLSX = window.XLSX; return resolve(_XLSX) }
  const s = document.createElement("script")
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
  s.onload = () => { _XLSX = window.XLSX; resolve(_XLSX) }
  s.onerror = reject
  document.head.appendChild(s)
})

// ── Download helpers ───────────────────────────────────────────
// Convert a cell value for export — percent columns stored as decimals become display %
const exportVal = (v, col) => {
  if (col.type === "percent" && v !== "" && v != null) return Math.round(v * 10000) / 100
  return v ?? ""
}

const downloadCSV = (rows, columns, filename) => {
  const header = columns.map(c => c.label).join(",")
  const body = rows.map(row =>
    columns.map(c => {
      const v = exportVal(row[c.key], c)
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v
    }).join(",")
  ).join("\n")
  const blob = new Blob([header + "\n" + body], { type: "text/csv" })
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
  a.download = filename + ".csv"; a.click()
}

const downloadXLSX = async (rows, columns, filename) => {
  const XLSX = await loadXLSX()
  const data = [
    columns.map(c => c.label),
    ...rows.map(row => columns.map(c => exportVal(row[c.key], c)))
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  // Bold header row
  const range = XLSX.utils.decode_range(ws["!ref"])
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })]
    if (cell) cell.s = { font: { bold: true } }
  }
  // Auto column widths
  ws["!cols"] = columns.map(c => ({ wch: Math.max(c.label.length + 2, 16) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 31))
  XLSX.writeFile(wb, filename + ".xlsx")
}

// ── Upload / parse helpers ─────────────────────────────────────
const parseUploadedFile = async (file, expectedColumns) => {
  const XLSX = await loadXLSX()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" })

  if (rows.length === 0) throw new Error("File is empty or has no data rows.")

  // Map header labels → keys
  const labelToKey = {}
  expectedColumns.forEach(c => { labelToKey[c.label.toLowerCase()] = c })

  const firstRow = rows[0]
  const fileHeaders = Object.keys(firstRow).map(h => h.toLowerCase().trim())
  const missing = expectedColumns.filter(c => !fileHeaders.includes(c.label.toLowerCase()))
  if (missing.length > 0) {
    throw new Error(`Missing columns: ${missing.map(c => c.label).join(", ")}.\n\nExpected: ${expectedColumns.map(c => c.label).join(", ")}`)
  }

  return rows.map(row => {
    const out = {}
    expectedColumns.forEach(col => {
      const rawKey = Object.keys(row).find(k => k.toLowerCase().trim() === col.label.toLowerCase())
      const val = rawKey !== undefined ? row[rawKey] : ""
      if (col.type === "percent") {
        out[col.key] = val === "" ? 0 : Number(val) / 100
      } else if (col.type === "number") {
        out[col.key] = val === "" ? 0 : Number(val)
      } else {
        out[col.key] = String(val)
      }
    })
    return out
  }).filter(row => row[expectedColumns[0].key] !== "" && row[expectedColumns[0].key] !== 0)
}

// ── TABLE CONFIG ───────────────────────────────────────────────
const TABLE_CONFIG = [
  {
    key: "woodwork",
    label: "Cabinet Products",
    description: "Base prices and finishing linear feet per unit",
    columns: [
      { key: "name",   label: "Product Name",  type: "text",   width: "45%" },
      { key: "price",  label: "Base Price ($)", type: "number", width: "25%" },
      { key: "finLF",  label: "Fin. LF",        type: "number", width: "20%" },
    ],
  },
  {
    key: "countertops",
    label: "Countertop Products",
    description: "Base prices per unit for countertop items",
    columns: [
      { key: "name",  label: "Product Name",  type: "text",   width: "60%" },
      { key: "price", label: "Base Price ($)", type: "number", width: "30%" },
    ],
  },
  {
    key: "construction",
    label: "Construction Styles",
    description: "Markup % over standard (paint grade). e.g. 20 = 20% markup.",
    columns: [
      { key: "name",    label: "Style",          type: "text",   width: "60%" },
      { key: "premium", label: "Markup %",       type: "percent", width: "30%" },
    ],
  },
  {
    key: "wood",
    label: "Wood Species",
    description: "Markup % over standard (paint grade). e.g. 15 = 15% markup.",
    columns: [
      { key: "name",    label: "Species",        type: "text",   width: "60%" },
      { key: "premium", label: "Markup %",       type: "percent", width: "30%" },
    ],
  },
  {
    key: "finishing",
    label: "Finishing Types",
    description: "Price per linear foot for each finish type",
    columns: [
      { key: "name",       label: "Finish Type",     type: "text",   width: "50%" },
      { key: "pricePerLF", label: "Price / LF ($)",  type: "number", width: "40%" },
    ],
  },
  {
    key: "installType",
    label: "Installation Types",
    description: "Rate as decimal of cabinetry total (or $/hr for Hourly Rate)",
    columns: [
      { key: "name", label: "Install Type", type: "text",   width: "60%" },
      { key: "rate", label: "Rate",         type: "number", width: "30%" },
    ],
  },
  {
    key: "upgrades",
    label: "Upgrades & Hardware",
    description: "Fixed prices per upgrade item",
    columns: [
      { key: "name",  label: "Upgrade Name", type: "text",   width: "65%" },
      { key: "price", label: "Price ($)",    type: "number", width: "25%" },
    ],
  },
]

export default function AdminPanel({ currentUser, isAdmin, onBack, session }) {
  const [tab, setTab] = useState("users")         // "users" | "pricing"
  const [scrolled, setScrolled] = useState(false)
  const [activeTable, setActiveTable] = useState("woodwork")
  const [pricing, setPricing] = useState(null)    // null = loading
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef(null)
  const [sortCol, setSortCol] = useState(null)   // { key, dir: "asc"|"desc" }
  const [sortTable, setSortTable] = useState(null) // track which table the sort applies to
  const pricingStampRef = useRef(null)

  // Users state
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Pre-approved emails state
  const [preApproved, setPreApproved] = useState([])
  const [preApprovedLoading, setPreApprovedLoading] = useState(true)
  const [newPreEmail, setNewPreEmail] = useState("")
  const [addingPreEmail, setAddingPreEmail] = useState(false)

  // Reset password modal state
  const [resetModal, setResetModal] = useState(null) // null | { email }
  const [resetSent, setResetSent] = useState(false)

  // Root-access blocked modal
  const [rootBlockModal, setRootBlockModal] = useState(false)

  const [toast, setToast] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem("ewp-theme") === "dark")

  useEffect(() => {
    const handler = () => setDark(localStorage.getItem("ewp-theme") === "dark")
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchUsers()
    fetchPricing()
    fetchPreApproved()
  }, [])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from("user_approvals").select("*").order("created_at", { ascending: false })
      if (error) logError("fetchUsers", error)
      else setUsers(data || [])
    } catch (err) { logError("fetchUsers", err) }
    setUsersLoading(false)
  }

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing").select("data, updated_at").eq("id", "main").single()
      if (error || !data) {
        setPricing(JSON.parse(JSON.stringify(DEFAULT_PRICING)))
        pricingStampRef.current = null
      } else {
        // Merge with defaults so new keys added to DEFAULT_PRICING are always present
        const merged = {}
        for (const key of Object.keys(DEFAULT_PRICING)) {
          merged[key] = data.data[key] ?? DEFAULT_PRICING[key]
        }
        setPricing(merged)
        pricingStampRef.current = data.updated_at || null
      }
    } catch (err) { logError("fetchPricing", err); setPricing(JSON.parse(JSON.stringify(DEFAULT_PRICING))) }
  }

  const savePricing = async () => {
    // Validate: no blank names, no blank/zero numeric values
    for (const tc of TABLE_CONFIG) {
      const rows = pricing[tc.key] || []
      for (let i = 0; i < rows.length; i++) {
        for (const col of tc.columns) {
          const val = rows[i][col.key]
          if (val === "" || val === null || val === undefined) {
            showToast(`⚠ "${tc.label}" row ${i + 1}: "${col.label}" cannot be blank`)
            return
          }
          if ((col.type === "number" || col.type === "percent") && (isNaN(Number(val)))) {
            showToast(`⚠ "${tc.label}" row ${i + 1}: "${col.label}" must be a number`)
            return
          }
        }
      }
    }

    // Check for duplicate first-column values within each table
    for (const tc of TABLE_CONFIG) {
      const firstCol = tc.columns[0].key
      const seen = new Set()
      const rows = pricing[tc.key] || []
      for (let i = 0; i < rows.length; i++) {
        const val = String(rows[i][firstCol] ?? "").toLowerCase().trim()
        if (seen.has(val)) {
          showToast(`⚠ "${tc.label}": duplicate entry "${rows[i][firstCol]}"`)
          return
        }
        seen.add(val)
      }
    }

    // Trim text fields before saving
    for (const tc of TABLE_CONFIG) {
      const rows = pricing[tc.key] || []
      for (const row of rows) {
        for (const col of tc.columns) {
          if (col.type === "text" && typeof row[col.key] === "string") {
            row[col.key] = row[col.key].trim()
          }
        }
      }
    }

    // Sort every table by first column before saving
    const sorted = {}
    for (const tc of TABLE_CONFIG) {
      sorted[tc.key] = sortByFirstCol(tc.key, pricing[tc.key] || [])
    }
    // Also carry over any non-TABLE_CONFIG keys (e.g. productType)
    const finalPricing = { ...pricing, ...sorted }

    setPricing(finalPricing)
    setSaving(true)

    // Conflict detection: check if someone else saved since we loaded
    if (pricingStampRef.current) {
      const { data: current } = await supabase
        .from("pricing").select("updated_at").eq("id", "main").single()
      if (current && current.updated_at !== pricingStampRef.current) {
        const overwrite = confirm(
          "⚠ Pricing was modified by another user since you opened this page.\n\n" +
          "OK = Save your version (overwrites their changes)\n" +
          "Cancel = Go back and reload the latest pricing"
        )
        if (!overwrite) { setSaving(false); return }
      }
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from("pricing")
      .upsert({ id: "main", data: finalPricing, updated_at: now }, { onConflict: "id" })
    if (error) showToast("Error saving prices")
    else { showToast("✓ Prices saved & sorted successfully"); setDirty(false); pricingStampRef.current = now }
    setSaving(false)
  }

  const resetToDefaults = () => {
    if (!confirm("Reset all prices to factory defaults? This cannot be undone.")) return
    setPricing(JSON.parse(JSON.stringify(DEFAULT_PRICING)))
    setDirty(true)
    showToast("Prices reset to defaults — click Save to apply")
  }

  const updateCell = (tableKey, rowIdx, colKey, value, colType) => {
    setPricing(prev => {
      const next = { ...prev, [tableKey]: prev[tableKey].map((row, i) => {
        if (i !== rowIdx) return row
        let v
        if (colKey === "name") {
          // Don't trim while typing — allows spaces between words
          v = String(value ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F<>'"]/g, "").slice(0, 120)
        } else if (colType === "percent") {
          // Display is %, stored as decimal (20 → 0.20)
          v = value === "" ? "" : Number(sanitizeNumeric(String(value))) / 100
        } else {
          v = value === "" ? "" : Number(sanitizeNumeric(String(value)))
        }
        return { ...row, [colKey]: v }
      })}
      return next
    })
    setDirty(true)
  }

  const addRow = (tableKey) => {
    const cfg = TABLE_CONFIG.find(t => t.key === tableKey)
    const blank = {}
    cfg.columns.forEach(c => { blank[c.key] = c.type === "number" ? "" : "" })
    setPricing(prev => ({ ...prev, [tableKey]: [...prev[tableKey], blank] }))
    setDirty(true)
  }

  const sortByFirstCol = (tableKey, rows) => {
    const cfg = TABLE_CONFIG.find(t => t.key === tableKey)
    const firstCol = cfg.columns[0].key
    return [...rows].sort((a, b) => String(a[firstCol]).localeCompare(String(b[firstCol])))
  }

  const deleteRow = (tableKey, rowIdx) => {
    const cfg = TABLE_CONFIG.find(t => t.key === tableKey)
    const firstCol = cfg.columns[0].key
    const rowName = pricing[tableKey][rowIdx][firstCol] || "this row"
    if (!window.confirm(`Delete "${rowName}"?`)) return
    setPricing(prev => ({ ...prev, [tableKey]: prev[tableKey].filter((_, i) => i !== rowIdx) }))
    setDirty(true)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ""   // reset so same file can be re-uploaded
    setUploading(true)
    try {
      const cfg = TABLE_CONFIG.find(tc => tc.key === activeTable)
      const parsed = await parseUploadedFile(file, cfg.columns)
      setPricing(prev => ({ ...prev, [activeTable]: parsed }))
      setDirty(true)
      showToast(`✓ Imported ${parsed.length} rows — click Save to apply`)
    } catch (err) {
      showToast("Upload error: " + err.message)
    }
    setUploading(false)
  }

  const handleSort = (colKey) => {
    if (sortTable !== activeTable || sortCol?.key !== colKey) {
      setSortCol({ key: colKey, dir: "asc" })
      setSortTable(activeTable)
    } else if (sortCol.dir === "asc") {
      setSortCol({ key: colKey, dir: "desc" })
    } else {
      setSortCol(null)
      setSortTable(null)
    }
  }

  const getSortedRows = (rows) => {
    if (!sortCol || sortTable !== activeTable) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortCol.key] ?? ""
      const bv = b[sortCol.key] ?? ""
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv))
      return sortCol.dir === "asc" ? cmp : -cmp
    })
  }

  const sortArrow = (colKey) => {
    if (sortTable !== activeTable || sortCol?.key !== colKey) return " ↕"
    return sortCol.dir === "asc" ? " ↑" : " ↓"
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const confirmIfDirty = (action) => {
    if (dirty && tab === "pricing") {
      if (!window.confirm("You have unsaved changes. Discard them and continue?")) return
      setDirty(false)
    }
    action()
  }

  // Users helpers
  const approve = async (userId, email) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase.from("user_approvals")
        .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: currentUser.email })
        .eq("user_id", userId)
      if (error) { logError("approveUser", error); showToast("Error approving user — try again") }
      else { setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status: "approved" } : u)); showToast(`✓ Approved ${email}`) }
    } catch (err) { logError("approveUser", err); showToast("Unexpected error — check connection") }
    setActionLoading(null)
  }

  const reject = async (userId, email) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase.from("user_approvals")
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: currentUser.email })
        .eq("user_id", userId)
      if (error) { logError("rejectUser", error); showToast("Error rejecting user — try again") }
      else { setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status: "rejected" } : u)); showToast(`Rejected ${email}`) }
    } catch (err) { logError("rejectUser", err); showToast("Unexpected error — check connection") }
    setActionLoading(null)
  }

  const deleteUser = async (userId, email) => {
    if (ADMIN_EMAILS.includes(email?.toLowerCase())) { setRootBlockModal(true); return }
    if (!window.confirm(`Remove ${email}? They will lose access immediately and cannot sign back in.`)) return
    setActionLoading(userId)
    try {
      const { error } = await supabase.from("user_approvals").delete().eq("user_id", userId)
      if (error) { logError("deleteUser", error); showToast("Error removing user — try again") }
      else { setUsers(prev => prev.filter(u => u.user_id !== userId)); showToast(`✓ ${email} removed`) }
    } catch (err) { logError("deleteUser", err); showToast("Unexpected error — check connection") }
    setActionLoading(null)
  }

  const sendPasswordReset = async (email) => {
    setResetSent(false)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) { logError("passwordReset", error); showToast("Error sending reset email — try again") }
      else { setResetSent(true); showToast(`✓ Password reset email sent to ${email}`) }
    } catch (err) { logError("passwordReset", err); showToast("Unexpected error — check connection") }
  }

  // Pre-approved emails
  const fetchPreApproved = async () => {
    setPreApprovedLoading(true)
    try {
      const { data, error } = await supabase.from("pre_approved_emails").select("*").order("added_at", { ascending: false })
      if (error) logError("fetchPreApproved", error)
      else setPreApproved(data || [])
    } catch (err) { logError("fetchPreApproved", err) }
    setPreApprovedLoading(false)
  }

  const addPreApproved = async () => {
    const email = sanitizeEmail(newPreEmail)
    if (!email || !isValidEmail(email)) { showToast("Enter a valid email address"); return }
    if (preApproved.some(p => p.email === email)) { showToast("Already in pre-approved list"); return }
    setAddingPreEmail(true)
    try {
      const { error } = await supabase.from("pre_approved_emails").insert({
        email,
        added_by: currentUser.email,
        added_at: new Date().toISOString(),
      })
      if (error) { logError("addPreApproved", error); showToast("Error adding email — try again") }
      else {
        setPreApproved(prev => [{ email, added_by: currentUser.email, added_at: new Date().toISOString() }, ...prev])
        setNewPreEmail("")
        showToast(`✓ ${email} pre-approved`)
      }
    } catch (err) { logError("addPreApproved", err); showToast("Unexpected error — check connection") }
    setAddingPreEmail(false)
  }

  const removePreApproved = async (email) => {
    if (!window.confirm(`Remove ${email} from pre-approved list?`)) return
    try {
      const { error } = await supabase.from("pre_approved_emails").delete().eq("email", email)
      if (error) { logError("removePreApproved", error); showToast("Error removing email — try again") }
      else { setPreApproved(prev => prev.filter(p => p.email !== email)); showToast(`Removed ${email}`) }
    } catch (err) { logError("removePreApproved", err); showToast("Unexpected error — check connection") }
  }

  // ── Theme tokens ───────────────────────────────────────────
  const t = dark ? {
    bg: "#141414", card: "#1C1C1C", cardAlt: "#111111", border: "#2A2A2A",
    text: "#E8E2D9", textMid: "#9A9A9A", textMuted: "#666666",
    gold: "#6B6B6B", inputBg: "#141414", inputText: "#E8E2D9",
    tabActiveBg: "#2A2A2A", tabActiveText: "#E8E2D9",
    tabBg: "#111111", tabText: "#666666",
    headerBg: "#111111",
    pendingApprove: "#1A4D35", pendingReject: "#5A2A28", pendingRejectText: "#E05C50",
    badgePending:  { bg: "#2A1F00", color: "#E0C48A" },
    badgeApproved: { bg: "#0D2A1A", color: "#4CAF80" },
    badgeRejected: { bg: "#2A0D0D", color: "#E05C50" },
  } : {
    bg: "#FDFAF5", card: "#fff", cardAlt: "#F9F7F3", border: "#EDE8DF",
    text: "#2D2D2D", textMid: "#6B6B6B", textMuted: "#9E9E9E",
    gold: "#6B6B6B", inputBg: "#FDFAF5", inputText: "#2D2D2D",
    tabActiveBg: "#fff", tabActiveText: "#2D2D2D",
    tabBg: "#F5F0E8", tabText: "#9E9E9E",
    headerBg: "#2D2D2D",
    pendingApprove: "#065F46", pendingReject: "#FCA5A5", pendingRejectText: "#991B1B",
    badgePending:  { bg: "#FEF3C7", color: "#92400E" },
    badgeApproved: { bg: "#D1FAE5", color: "#065F46" },
    badgeRejected: { bg: "#FEE2E2", color: "#991B1B" },
  }

  const font = "var(--font-body)"
  const serif = "var(--font-display)"

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center", background: t.bg, minHeight: "100vh", fontFamily: font }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>Access Denied</div>
        <div style={{ fontSize: 14, color: t.textMid }}>You don't have admin privileges.</div>
        <button className="btn btn-outline" onClick={onBack} style={{ marginTop: 24 }}>← Back</button>
      </div>
    )
  }

  const pending  = users.filter(u => u.status === "pending")
  const reviewed = users.filter(u => u.status !== "pending")
  const activeCfg = TABLE_CONFIG.find(tc => tc.key === activeTable)

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: font }}>
      <style>{`body { margin: 0; padding: 0; background: ${t.bg}; }`}</style>

      <style>{`
        /* ── CSS variables (duplicated from App — AdminPanel replaces App in the tree) ── */
        :root {
          --font-body: 'Inter', sans-serif;
          --font-display: 'Cormorant Garamond', serif;
          --gold: #5B8C5A;
          --gold-light: #7BAF7A;
          --ewp-slate: #1F242E;
          --ewp-slate2: #15171C;
          --ivory2: #EAE8E2;
          --rule: #C8C5BC;
          --char: #15171C;
          --muted: #6E7480;
        }

        /* ── Topbar (matches main App.jsx exactly) ── */
        .topbar-sticky-wrap { background: #1F242E; position: sticky; top: 0; z-index: 100; transition: background 0.4s ease; }
        .topbar-sticky-wrap.dark { background: #12141A; }
        .topbar-sticky-wrap.scrolled { background: rgba(235,233,226,0.75) !important; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
        .topbar-sticky-wrap.dark.scrolled { background: rgba(18,20,26,0.75) !important; }
        .topbar {
          background: rgba(31,36,46,0.85);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding: 0 56px; height: 72px;
          display: flex; align-items: center; justify-content: flex-start;
          border-bottom: none; box-shadow: 0 2px 20px rgba(0,0,0,0.15);
          transition: background 0.4s ease, box-shadow 0.4s ease;
        }
        .topbar.dark { background: rgba(18,20,26,0.85); }
        .topbar.scrolled {
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          background: rgba(235,233,226,0.75);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        }
        .topbar.dark.scrolled {
          background: rgba(18,20,26,0.75);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .topbar.scrolled .topbar-name { color: #2D3038; }
        .topbar.scrolled .topbar-sub { color: #6E7480; }
        .topbar.scrolled .header-logo { filter: brightness(0.15); }
        .topbar.dark.scrolled .topbar-name { color: #D8D4C9; }
        .topbar.dark.scrolled .topbar-sub { color: #8A8E9A; }
        .topbar.dark.scrolled .header-logo { filter: brightness(0) invert(0.88); }
        .topbar-logo {
          display: flex; align-items: center; gap: 20px;
          min-width: 0; overflow: hidden;
        }
        .topbar-logo > div { min-width: 0; }
        .header-logo {
          height: 76px; width: auto; flex-shrink: 0;
          filter: brightness(0) invert(1);
        }
        .topbar-name {
          font-family: var(--font-display);
          font-size: 38px; font-weight: 600;
          color: #FFFFFF; letter-spacing: 0.03em;
          line-height: 1.1; white-space: nowrap;
        }
        .topbar-sub {
          font-size: 12px; color: rgba(255,255,255,0.5);
          letter-spacing: 0.18em; text-transform: uppercase;
          margin-top: 6px; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .topbar-tag-divider {
          display: inline-block; width: 5px; height: 5px;
          background: rgba(255,255,255,0.4); border-radius: 50%;
          margin: 0 10px; vertical-align: middle; opacity: 0.5;
        }

        /* ── Ribbon ── */
        .topbar-ribbon {
          background: transparent; padding: 0 56px;
        }
        .topbar-ribbon-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding: 8px 0;
          max-width: 100%; overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .topbar-ribbon-left, .topbar-ribbon-right { display: flex; align-items: center; gap: 8px; }
        .topbar-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; padding: 10px 18px; cursor: pointer;
          color: rgba(255,255,255,0.85); font-size: 13px;
          font-family: var(--font-body); font-weight: 600;
          display: flex; align-items: center; gap: 6px;
          letter-spacing: 0.04em; text-transform: uppercase;
          transition: background 0.25s ease, color 0.25s ease, transform 0.2s ease;
          white-space: nowrap;
        }
        .topbar-btn:hover { background: rgba(255,255,255,0.15); color: #fff; transform: translateY(-1px); }
        .topbar-btn:active { transform: scale(0.96); }
        .topbar-btn--active { background: rgba(255,255,255,0.18); color: #fff; border-color: rgba(255,255,255,0.25); }
        .topbar-btn .badge {
          background: #C0392B; color: #fff; border-radius: 50%;
          min-width: 18px; height: 18px; font-size: 10px; font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center; padding: 0 4px;
        }
        /* Scrolled ribbon buttons */
        .topbar.scrolled + .topbar-ribbon .topbar-btn {
          background: rgba(45,48,56,0.08); border-color: rgba(45,48,56,0.12); color: #2D3038;
        }
        .topbar.scrolled + .topbar-ribbon .topbar-btn:hover { background: rgba(45,48,56,0.14); }
        .topbar.dark.scrolled + .topbar-ribbon .topbar-btn {
          background: rgba(216,212,201,0.08); border-color: rgba(216,212,201,0.12); color: #D8D4C9;
        }

        /* ── Shared button styles ── */
        .btn {
          font-family: var(--font-body);
          font-size: 12px; font-weight: 700;
          padding: 10px 20px; border-radius: 8px; border: none;
          cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
          letter-spacing: 0.06em; text-transform: uppercase;
          position: relative; overflow: hidden;
        }
        .btn::after {
          content: ''; position: absolute; inset: 0;
          background: rgba(255,255,255,0.12); opacity: 0; transition: opacity 0.15s;
        }
        .btn:hover::after { opacity: 1; }
        .btn:active { transform: scale(0.97); }
        .btn-gold { background: var(--gold); color: #fff; }
        .btn-gold:hover { background: #4A7849; box-shadow: 0 4px 14px rgba(31,36,46,0.25); transform: translateY(-1px); }
        .btn-outline { background: transparent; color: var(--char); border: 1px solid var(--rule); }
        .btn-outline:hover { border-color: var(--char); color: var(--char); background: var(--ivory2); transform: translateY(-1px); }
        .btn-ghost { background: transparent; color: var(--muted); border: none; }
        .btn-ghost:hover { color: var(--char); }
        .dark .btn-gold { background: #7BAF7A; color: #0E1014; }
        .dark .btn-gold:hover { background: #93C492; }

        /* ── Header slide-down (matches main app) ── */
        @keyframes headerSlideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .topbar {
          animation: headerSlideDown 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* ── Admin animations ── */
        @keyframes adminFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes adminScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .admin-main-inner { animation: adminFadeUp 0.45s 0.12s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .admin-user-row { animation: adminFadeUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .admin-user-row:nth-child(1) { animation-delay: 0.05s; }
        .admin-user-row:nth-child(2) { animation-delay: 0.10s; }
        .admin-user-row:nth-child(3) { animation-delay: 0.15s; }
        .admin-user-row:nth-child(4) { animation-delay: 0.20s; }
        .admin-user-row:nth-child(5) { animation-delay: 0.25s; }
        .admin-user-row:nth-child(6) { animation-delay: 0.30s; }
        .admin-pricing-table-shell { overflow: hidden; animation: adminScaleIn 0.4s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @media (max-width: 900px) {
          .topbar { padding: 0 24px !important; }
          .topbar-name { font-size: clamp(22px, 3.5vw, 34px) !important; }
          .header-logo { height: 56px !important; }
          .topbar-ribbon { padding: 0 24px !important; }
        }
        @media (max-width: 768px) {
          .topbar { padding: 0 18px !important; }
          .topbar-name { font-size: 26px !important; }
          .header-logo { height: 50px !important; }
          .topbar-ribbon { padding: 0 14px !important; }
          .topbar-ribbon-inner { flex-wrap: wrap; }
          .admin-main-inner { padding: 16px 14px !important; }
          .admin-pricing-layout { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .admin-pricing-sidebar { width: 100% !important; flex-shrink: 0 !important; }
          .admin-user-row { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .admin-user-actions { justify-content: flex-start !important; flex-wrap: wrap !important; }
          .admin-pricing-table-shell {
            overflow-x: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>

      {/* Topbar + Ribbon sticky wrapper — same structure as main page */}
      <div className={`topbar-sticky-wrap${scrolled ? " scrolled" : ""}${dark ? " dark" : ""}`}>
        <div className={`topbar${scrolled ? " scrolled" : ""}${dark ? " dark" : ""}`}>
          <div className="topbar-logo" style={{ cursor: "pointer" }} onClick={() => confirmIfDirty(onBack)}>
            <img src="/ewp-logo.png" alt="Engstrom Wood Products" className="header-logo" width="44" height="44" />
            <div>
              <div className="topbar-name">Engstrom Wood Products</div>
              <div className="topbar-sub">
                New Age Technology<span className="topbar-tag-divider"></span>Old World Craftsmanship
              </div>
            </div>
          </div>
        </div>
        <div className="topbar-ribbon">
          <div className="topbar-ribbon-inner">
            <div className="topbar-ribbon-left">
              <button className="topbar-btn" onClick={() => confirmIfDirty(onBack)}>
                ← Back
              </button>
            </div>
            <div className="topbar-ribbon-right">
              {[["users", "👥 Users"], ["pricing", "💲 Pricing Tables"], ["contractors", "🏢 Contractors"]].map(([key, label]) => (
                <button key={key} className={`topbar-btn${tab === key ? " topbar-btn--active" : ""}`} onClick={() => confirmIfDirty(() => setTab(key))}>
                  {label}
                </button>
              ))}
              <button className={`topbar-btn${tab === "timetracker" ? " topbar-btn--active" : ""}`} onClick={() => confirmIfDirty(() => setTab("timetracker"))}>
                ⏱ Time Tracker
              </button>
            </div>
          </div>
        </div>
        {dirty && tab === "pricing" && (
          <div style={{ padding: "4px 56px 8px", textAlign: "right" }}>
            <span style={{ fontSize: 12, color: "#E0C48A", fontStyle: "italic" }}>Unsaved changes</span>
          </div>
        )}
      </div>

      <div className="admin-main-inner" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px" }}>

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: serif }}>User Management</div>
              <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>Manage access, approvals, and credentials</div>
              <div style={{ height: 2, background: t.gold, width: 48, marginTop: 12 }} />
            </div>

            {/* ── Pre-Approved Emails ── */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.gold, marginBottom: 4 }}>
                Pre-Approved Emails
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>
                Anyone who signs up with these emails will be automatically approved without waiting for review.
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  value={newPreEmail}
                  onChange={e => setNewPreEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addPreApproved()}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 13,
                    border: `1px solid ${t.border}`, background: t.inputBg, color: t.inputText,
                    fontFamily: font, outline: "none",
                  }}
                />
                <button className="btn btn-gold" onClick={addPreApproved} disabled={addingPreEmail || !newPreEmail.trim()}
                  style={{ opacity: addingPreEmail ? 0.6 : 1, whiteSpace: "nowrap" }}>
                  {addingPreEmail ? "Adding…" : "+ Add Email"}
                </button>
              </div>
              {preApprovedLoading ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>Loading…</div>
              ) : preApproved.length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted, fontStyle: "italic" }}>No pre-approved emails yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {preApproved.map(p => (
                    <div key={p.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 14px" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{p.email}</span>
                        <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 10 }}>
                          Added by {p.added_by} · {p.added_at ? new Date(p.added_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <button onClick={() => removePreApproved(p.email)}
                        style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${t.pendingReject}`, background: "transparent", color: t.pendingRejectText, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Pending Approvals ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.gold, marginBottom: 12 }}>
                Pending Approval ({pending.length})
              </div>
              {usersLoading ? (
                <div style={{ color: t.textMuted, fontSize: 14 }}>Loading…</div>
              ) : pending.length === 0 ? (
                <div style={{ background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 24, textAlign: "center", color: t.textMuted, fontSize: 14 }}>
                  No pending approvals
                </div>
              ) : pending.map(u => (
                <div key={u.user_id} className="admin-user-row" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "16px 20px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    {(u.first_name || u.last_name) && (
                      <div style={{ fontWeight: 700, fontSize: 15, color: t.text, marginBottom: 2 }}>
                        {[u.first_name, u.last_name].filter(Boolean).join(" ")}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                      Requested {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div className="admin-user-actions" style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-gold" onClick={() => approve(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                      style={{ padding: "7px 16px", opacity: actionLoading === u.user_id ? 0.6 : 1 }}>
                      Approve
                    </button>
                    <button className="btn btn-outline" onClick={() => reject(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                      style={{ padding: "7px 16px", opacity: actionLoading === u.user_id ? 0.6 : 1 }}>
                      Reject
                    </button>
                    <button className="btn btn-ghost" onClick={() => deleteUser(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                      style={{ padding: "7px 12px", opacity: actionLoading === u.user_id ? 0.6 : 1 }} title="Delete user">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Reviewed Users ── */}
            {reviewed.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted, marginBottom: 12 }}>
                  All Users ({reviewed.length})
                </div>
                {reviewed.map(u => {
                  const badge = t[`badge${u.status.charAt(0).toUpperCase() + u.status.slice(1)}`] || t.badgePending
                  return (
                    <div key={u.user_id} className="admin-user-row" style={{ background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: "14px 20px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        {(u.first_name || u.last_name) && (
                          <div style={{ fontWeight: 600, fontSize: 14, color: t.text, marginBottom: 1 }}>
                            {[u.first_name, u.last_name].filter(Boolean).join(" ")}
                          </div>
                        )}
                        <div style={{ fontWeight: 500, fontSize: 14, color: t.text }}>{u.email}</div>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                          Reviewed by {u.reviewed_by || "admin"} · {u.reviewed_at ? new Date(u.reviewed_at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      <div className="admin-user-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...badge, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20 }}>{u.status}</span>
                        {u.status === "rejected" && (
                          <button className="btn btn-gold" onClick={() => approve(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                            style={{ padding: "5px 12px", fontSize: 11 }}>
                            Re-approve
                          </button>
                        )}
                        <button className="btn btn-outline" onClick={() => { setResetModal({ email: u.email }); setResetSent(false) }}
                          style={{ padding: "5px 12px", fontSize: 11 }}>
                          🔑 Reset PW
                        </button>
                        <button className="btn btn-outline" onClick={() => deleteUser(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                          style={{ padding: "5px 10px", fontSize: 11, color: t.pendingRejectText, borderColor: t.pendingReject }}>
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ROOT ACCESS BLOCK MODAL ── */}
        {rootBlockModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setRootBlockModal(false) }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 32, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.35)", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: serif, marginBottom: 8 }}>Root Access Required</div>
              <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
                This account has root-level privileges and cannot be deleted from the Admin Panel.<br /><br />
                To remove this account, access the <strong style={{ color: t.text }}>Supabase Authentication dashboard</strong> directly using your project credentials.
              </div>
              <button className="btn btn-gold" onClick={() => setRootBlockModal(false)}>
                Understood
              </button>
            </div>
          </div>
        )}

        {/* ── RESET PASSWORD MODAL ── */}
        {resetModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setResetModal(null) }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 32, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: serif, marginBottom: 6 }}>Reset Password</div>
              <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
                Send a password reset link to:
              </div>
              <div style={{ background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: 6, padding: "10px 14px", fontSize: 14, color: t.text, fontWeight: 500, marginBottom: 20 }}>
                {resetModal.email}
              </div>
              {resetSent && (
                <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#2e7d32", marginBottom: 16, fontWeight: 500 }}>
                  ✅ Reset email sent! They will receive a link to set a new password.
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-outline" onClick={() => setResetModal(null)}>
                  Cancel
                </button>
                <button className="btn btn-gold" onClick={() => sendPasswordReset(resetModal.email)} disabled={resetSent}
                  style={{ opacity: resetSent ? 0.8 : 1, cursor: resetSent ? "default" : "pointer" }}>
                  {resetSent ? "✓ Sent" : "Send Reset Link"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PRICING TAB ── */}
        {tab === "pricing" && (
          <div className="admin-pricing-layout" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

            {/* Sidebar */}
            <div className="admin-pricing-sidebar" style={{ width: 210, flexShrink: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.gold, marginBottom: 10 }}>Tables</div>
                {TABLE_CONFIG.map(tc => (
                  <button key={tc.key} onClick={() => confirmIfDirty(() => setActiveTable(tc.key))} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 14px", borderRadius: 6, marginBottom: 4,
                    border: `1px solid ${activeTable === tc.key ? t.gold : t.border}`,
                    background: activeTable === tc.key ? (dark ? "#1F1A10" : "#FDF5E6") : t.card,
                    color: activeTable === tc.key ? t.gold : t.textMid,
                    fontWeight: activeTable === tc.key ? 600 : 400,
                    fontSize: 13, cursor: "pointer", fontFamily: font,
                    transition: "all 0.15s",
                  }}>
                    {tc.label}
                    <span style={{ float: "right", fontSize: 11, color: t.textMuted, fontWeight: 400 }}>
                      {pricing ? pricing[tc.key]?.length : "…"}
                    </span>
                  </button>
                ))}
              </div>

              <button onClick={resetToDefaults} style={{
                display: "block", width: "100%", padding: "8px 14px", borderRadius: 6,
                border: `1px solid ${dark ? "#5A2A28" : "#FCA5A5"}`,
                background: "transparent", color: dark ? "#E05C50" : "#991B1B",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, marginTop: 8,
              }}>
                ↺ Reset All to Defaults
              </button>
            </div>

            {/* Table area */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {pricing === null ? (
                <div style={{ color: t.textMuted, fontSize: 14, padding: 20 }}>Loading prices…</div>
              ) : (
                <div key={activeTable} className="admin-pricing-table-shell">
                  <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: t.text, fontFamily: serif }}>{activeCfg.label}</div>
                      <div style={{ fontSize: 13, color: t.textMuted, marginTop: 3 }}>{activeCfg.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {/* Download CSV */}
                      <button
                        onClick={() => downloadCSV(pricing[activeTable], activeCfg.columns, `EWP_${activeCfg.label.replace(/\s+/g, "_")}`)}
                        title="Download as CSV"
                        style={{
                          padding: "7px 14px", borderRadius: 6, border: `1px solid ${t.border}`,
                          background: t.card, color: t.textMid, fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 5,
                        }}>
                        ↓ CSV
                      </button>
                      {/* Download XLSX */}
                      <button
                        onClick={() => downloadXLSX(pricing[activeTable], activeCfg.columns, `EWP_${activeCfg.label.replace(/\s+/g, "_")}`)}
                        title="Download as Excel"
                        style={{
                          padding: "7px 14px", borderRadius: 6, border: `1px solid ${t.border}`,
                          background: t.card, color: t.textMid, fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 5,
                        }}>
                        ↓ Excel
                      </button>
                      {/* Upload */}
                      <input
                        ref={uploadRef} type="file" accept=".xlsx,.xls,.csv"
                        style={{ display: "none" }} onChange={handleUpload}
                      />
                      <button
                        onClick={() => uploadRef.current?.click()}
                        disabled={uploading}
                        title="Upload CSV or Excel to replace this table"
                        style={{
                          padding: "7px 14px", borderRadius: 6,
                          border: `1px solid ${t.gold}`,
                          background: dark ? "#1F1A10" : "#FDF5E6",
                          color: t.gold, fontSize: 12, fontWeight: 600,
                          cursor: uploading ? "not-allowed" : "pointer",
                          fontFamily: font, display: "flex", alignItems: "center", gap: 5,
                          opacity: uploading ? 0.6 : 1,
                        }}>
                        {uploading ? "Importing…" : "↑ Import"}
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8 }}>
                    {/* Header */}
                    <div style={{ display: "flex", background: t.headerBg, padding: "10px 16px", gap: 8 }}>
                      {activeCfg.columns.map(col => {
                        const isActive = sortTable === activeTable && sortCol?.key === col.key
                        return (
                          <div key={col.key} onClick={() => handleSort(col.key)} style={{
                            width: col.width, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.1em", color: isActive ? "#fff" : t.gold,
                            cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4,
                            transition: "color 0.15s",
                          }}>
                            {col.label}
                            <span style={{ fontSize: 9, opacity: isActive ? 1 : 0.45, letterSpacing: 0 }}>
                              {sortArrow(col.key)}
                            </span>
                          </div>
                        )
                      })}
                      <div style={{ width: 36 }} />
                    </div>

                    {/* Rows */}
                    {getSortedRows(pricing[activeTable]).map((row, rowIdx) => {
                      // find the real index in the unsorted array for edits/deletes
                      const realIdx = pricing[activeTable].indexOf(row)
                      return (
                        <div key={realIdx} style={{
                          display: "flex", alignItems: "center", padding: "6px 16px", gap: 8,
                          borderTop: `1px solid ${t.border}`,
                          background: rowIdx % 2 === 0 ? t.card : (dark ? "#161616" : "#FDFAF5"),
                        }}>
                          {activeCfg.columns.map(col => {
                            // Percent columns: stored as decimal (0.20), displayed as % (20)
                            const displayVal = col.type === "percent" && row[col.key] !== "" && row[col.key] != null
                              ? Math.round(row[col.key] * 10000) / 100
                              : (row[col.key] ?? "")
                            return (
                            <div key={col.key} style={{ width: col.width }}>
                              <input
                                type={col.type === "number" || col.type === "percent" ? "number" : "text"}
                                value={displayVal}
                                onChange={e => updateCell(activeTable, realIdx, col.key, e.target.value, col.type)}
                                step={col.type === "number" || col.type === "percent" ? "any" : undefined}
                                style={{
                                  width: "100%", padding: "5px 8px", borderRadius: 4,
                                  border: `1px solid transparent`, background: "transparent",
                                  color: t.text, fontSize: 13, fontFamily: font,
                                  outline: "none", transition: "border-color 0.15s, background 0.15s",
                                }}
                                onFocus={e => { e.target.style.borderColor = t.gold; e.target.style.background = dark ? "#1F1A10" : "#FFF8EE" }}
                                onBlur={e => {
                                  e.target.style.borderColor = "transparent"
                                  e.target.style.background = "transparent"
                                }}
                              />
                            </div>
                            )
                          })}
                          <div style={{ width: 36, display: "flex", justifyContent: "center" }}>
                            <button onClick={() => deleteRow(activeTable, realIdx)} title="Delete row"
                              style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#5A2A28" : "#DDA8A4", fontSize: 16, lineHeight: 1, padding: "2px 4px", borderRadius: 4, transition: "color 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.color = dark ? "#E05C50" : "#C0392B"}
                              onMouseLeave={e => e.currentTarget.style.color = dark ? "#5A2A28" : "#DDA8A4"}>
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Add row + Save */}
                    <div style={{ borderTop: `1px solid ${t.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                      <button className="btn btn-outline" onClick={() => addRow(activeTable)}
                        style={{ padding: "6px 16px", borderStyle: "dashed", borderColor: "var(--gold)", color: "var(--gold)" }}>
                        + Add Row
                      </button>
                      {dirty && (
                        <button className="btn btn-gold" onClick={savePricing} disabled={saving}
                          style={{ padding: "6px 18px", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                          {saving ? "Saving…" : "Save Changes"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 10, lineHeight: 1.6 }}>
                    Changes take effect for all users after saving. Existing estimates are not affected.
                    {" "}Import expects columns: <em>{activeCfg.columns.map(c => c.label).join(", ")}</em>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONTRACTORS TAB ── */}
        {tab === "contractors" && (
          <ContractorsTab />
        )}


        {/* ── TIME TRACKER TAB ── */}
        {tab === "timetracker" && (
          <TimeTrackerTab session={session} t={t} font={font} serif={serif} showToast={showToast} />
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)",
          background: dark ? "#1C1C1C" : "#2D2D2D", color: "#fff",
          padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          borderLeft: `3px solid ${t.gold}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── CONTRACTORS TAB ───────────────────────────────────────────
function ContractorsTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [newRow, setNewRow] = useState({ name: "", contact: "", email: "" })
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState("")

  const formatPhone = (raw) => {
    const isPhone = /^[\d\s()\-+]*$/.test(raw) && /\d/.test(raw)
    if (!isPhone) return raw
    const digits = raw.replace(/\D/g, "").slice(0, 10)
    if (digits.length === 0) return ""
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("contractors").select("*").order("name", { ascending: true })
    if (error) { setErr(error.message); }
    else { setList(data || []); setErr(""); }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addContractor = async () => {
    if (!newRow.name.trim()) return
    setAdding(true); setErr("")
    const { error } = await supabase.from("contractors").insert({
      name: newRow.name.trim(),
      contact: newRow.contact.trim() || null,
      email: newRow.email.trim() || null,
    })
    setAdding(false)
    if (error) { setErr(error.message); return }
    setNewRow({ name: "", contact: "", email: "" })
    load()
  }

  const updateField = async (id, field, val) => {
    setSavingId(id)
    const { error } = await supabase.from("contractors").update({ [field]: val || null }).eq("id", id)
    setSavingId(null)
    if (error) { setErr(error.message); return }
    setList(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  const removeContractor = async (id) => {
    if (!confirm("Remove this contractor? Existing projects keep their saved name.")) return
    const { error } = await supabase.from("contractors").delete().eq("id", id)
    if (error) { setErr(error.message); return }
    setList(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--char)", fontFamily: "var(--font-display)" }}>Contractors</div>
        <div style={{ fontSize: 13, color: "var(--mid)", marginTop: 4 }}>Manage the contractor list shown in the Project Details dropdown</div>
        <div style={{ height: 2, background: "var(--gold)", width: 48, marginTop: 12 }} />
      </div>

      {err && <div style={{ background: "rgba(184,59,46,0.08)", border: "1px solid rgba(184,59,46,0.25)", color: "#B83B2E", padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {/* Add new */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--ivory3)", borderRadius: 6, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 10 }}>Add Contractor</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr auto", gap: 10, alignItems: "center" }}>
          <input placeholder="Company name" value={newRow.name}
            onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
            style={inputStyle} />
          <input placeholder="Phone (optional)" value={newRow.contact}
            onChange={e => setNewRow(r => ({ ...r, contact: formatPhone(e.target.value) }))}
            style={inputStyle} />
          <input placeholder="Email (optional)" type="email" value={newRow.email}
            onChange={e => setNewRow(r => ({ ...r, email: e.target.value }))}
            style={inputStyle} />
          <button className="btn btn-gold" onClick={addContractor} disabled={!newRow.name.trim() || adding}
            style={{ whiteSpace: "nowrap" }}>
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--ivory3)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr auto", gap: 10, padding: "10px 16px", background: "var(--ivory2)", borderBottom: "1px solid var(--ivory3)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
          <span>Name</span><span>Phone</span><span>Email</span><span></span>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)", fontSize: 13 }}>No contractors yet — add one above.</div>
        ) : list.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr auto", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--ivory3)", alignItems: "center" }}>
            <input defaultValue={c.name}
              onBlur={e => e.target.value !== c.name && updateField(c.id, "name", e.target.value.trim())}
              style={inputStyle} />
            <input defaultValue={c.contact || ""}
              onBlur={e => { const v = formatPhone(e.target.value); e.target.value = v; if (v !== (c.contact||"")) updateField(c.id, "contact", v) }}
              style={inputStyle} />
            <input defaultValue={c.email || ""} type="email"
              onBlur={e => e.target.value !== (c.email||"") && updateField(c.id, "email", e.target.value.trim())}
              style={inputStyle} />
            <button onClick={() => removeContractor(c.id)} title="Delete"
              style={{ background: "transparent", border: "1px solid rgba(184,59,46,0.3)", color: "#B83B2E", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
              {savingId === c.id ? "…" : "🗑"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
        Edits save automatically when you click outside a field.
      </div>
    </div>
  )
}

const inputStyle = {
  padding: "7px 10px", borderRadius: 4, border: "1px solid var(--ivory3)",
  background: "var(--input-bg)", fontSize: 13, color: "var(--char)",
  fontFamily: "var(--font-body)",
}
