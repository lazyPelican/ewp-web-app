import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase.js"
import { DEFAULT_PRICING } from "./pricing.js"
import { sanitizeName, sanitizeText, sanitizeNumeric, sanitizeEmail, isValidEmail } from "./sanitize.js"
import { logError } from "./logger.js"
import { BugReportsTab } from "./BugReports.jsx"
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
        <button onClick={onBack} style={{ marginTop: 24, padding: "8px 20px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: "pointer", fontFamily: font }}>← Back</button>
      </div>
    )
  }

  const pending  = users.filter(u => u.status === "pending")
  const reviewed = users.filter(u => u.status !== "pending")
  const activeCfg = TABLE_CONFIG.find(tc => tc.key === activeTable)

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: font }}>
      <style>{`body { margin: 0; padding: 0; background: ${t.bg}; }`}</style>

      {/* Top bar - matching main app header */}
      <div 
        className="admin-topbar"
        style={{
          background: dark ? "#12141A" : "#1F242E",
          borderBottom: "none",
          padding: "0 56px",
          height: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <style>{`
          @keyframes adminFadeDown {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes adminFadeUp {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes adminSlideRight {
            from { opacity: 0; transform: translateX(-14px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes adminScaleIn {
            from { opacity: 0; transform: scale(0.96); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes adminGoldPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(91,140,90,0); }
            50%       { box-shadow: 0 0 0 4px rgba(91,140,90,0.18); }
          }

          /* Header entrance */
          .admin-topbar { animation: adminFadeDown 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

          /* Tab bar slides in from left */
          .admin-tab-bar { animation: adminSlideRight 0.4s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both; }

          /* Main content fades up */
          .admin-main-inner { animation: adminFadeUp 0.45s 0.12s cubic-bezier(0.22, 1, 0.36, 1) both; }

          /* User rows stagger in */
          .admin-user-row { animation: adminFadeUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
          .admin-user-row:nth-child(1) { animation-delay: 0.05s; }
          .admin-user-row:nth-child(2) { animation-delay: 0.10s; }
          .admin-user-row:nth-child(3) { animation-delay: 0.15s; }
          .admin-user-row:nth-child(4) { animation-delay: 0.20s; }
          .admin-user-row:nth-child(5) { animation-delay: 0.25s; }
          .admin-user-row:nth-child(6) { animation-delay: 0.30s; }

          /* Pricing table scales in */
          .admin-pricing-table-shell { overflow: hidden; animation: adminScaleIn 0.4s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both; }

          /* Active tab pulse */
          .admin-tab-active { animation: adminGoldPulse 2.5s 0.5s ease-in-out infinite; }

          @media (max-width: 900px) {
            .admin-topbar {
              padding: 10px 14px !important;
              height: auto !important;
              min-height: 72px;
              flex-wrap: wrap;
              row-gap: 10px;
            }
            .admin-topbar > div:first-child {
              gap: 12px !important;
              min-width: 0;
              flex: 1 1 auto;
            }
            .admin-header-name {
              font-size: clamp(18px, 4.5vw, 28px) !important;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .admin-header-logo { height: 48px !important; }
            .admin-tab-bar { top: auto !important; position: relative !important; }
          }
          @media (max-width: 768px) {
            .admin-main-inner { padding: 16px 14px !important; }
            .admin-tab-bar { padding: 0 8px !important; flex-wrap: wrap; }
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
        <div style={{ display: "flex", alignItems: "center", gap: 22, cursor: "pointer" }} onClick={() => confirmIfDirty(onBack)}>
          <img
            src="/ewp-logo.png"
            alt="Engstrom Wood Products"
            style={{ height: 64, width: "auto", flexShrink: 0, filter: "brightness(0) invert(1)" }}
            className="admin-header-logo"
          />
          <div>
            <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.03em", lineHeight: 1 }} className="admin-header-name">Engstrom Wood Products</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 5, fontWeight: 500 }} className="admin-header-sub">Admin Panel</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => confirmIfDirty(onBack)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 16px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: font, fontWeight: 500 }}>
            ← Back to App
          </button>
        </div>
      </div>

      {/* Main tab bar */}
      <div className="admin-tab-bar" style={{ background: t.cardAlt, borderBottom: `1px solid ${t.border}`, padding: "0 32px", display: "flex", gap: 0, position: "sticky", top: 150, zIndex: 99 }}>
        {[["users", "👥 Users"], ["pricing", "💲 Pricing Tables"], ["contractors", "🏢 Contractors"], ["bugs", "🐛 Bug Reports"]].map(([key, label]) => (
          <button key={key} onClick={() => confirmIfDirty(() => setTab(key))} style={{
            padding: "14px 24px", border: "none", borderBottom: `3px solid ${tab === key ? t.gold : "transparent"}`,
            background: "transparent", color: tab === key ? t.text : t.textMuted,
            fontWeight: tab === key ? 600 : 400, fontSize: 14,
            cursor: "pointer", fontFamily: font, transition: "all 0.15s",
          }}>{label}</button>
        ))}
        {dirty && tab === "pricing" && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, paddingRight: 0 }}>
            <span style={{ fontSize: 12, color: "#E0C48A", fontStyle: "italic" }}>Unsaved changes</span>
          </div>
        )}
        {!(dirty && tab === "pricing") && <div style={{ marginLeft: "auto" }} />}
        <button onClick={() => confirmIfDirty(() => setTab("timetracker"))} style={{
          padding: "14px 24px", border: "none", borderBottom: `3px solid ${tab === "timetracker" ? t.gold : "transparent"}`,
          background: "transparent", color: tab === "timetracker" ? t.text : t.textMuted,
          fontWeight: tab === "timetracker" ? 600 : 400, fontSize: 14,
          cursor: "pointer", fontFamily: font, transition: "all 0.15s",
        }}>⏱ Time Tracker</button>
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
                <button onClick={addPreApproved} disabled={addingPreEmail || !newPreEmail.trim()}
                  style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: t.gold, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: addingPreEmail ? 0.6 : 1, fontFamily: font, whiteSpace: "nowrap" }}>
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
                    <button onClick={() => approve(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                      style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: t.pendingApprove, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: actionLoading === u.user_id ? 0.6 : 1, fontFamily: font }}>
                      Approve
                    </button>
                    <button onClick={() => reject(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                      style={{ padding: "7px 16px", borderRadius: 6, border: `1px solid ${t.pendingReject}`, background: "transparent", color: t.pendingRejectText, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: actionLoading === u.user_id ? 0.6 : 1, fontFamily: font }}>
                      Reject
                    </button>
                    <button onClick={() => deleteUser(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                      style={{ padding: "7px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: actionLoading === u.user_id ? 0.6 : 1, fontFamily: font }} title="Delete user">
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
                          <button onClick={() => approve(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                            style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${t.gold}`, background: "transparent", color: t.gold, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                            Re-approve
                          </button>
                        )}
                        <button onClick={() => { setResetModal({ email: u.email }); setResetSent(false) }}
                          style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.textMid, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                          🔑 Reset PW
                        </button>
                        <button onClick={() => deleteUser(u.user_id, u.email)} disabled={actionLoading === u.user_id}
                          style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.pendingReject}`, background: "transparent", color: t.pendingRejectText, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
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
              <button onClick={() => setRootBlockModal(false)}
                style={{ padding: "9px 28px", borderRadius: 7, border: "none", background: t.gold, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
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
                <button onClick={() => setResetModal(null)}
                  style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.textMid, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}>
                  Cancel
                </button>
                <button onClick={() => sendPasswordReset(resetModal.email)} disabled={resetSent}
                  style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: resetSent ? "#4caf50" : t.gold, color: "#fff", fontSize: 13, fontWeight: 600, cursor: resetSent ? "default" : "pointer", fontFamily: font, opacity: resetSent ? 0.8 : 1 }}>
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
                      <button onClick={() => addRow(activeTable)} style={{
                        background: "transparent", border: `1px dashed ${t.gold}`,
                        borderRadius: 6, padding: "6px 16px", cursor: "pointer",
                        color: t.gold, fontSize: 12, fontWeight: 600, fontFamily: font,
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        + Add Row
                      </button>
                      {dirty && (
                        <button onClick={savePricing} disabled={saving} style={{
                          padding: "6px 18px", borderRadius: 6, border: "none",
                          background: t.gold, color: "#fff", fontWeight: 600, fontSize: 12,
                          cursor: saving ? "not-allowed" : "pointer", fontFamily: font, opacity: saving ? 0.7 : 1,
                        }}>{saving ? "Saving…" : "Save Changes"}</button>
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

        {/* ── BUG REPORTS TAB ── */}
        {tab === "bugs" && (
          <BugReportsTab session={session} isAdmin={isAdmin} />
        )}

        {/* ── TIME TRACKER TAB ── */}
        {tab === "timetracker" && (
          <TimeTrackerTab session={session} t={t} font={font} serif={serif} showToast={showToast} />
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
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
