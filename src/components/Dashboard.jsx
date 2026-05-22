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

  const totalRevenue = projects.reduce((s, p) => {
    const gt = p.rooms.reduce((rs, r) => {
      const cab = calcCabinetry(r.cabinetry);
      return rs + cab + calcUpgrades(r.upgrades) + calcCountertops(r.countertops) + calcFinishing(r.finishing) + calcInstall(r.install, cab);
    }, 0);
    return s + gt;
  }, 0);

  return (
    <div>
      {/* ── Welcome Banner ── */}
      <div style={{
        textAlign: "center",
        padding: "52px 24px 40px",
        borderBottom: "1px solid var(--ivory3)",
        background: "linear-gradient(180deg, var(--ivory2) 0%, transparent 100%)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--muted)",
          fontFamily: "'DM Sans', sans-serif", marginBottom: 12,
          animation: "welcomeSubIn 0.55s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {greeting}
        </div>

        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(40px, 6.5vw, 72px)",
          fontWeight: 600, color: "var(--gold)",
          lineHeight: 1, letterSpacing: "0.05em",
          animation: "welcomeIn 0.75s 0.08s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {userName || "–"}
        </div>

        <div style={{
          height: 2,
          background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
          margin: "20px auto 0",
          animation: "welcomeLineGrow 0.65s 0.3s cubic-bezier(0.22,1,0.36,1) both",
          width: 72,
        }} />
      </div>

      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <div className="page-title">Projects</div>
            <div className="gold-rule" />
            <div className="page-subtitle">Engstrom Wood Products — Quote Management</div>
          </div>
          <button className="btn btn-gold btn-lg" onClick={onNew}>+ New Estimate</button>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        {[
          ["Total Projects", projects.length, "📋"],
          ["Active Estimates", projects.length, "📝"],
          ["Total Est. Value", fmt(totalRevenue), "💰"],
        ].map(([lbl, val, icon]) => (
          <div key={lbl} className="stat-card-anim" style={{
            background: "var(--card-bg)", border: "1px solid var(--ivory3)",
            borderRadius: 4, padding: "20px 24px",
            borderTop: "2px solid var(--gold)",
            boxShadow: "0 1px 6px rgba(20,15,5,0.04)",
            transition: "transform 0.22s ease, box-shadow 0.22s ease",
            cursor: "default",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(138,106,56,0.13)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 6px rgba(20,15,5,0.04)"; }}
          >
            <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.5 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "var(--char)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="dashboard-search-wrap" style={{ marginBottom: 16 }}>
        <input className="dashboard-search" placeholder="🔍  Search by project name, ID, client, phone, or address…" value={search} onChange={e => setSearch(e.target.value)}
          aria-label="Search estimates"
          style={{ background: "var(--card-bg)" }} />
      </div>

      {/* Project cards */}
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
                role="button" tabIndex={0}
                aria-label={`Open estimate: ${p.project.name}`}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && onOpen(realIdx)}>

                {/* Header */}
                <div style={{ marginBottom: 12 }}>
                  <div className="project-card-name">{p.project.name}</div>
                  <div className="project-card-id">{fmtId(p.project.id)}</div>
                </div>

                {/* Info grid */}
                <div className="project-card-info">
                  <div className="project-card-info-item">
                    <span className="project-card-label">Address</span>
                    <span className="project-card-value">{p.project.address || "—"}</span>
                  </div>
                  <div className="project-card-info-item">
                    <span className="project-card-label">Client</span>
                    <span className="project-card-value">{p.project.contactName || "—"}</span>
                  </div>
                  <div className="project-card-info-item">
                    <span className="project-card-label">Bid Date</span>
                    <span className="project-card-value">{fmtDate(p.project.bidDate)}</span>
                  </div>
                  <div className="project-card-info-item">
                    <span className="project-card-label">Rooms</span>
                    <span className="project-card-value">{p.rooms.length}</span>
                  </div>
                  <div className="project-card-info-item">
                    <span className="project-card-label">Prepared By</span>
                    <span className="project-card-value">{userName || "—"}</span>
                  </div>
                  <div className="project-card-info-item">
                    <span className="project-card-label">Last Modified</span>
                    <span className="project-card-value">{p._updatedAt ? fmtDate(p._updatedAt.slice(0, 10)) : "—"}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="project-card-total">{fmt(gt)}</div>

                {/* Actions */}
                <div className="project-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className={`btn ${allComplete ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: 10, padding: "5px 10px", opacity: allComplete ? 1 : 0.4, cursor: allComplete ? "pointer" : "not-allowed", flex: 1 }}
                    title={allComplete ? "Generate internal PDF quote" : "Complete all rooms to generate quote"}
                    aria-disabled={!allComplete}
                    onClick={() => allComplete && onGenerateQuote(realIdx)}>
                    📄 Internal Quote
                  </button>
                  <button
                    className={`btn ${allComplete ? "btn-gold" : "btn-outline"}`}
                    style={{ fontSize: 10, padding: "5px 10px", opacity: allComplete ? 1 : 0.4, cursor: allComplete ? "pointer" : "not-allowed", flex: 1 }}
                    title={allComplete ? "Generate customer PDF quote" : "Complete all rooms to generate quote"}
                    aria-disabled={!allComplete}
                    onClick={() => allComplete && onGenerateQuoteCustomer(realIdx)}>
                    📄 Client Quote
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 10, padding: "5px 10px", opacity: actionBusy ? 0.5 : 1, flex: 1 }}
                    title="Duplicate project"
                    disabled={actionBusy}
                    onClick={() => !actionBusy && onDuplicate(realIdx)}>
                    {actionBusy ? "…" : "⧉ Duplicate Project"}
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 10, padding: "5px 10px", color: "var(--red)", borderColor: "rgba(184,59,46,0.3)", opacity: actionBusy ? 0.5 : 1 }}
                    title="Delete project"
                    disabled={actionBusy}
                    onClick={() => !actionBusy && onDelete(realIdx)}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
