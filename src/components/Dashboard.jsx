import React, { useState } from "react"
import { fmt, fmtDate, fmtId, calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, isRoomComplete } from "../appUtils.js"

export function Dashboard({ projects, onNew, onOpen, onDelete, onDuplicate, onGenerateQuote, onGenerateQuoteCustomer, onEmail, actionBusy, userName }) {
  const [search, setSearch] = useState("");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return "Good morning";
    if (h >= 12 && h < 17) return "Good afternoon";
    if (h >= 17 && h < 21) return "Good evening";
    return "Welcome back";
  })();
  const filtered = projects
    .filter(p => {
      const q = search.toLowerCase()
      return (
        p.project.name.toLowerCase().includes(q) ||
        p.project.address.toLowerCase().includes(q) ||
        (p.project.contactName || '').toLowerCase().includes(q) ||
        (p.project.contactPhone || '').toLowerCase().includes(q) ||
        (p.project.id || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const getIdTime = (id = '') => {
        if (id.startsWith('B-')) return '20' + id.slice(2).replace('-', '')
        if (id.startsWith('EWP')) return id.slice(3)
        return id
      }
      return getIdTime(b.project.id || '').localeCompare(getIdTime(a.project.id || ''))
    })

  return (
    <div>
      {/* ── Hero Banner (full-bleed, blends with header) ── */}
      <div className="dash-hero-banner">
        <div className="dash-hero-tagline">
          Estimate Manager
          <span>New Age Technology • Old World Craftsmanship</span>
        </div>
        <div className="dash-hero-content">
          <div className="dash-hero-left">
            <span className="dash-greeting">{greeting},</span>
            <span className="dash-user">{userName || "–"}</span>
          </div>
          <button className="btn btn-gold btn-lg dash-new-btn" onClick={onNew}>+ New Estimate</button>
        </div>
      </div>

      {/* ── Below hero: search + cards ── */}
      <div className="dash-below-hero">
      {/* ── Search ── */}
      <div className="dash-search-row">
        <div className="dash-search-wrap">
          <span className="dash-search-icon">🔍</span>
          <input className="dash-search-input" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search estimates" />
        </div>
        <div className="dash-result-count">{filtered.length} {filtered.length === 1 ? "project" : "projects"}</div>
      </div>

      {/* ── Project cards ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">{projects.length === 0 ? "No estimates yet" : "No results found"}</div>
          <div style={{ marginBottom: 20, color: "var(--muted)", fontSize: 14 }}>{projects.length === 0 ? "Create your first estimate to get started." : "Try a different search."}</div>
          {projects.length === 0 && <button className="btn btn-gold" onClick={onNew}>+ Create First Estimate</button>}
        </div>
      ) : (
        <div className="project-card-grid">
          {filtered.map((p, i) => {
            const gt = p.rooms.reduce((rs, r) => {
              const cab = calcCabinetry(r.cabinetry);
              return rs + cab + calcUpgrades(r.upgrades) + calcCountertops(r.countertops) + calcFinishing(r.finishing) + calcInstall(r.install, cab);
            }, 0);
            const allComplete = p.rooms.every(isRoomComplete);
            const realIdx = projects.indexOf(p);
            return (
              <div key={i} className="project-card" onClick={() => onOpen(realIdx)}
                style={{ animationDelay: `${i * 0.06}s` }}
                role="button" tabIndex={0}
                aria-label={`Open estimate: ${p.project.name}`}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && onOpen(realIdx)}>

                {/* Status dot */}
                <div className="pcard-status-row">
                  <span className={`pcard-status ${allComplete ? "pcard-status--done" : "pcard-status--draft"}`}>
                    {allComplete ? "Complete" : "Draft"}
                  </span>
                  <span className="pcard-id">{fmtId(p.project.id)}</span>
                </div>

                {/* Name + total */}
                <div className="pcard-name">{p.project.name}</div>
                <div className="pcard-total">{fmt(gt)}</div>

                {/* Meta pills */}
                <div className="pcard-meta">
                  {p.project.contactName && <span className="pcard-pill">👤 {p.project.contactName}</span>}
                  <span className="pcard-pill">🏠 {p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}</span>
                  <span className="pcard-pill">📅 {fmtDate(p.project.bidDate)}</span>
                  {p._updatedAt && <span className="pcard-pill">✏️ {fmtDate(p._updatedAt.slice(0, 10))}</span>}
                </div>

                {/* Actions */}
                <div className="pcard-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className={`pcard-act-btn ${allComplete ? "pcard-act--primary" : ""}`}
                    disabled={!allComplete}
                    title={allComplete ? "Internal PDF" : "Complete all rooms first"}
                    onClick={() => allComplete && onGenerateQuote(realIdx)}>
                    📄 Internal
                  </button>
                  <button
                    className={`pcard-act-btn ${allComplete ? "pcard-act--gold" : ""}`}
                    disabled={!allComplete}
                    title={allComplete ? "Client PDF" : "Complete all rooms first"}
                    onClick={() => allComplete && onGenerateQuoteCustomer(realIdx)}>
                    📋 Client
                  </button>
                  <button className="pcard-act-btn" disabled={actionBusy}
                    onClick={() => !actionBusy && onDuplicate(realIdx)} title="Duplicate">
                    ⧉ Copy
                  </button>
                  <button className="pcard-act-btn pcard-act--danger" disabled={actionBusy}
                    onClick={() => !actionBusy && onDelete(realIdx)} title="Delete">
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>{/* end dash-below-hero */}
    </div>
  );
}
