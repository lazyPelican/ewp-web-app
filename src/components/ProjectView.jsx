import React, { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../supabase.js"
import {
  ACTIVE_STAGES, getActiveStage, fmt, fmtDate, fmtId, calcTotal,
  calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall,
  SECTION_LABELS,
} from "../appUtils.js"
import { buildInternalPDFBlob, buildCustomerPDFBlob } from "../pdfExport.js"

const withPDFTimeout = (promise, ms = 20000) => {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("PDF preview took too long")), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export function ProjectView({ project, rooms, pricing, status, editIdx, preparedBy, isGuest, isAdmin, quoteOnly = false, onStageChange, onBack, onShowToast, onEmail }) {
  const projectId = project.id
  const currentStage = getActiveStage(status) || "drafting"
  const currentIdx = ACTIVE_STAGES.findIndex(s => s.key === currentStage)

  const [stageMeta, setStageMeta] = useState({})
  const [timeline, setTimeline] = useState([])
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingStage, setViewingStage] = useState(currentStage)
  const [newTaskLabel, setNewTaskLabel] = useState("")
  const [noteForm, setNoteForm] = useState({ open: false, title: "", body: "", type: "note" })
  const [pdfBusy, setPdfBusy] = useState(null)
  const [pdfViewer, setPdfViewer] = useState({ open: false, url: null, label: "" })
  const notesTimer = useRef(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { setViewingStage(currentStage) }, [currentStage])

  // ── Load data on mount ──
  useEffect(() => {
    if (isGuest || quoteOnly) { setLoading(false); return }
    const load = async () => {
      const [metaRes, timeRes, checkRes] = await Promise.all([
        supabase.from("project_stage_meta").select("*").eq("project_id", projectId),
        supabase.from("project_timeline").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("project_checklists").select("*").eq("project_id", projectId).order("sort_order"),
      ])
      if (!mounted.current) return
      const metaMap = {}
      ;(metaRes.data || []).forEach(r => { metaMap[r.stage_key] = r })
      setStageMeta(metaMap)
      setTimeline(timeRes.data || [])
      setChecklists(checkRes.data || [])
      if (!metaMap[currentStage]) {
        const now = new Date().toISOString()
        const { data } = await supabase.from("project_stage_meta").upsert({
          project_id: projectId, stage_key: currentStage, started_at: now, notes: ""
        }, { onConflict: "project_id,stage_key" }).select().single()
        if (data && mounted.current) setStageMeta(prev => ({ ...prev, [currentStage]: data }))
      }
      if (mounted.current) setLoading(false)
    }
    load()
  }, [projectId, isGuest, quoteOnly, currentStage])

  // ── Stage change handler ──
  const handleStageChange = async (newKey) => {
    if (quoteOnly) return
    if (newKey === currentStage) { setViewingStage(newKey); return }
    const newIdx = ACTIVE_STAGES.findIndex(s => s.key === newKey)
    const newLabel = ACTIVE_STAGES.find(s => s.key === newKey)?.label || newKey
    const oldLabel = ACTIVE_STAGES.find(s => s.key === currentStage)?.label || currentStage

    // Going backward — admin only
    if (newIdx < currentIdx) {
      if (!isAdmin) { onShowToast("Only an admin can move a project backward"); return }
      if (!window.confirm(`Move project back to "${newLabel}"?\n\nThis will revert the current stage. Are you sure?`)) return
    }

    // Going forward — only one step at a time
    if (newIdx > currentIdx + 1) {
      onShowToast("You can only advance one stage at a time")
      return
    }

    const goingBack = newIdx < currentIdx
    onStageChange(newKey)

    if (!isGuest) {
      const now = new Date().toISOString()
      if (goingBack) {
        const stagesToClear = ACTIVE_STAGES.slice(newIdx, currentIdx + 1).map(s => s.key)
        for (const sk of stagesToClear) {
          await supabase.from("project_stage_meta").upsert({
            project_id: projectId, stage_key: sk, completed_at: null
          }, { onConflict: "project_id,stage_key" })
        }
      } else {
        // Moving forward: mark old stage completed, set start on new stage
        await supabase.from("project_stage_meta").upsert({
          project_id: projectId, stage_key: currentStage, completed_at: now
        }, { onConflict: "project_id,stage_key" })
        await supabase.from("project_stage_meta").upsert({
          project_id: projectId, stage_key: newKey, started_at: now, notes: ""
        }, { onConflict: "project_id,stage_key" })
      }
      const { data: evt } = await supabase.from("project_timeline").insert({
        project_id: projectId, event_type: "stage_change",
        title: goingBack ? `Reverted to ${newLabel}` : `Moved to ${newLabel}`,
        metadata: { from_stage: currentStage, to_stage: newKey, from_label: oldLabel, to_label: newLabel },
        created_by: preparedBy,
      }).select().single()
      if (mounted.current) {
        setStageMeta(prev => {
          const updated = { ...prev }
          if (goingBack) {
            const stagesToClear = ACTIVE_STAGES.slice(newIdx, currentIdx + 1).map(s => s.key)
            stagesToClear.forEach(sk => { updated[sk] = { ...prev[sk], completed_at: null } })
          } else {
            updated[currentStage] = { ...prev[currentStage], completed_at: now }
            updated[newKey] = { ...prev[newKey], started_at: now }
          }
          return updated
        })
        if (evt) setTimeline(prev => [evt, ...prev])
      }
    }
    setViewingStage(newKey)
  }

  // ── Notes auto-save ──
  const saveNotes = useCallback(async (stageKey, text) => {
    if (isGuest || quoteOnly) return
    await supabase.from("project_stage_meta").upsert({
      project_id: projectId, stage_key: stageKey, notes: text
    }, { onConflict: "project_id,stage_key" })
  }, [projectId, isGuest, quoteOnly])

  const handleNotesChange = (stageKey, text) => {
    setStageMeta(prev => ({ ...prev, [stageKey]: { ...prev[stageKey], notes: text } }))
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveNotes(stageKey, text), 500)
  }

  // ── Checklist CRUD ──
  const addChecklistItem = async () => {
    const label = newTaskLabel.trim()
    if (!label) return
    setNewTaskLabel("")
    if (isGuest) {
      setChecklists(prev => [...prev, { id: Date.now(), project_id: projectId, stage_key: viewingStage, label, checked: false, sort_order: prev.length }])
      return
    }
    const { data } = await supabase.from("project_checklists").insert({
      project_id: projectId, stage_key: viewingStage, label, sort_order: checklists.filter(c => c.stage_key === viewingStage).length
    }).select().single()
    if (data && mounted.current) setChecklists(prev => [...prev, data])
  }

  const toggleChecklistItem = async (item) => {
    const newChecked = !item.checked
    setChecklists(prev => prev.map(c => c.id === item.id ? { ...c, checked: newChecked } : c))
    if (!isGuest) await supabase.from("project_checklists").update({ checked: newChecked }).eq("id", item.id)
  }

  const deleteChecklistItem = async (item) => {
    setChecklists(prev => prev.filter(c => c.id !== item.id))
    if (!isGuest) await supabase.from("project_checklists").delete().eq("id", item.id)
  }

  // ── Timeline CRUD ──
  const addTimelineEntry = async () => {
    const title = noteForm.title.trim()
    if (!title) return
    const entry = {
      project_id: projectId, event_type: noteForm.type,
      title, body: noteForm.body.trim(), created_by: preparedBy,
    }
    setNoteForm({ open: false, title: "", body: "", type: "note" })
    if (isGuest) {
      setTimeline(prev => [{ ...entry, id: Date.now(), created_at: new Date().toISOString() }, ...prev])
      return
    }
    const { data } = await supabase.from("project_timeline").insert(entry).select().single()
    if (data && mounted.current) setTimeline(prev => [data, ...prev])
  }

  const deleteTimelineEntry = async (evt) => {
    if (!window.confirm("Delete this activity entry?")) return
    setTimeline(prev => prev.filter(e => e.id !== evt.id))
    if (!isGuest) await supabase.from("project_timeline").delete().eq("id", evt.id)
  }

  const clearTimeline = async () => {
    if (!window.confirm("Clear all activity entries for this project? This cannot be undone.")) return
    setTimeline([])
    if (!isGuest) await supabase.from("project_timeline").delete().eq("project_id", projectId)
    onShowToast("Activity cleared")
  }

  // ── PDF handlers ──
  const handlePDF = async (type) => {
    if (pdfViewer.open && pdfViewer.label === type) {
      setPdfViewer({ open: false, url: null, label: "" })
      return
    }
    setPdfBusy(type)
    try {
      const blob = type === "internal"
        ? await withPDFTimeout(buildInternalPDFBlob(project, rooms, preparedBy, pricing))
        : await withPDFTimeout(buildCustomerPDFBlob(project, rooms, preparedBy, pricing))
      const url = URL.createObjectURL(blob);
      if (mounted.current) setPdfViewer({ open: true, url, label: type })
    } catch { onShowToast("PDF generation failed") }
    if (mounted.current) setPdfBusy(null)
  }

  // ── Derived data ──
  const total = calcTotal({ project, rooms }, pricing)
  const stageChecks = checklists.filter(c => c.stage_key === viewingStage)
  const meta = stageMeta[viewingStage] || {}
  const fmtTs = (ts) => {
    if (!ts) return "—"
    const d = new Date(ts)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }

  if (loading) return <div className="pv-container" style={{ textAlign: "center", padding: 80 }}>Loading project...</div>

  return (
    <div className="pv-container">
      {/* ── HEADER + SCOPE OF WORK ── */}
      <div className="pv-header">
        <div className="pv-header-top">
          <h2 className="pv-header-title">{project.name}</h2>
          <span className="pv-header-id">{fmtId(project.id)}</span>
          <div className="pv-header-actions">
            <button className={`btn btn-sm${pdfViewer.open && pdfViewer.label === "internal" ? " btn-gold" : ""}`} onClick={() => handlePDF("internal")} disabled={!!pdfBusy}>
              {pdfBusy === "internal" ? "Generating..." : pdfViewer.open && pdfViewer.label === "internal" ? "Hide Quote" : "View Quote"}
            </button>
          </div>
        </div>
        <div className="pv-details-grid">
          <div className="pv-detail-card">
            <div><div className="pv-detail-label">Contact</div><div className="pv-detail-value">{project.contactName || "—"}</div></div>
          </div>
          <div className="pv-detail-card">
            <div><div className="pv-detail-label">Address</div><div className="pv-detail-value">{project.address || "—"}</div></div>
          </div>
          <div className="pv-detail-card">
            <div><div className="pv-detail-label">Quote Total</div><div className="pv-detail-value pv-detail-value--big">{fmt(total)}</div></div>
          </div>
          <div className="pv-detail-card">
            <div><div className="pv-detail-label">Rooms</div><div className="pv-detail-value">{rooms.length}</div></div>
          </div>
          <div className="pv-detail-card">
            <div><div className="pv-detail-label">Bid Date</div><div className="pv-detail-value">{fmtDate(project.bidDate) || "—"}</div></div>
          </div>
          {project.contactPhone && (
            <div className="pv-detail-card">
              <div><div className="pv-detail-label">Phone</div><div className="pv-detail-value">{project.contactPhone}</div></div>
            </div>
          )}
        </div>

        {/* Scope of Work — compact per-room summary */}
        <div className="pv-scope">
          <label className="pv-label" style={{ marginTop: 14 }}>Scope of Work</label>
          <table className="pv-scope-table">
            <thead><tr><th>Room</th><th>Cabinetry</th><th>Upgrades</th><th>Countertops</th><th>Finishing</th><th>Install</th></tr></thead>
            <tbody>
              {rooms.map((room, ri) => {
                const cabCount = (room.cabinetry || []).filter(c => c.product).reduce((s, c) => s + (parseFloat(c.qty) || 0), 0)
                const upgCount = (room.upgrades || []).filter(u => u.upgrade).reduce((s, u) => s + (parseFloat(u.qty) || 0), 0)
                const ctpCount = (room.countertops || []).filter(c => c.product).reduce((s, c) => s + (parseFloat(c.qty) || 0), 0)
                const finLF = (room.finishing || []).filter(f => f.type).reduce((s, f) => s + (parseFloat(f.lf) || 0), 0)
                const inst = room.install?.type || ""
                return (
                  <tr key={room.id || ri}>
                    <td className="pv-scope-room-name">{room.name || `Room ${ri + 1}`}</td>
                    <td>{cabCount || "—"}</td>
                    <td>{upgCount || "—"}</td>
                    <td>{ctpCount || "—"}</td>
                    <td>{finLF ? `${finLF} LF` : "—"}</td>
                    <td>{inst && inst !== "No Install" ? inst : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── INLINE PDF VIEWER ── */}
      {pdfViewer.open && pdfViewer.url && (
        <div className="pv-pdf-viewer">
          <div className="pv-pdf-toolbar">
            <span className="pv-pdf-toolbar-label">{pdfViewer.label === "internal" ? "Internal Quote" : "Client Quote"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={pdfViewer.url} download={`${project.name || "quote"}-${pdfViewer.label}.pdf`} className="btn btn-sm">Download</a>
              <button className="btn btn-sm" onClick={() => setPdfViewer({ open: false, url: null, label: "" })}>Close</button>
            </div>
          </div>
          <div className="pv-pdf-wrap"><iframe src={pdfViewer.url} className="pv-pdf-frame" title="PDF Preview" /></div>
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      {!quoteOnly && (<>
      <div className="pv-progress">
        {ACTIVE_STAGES.map((s, i) => {
          const isCurrent = s.key === currentStage
          const isCompleted = i < currentIdx
          const isFuture = i > currentIdx
          const isViewing = s.key === viewingStage
          const canClick = (i === currentIdx + 1) || (i < currentIdx && isAdmin) || isCurrent
          return (
            <div key={s.key} className={`pv-progress-step${isCurrent ? " pv-progress-step--active" : ""}${isCompleted ? " pv-progress-step--completed" : ""}${isFuture ? " pv-progress-step--future" : ""}${isViewing ? " pv-progress-step--viewing" : ""}`}>
              {i > 0 && <div className={`pv-progress-line${i <= currentIdx ? " pv-progress-line--filled" : ""}`} />}
              <button
                className="pv-progress-dot"
                onClick={() => handleStageChange(s.key)}
                title={canClick ? `Move to ${s.label}` : i < currentIdx ? "Admin only" : "Complete previous stages first"}
                style={{ opacity: canClick ? 1 : 0.45, cursor: canClick ? "pointer" : "not-allowed" }}
              >
                {isCompleted ? "✓" : i + 1}
              </button>
              <button className="pv-progress-label" onClick={() => setViewingStage(s.key)} title={`View ${s.label} details`}>
                {s.label}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="pv-body">
        {/* LEFT: Stage Detail */}
        <div className="pv-left">
          <div className="pv-stage-panel">
            <h3 className="pv-panel-title">
              {ACTIVE_STAGES.find(s => s.key === viewingStage)?.label || viewingStage}
              {viewingStage !== currentStage && <span className="pv-panel-badge">Viewing</span>}
              {viewingStage === currentStage && <span className="pv-panel-badge pv-panel-badge--active">Current</span>}
            </h3>
            <div className="pv-stage-dates">
              <div><span className="pv-date-label">Started</span> <span>{fmtTs(meta.started_at)}</span></div>
              {meta.completed_at && <div><span className="pv-date-label">Completed</span> <span>{fmtTs(meta.completed_at)}</span></div>}
            </div>
            <div className="pv-stage-notes">
              <label className="pv-label">Notes</label>
              <textarea
                className="pv-textarea"
                value={meta.notes || ""}
                onChange={e => handleNotesChange(viewingStage, e.target.value)}
                placeholder="Add notes for this stage..."
                rows={4}
              />
            </div>
            <div className="pv-checklist">
              <label className="pv-label">Checklist</label>
              {stageChecks.length === 0 && <div className="pv-empty">No tasks yet</div>}
              {stageChecks.map(item => (
                <div key={item.id} className="pv-checklist-item">
                  <label className="pv-check-label">
                    <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(item)} />
                    <span className={item.checked ? "pv-check-done" : ""}>{item.label}</span>
                  </label>
                  <button className="pv-check-delete" onClick={() => deleteChecklistItem(item)} title="Remove">×</button>
                </div>
              ))}
              <div className="pv-checklist-add">
                <input
                  className="pv-checklist-input"
                  value={newTaskLabel}
                  onChange={e => setNewTaskLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addChecklistItem()}
                  placeholder="Add a task..."
                />
                <button className="btn btn-sm btn-gold" onClick={addChecklistItem} disabled={!newTaskLabel.trim()}>Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Activity Timeline */}
        <div className="pv-right">
          <div className="pv-timeline-header">
            <h3 className="pv-panel-title">Activity</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {isAdmin && timeline.length > 0 && (
                <button className="btn btn-sm btn-ghost" onClick={clearTimeline} style={{ color: "#c33", fontSize: 12 }}>Clear All</button>
              )}
              <button className="btn btn-sm btn-gold" onClick={() => setNoteForm({ open: true, title: "", body: "", type: "note" })}>+ Add Note</button>
            </div>
          </div>

          {noteForm.open && (
            <div className="pv-timeline-form">
              <div className="pv-form-row">
                <select className="pv-type-select" value={noteForm.type} onChange={e => setNoteForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="note">Note</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <input className="pv-form-input" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" autoFocus />
              <textarea className="pv-form-textarea" value={noteForm.body} onChange={e => setNoteForm(f => ({ ...f, body: e.target.value }))} placeholder="Details (optional)" rows={2} />
              <div className="pv-form-actions">
                <button className="btn btn-sm btn-gold" onClick={addTimelineEntry} disabled={!noteForm.title.trim()}>Save</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setNoteForm({ open: false, title: "", body: "", type: "note" })}>Cancel</button>
              </div>
            </div>
          )}

          <div className="pv-timeline">
            {timeline.length === 0 && <div className="pv-empty">No activity yet</div>}
            {timeline.map(evt => (
              <div key={evt.id} className={`pv-timeline-entry pv-timeline-entry--${evt.event_type}`}>
                <div className="pv-timeline-dot" />
                <div className="pv-timeline-content">
                  <div className="pv-timeline-title">
                    {evt.event_type === "stage_change" && <span className="pv-timeline-icon">→</span>}
                    {evt.event_type === "milestone" && <span className="pv-timeline-icon">⚑</span>}
                    {evt.event_type === "note" && <span className="pv-timeline-icon">✎</span>}
                    {evt.title}
                    {isAdmin && (
                      <button className="pv-timeline-delete" onClick={() => deleteTimelineEntry(evt)} title="Delete entry">×</button>
                    )}
                  </div>
                  {evt.body && <div className="pv-timeline-body">{evt.body}</div>}
                  <div className="pv-timeline-meta">
                    {evt.created_by && <span>{evt.created_by}</span>}
                    <span>{fmtTs(evt.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>)}
    </div>
  )
}
