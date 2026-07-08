import React, { useState, useMemo } from "react"
import { fmt, fmtDate, fmtId, calcTotal, isRoomComplete, ACTIVE_STAGES, isActiveStatus, getActiveStage, isClosedStatus } from "../appUtils.js"

export function Dashboard({ projects, pricing, isAdmin, onNew, onOpen, onDelete, onDuplicate, onConfirm, onUpdateStage, onCloseProject, onGenerateQuote, onGenerateQuoteCustomer, onEmail, actionBusy, userName, initialView }) {
  const [dashView, setDashView] = useState(initialView || "hub") // "hub" | "quotations" | "drafts" | "completed" | "active" | "closed"
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState(null)

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return "Good morning";
    if (h >= 12 && h < 17) return "Good afternoon";
    if (h >= 17 && h < 21) return "Good evening";
    return "Welcome back";
  })();

  const allComplete = (p) => p.rooms.length > 0 && p.rooms.every(isRoomComplete);

  const { drafts, completed, active, closed } = useMemo(() => {
    const d = [], c = [], a = [], cl = [];
    projects.forEach(p => {
      if (isClosedStatus(p._status)) cl.push(p);
      else if (isActiveStatus(p._status)) a.push(p);
      else if (allComplete(p)) c.push(p);
      else d.push(p);
    });
    const sortByIdDesc = (arr) => [...arr].sort((a, b) => {
      const getIdTime = (id = '') => {
        if (id.startsWith('B-')) return '20' + id.slice(2).replace('-', '')
        if (id.startsWith('EWP')) return id.slice(3)
        return id
      }
      return getIdTime(b.project.id || '').localeCompare(getIdTime(a.project.id || ''))
    });
    return { drafts: sortByIdDesc(d), completed: sortByIdDesc(c), active: sortByIdDesc(a), closed: sortByIdDesc(cl) };
  }, [projects]);

  const quotationTotal = useMemo(() =>
    [...drafts, ...completed].reduce((s, p) => s + calcTotal(p, pricing), 0),
  [drafts, completed]);
  const activeTotal = useMemo(() =>
    active.reduce((s, p) => s + calcTotal(p, pricing), 0),
  [active]);

  const filterList = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      p.project.name.toLowerCase().includes(q) ||
      p.project.address.toLowerCase().includes(q) ||
      (p.project.contactName || '').toLowerCase().includes(q) ||
      (p.project.contactPhone || '').toLowerCase().includes(q) ||
      (p.project.id || '').toLowerCase().includes(q)
    );
  };

  // Universal search — searches across ALL buckets
  const universalResults = useMemo(() => {
    if (!search.trim()) return null;
    return {
      drafts: filterList(drafts),
      completed: filterList(completed),
      active: filterList(active),
      closed: filterList(closed),
    };
  }, [search, drafts, completed, active, closed]);

  const goSection = (view) => { setDashView(view); setSearch(""); setStageFilter(null); };

  // ── Hero banner (shared) ──
  const renderHero = () => (
    <div className="dash-hero-banner">
      <div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" /><div className="dash-hero-slide" />
      <div className="dash-hero-overlay" />
      <div className="dash-hero-title">Estimate Manager</div>
      <div className="dash-hero-tagline">{greeting}, {userName || "–"}</div>
      <div className="dash-hero-content">
        <button className="btn btn-gold btn-lg dash-new-btn" onClick={onNew}>+ New Estimate</button>
      </div>
    </div>
  );

  // ── Card renderer ──
  const renderCard = (p, i, { section } = {}) => {
    const gt = calcTotal(p, pricing);
    const complete = allComplete(p);
    const realIdx = projects.indexOf(p);
    const isActive = isActiveStatus(p._status);
    const isClosed = isClosedStatus(p._status);

    let badgeCls = "pcard-status--draft";
    let badgeText = "○ Draft";
    if (isClosed) { badgeCls = "pcard-status--closed"; badgeText = "✓ Closed"; }
    else if (isActive) {
      badgeCls = "pcard-status--active";
      const stage = ACTIVE_STAGES.find(s => s.key === getActiveStage(p._status));
      badgeText = stage ? stage.label : "Active";
    }
    else if (complete) { badgeCls = "pcard-status--done"; badgeText = "✓ Complete"; }

    return (
      <div key={p.project.id || i} className="project-card" onClick={() => onOpen(realIdx)}
        style={{ animationDelay: `${i * 0.06}s` }}
        role="button" tabIndex={0}
        aria-label={`Open estimate: ${p.project.name}`}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && onOpen(realIdx)}>

        <div className="pcard-status-row">
          <span className={`pcard-status ${badgeCls}`}>{badgeText}</span>
          <span className="pcard-id">{fmtId(p.project.id)}</span>
        </div>

        <div className="pcard-name">{p.project.name}</div>
        <div className="pcard-total-row">
          <div className="pcard-total">{fmt(gt)}</div>
        </div>
        {section === "completed" && (
          <button className="pcard-confirm-btn" style={{ marginTop: 6, width: "100%" }} onClick={e => {
            e.stopPropagation();
            if (window.confirm("Marking this quote as Under Contract will finalize it.\n\nUnder Contract quotes become read-only (view & print only).\n\nProceed?")) {
              onConfirm(realIdx);
            }
          }}>Mark as Under Contract</button>
        )}

        {/* Close button for active jobs */}
        {section === "active" && isActive && (
          <div className="pcard-stage-row" onClick={e => e.stopPropagation()}>
            <button className="pcard-archive-btn" onClick={() => onCloseProject(realIdx)}>
              Close
            </button>
          </div>
        )}

        <div className="pcard-meta">
          {p.project.contactName && <span className="pcard-pill">{p.project.contactName}</span>}
          <span className="pcard-pill">{p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}</span>
          <span className="pcard-pill">{fmtDate(p.project.bidDate)}</span>
          {p._updatedAt && <span className="pcard-pill">Updated {fmtDate(p._updatedAt.slice(0, 10))}</span>}
        </div>

        <div className="pcard-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`pcard-act-btn ${complete || isActive || isClosed ? "pcard-act--primary" : ""}`}
            disabled={!complete && !isActive && !isClosed}
            aria-disabled={!complete && !isActive && !isClosed}
            title={complete || isActive || isClosed ? "Internal PDF" : "Complete all rooms first"}
            onClick={() => (complete || isActive || isClosed) && onGenerateQuote(realIdx)}>
            Internal
          </button>
          <button
            className={`pcard-act-btn ${complete || isActive || isClosed ? "pcard-act--gold" : ""}`}
            disabled={!complete && !isActive && !isClosed}
            aria-disabled={!complete && !isActive && !isClosed}
            title={complete || isActive || isClosed ? "Client PDF" : "Complete all rooms first"}
            onClick={() => (complete || isActive || isClosed) && onGenerateQuoteCustomer(realIdx)}>
            Client
          </button>
          {section !== "active" && section !== "closed" && (
            <button className="pcard-act-btn" disabled={actionBusy}
              aria-disabled={actionBusy}
              onClick={() => !actionBusy && onDuplicate(realIdx)} title="Duplicate">
              Copy
            </button>
          )}
          {(section !== "active" && section !== "closed") || isAdmin ? (
            <button className="pcard-act-btn pcard-act--danger" disabled={actionBusy}
              aria-disabled={actionBusy}
              onClick={() => !actionBusy && onDelete(realIdx)} title="Delete">
              Delete
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  // Section header with back button
  const renderSectionHeader = (title, subtitle, backTo) => (
    <div style={{ marginBottom: 20 }}>
      <button className="dash-back-btn" onClick={() => goSection(backTo || "hub")}>Back</button>
      <div className="dash-section-title" style={{ marginBottom: 4 }}>{title}</div>
      {subtitle && <div className="dash-section-sub">{subtitle}</div>}
    </div>
  );

  const renderSearch = (count, label) => (
    <div className="dash-search-row">
      <div className="dash-search-wrap">
        <span className="dash-search-icon">Search</span>
        <input className="dash-search-input" placeholder={`Search ${label}...`} value={search} onChange={e => setSearch(e.target.value)} aria-label={`Search ${label}`} />
      </div>
      <div className="dash-result-count">{count} {count === 1 ? "project" : "projects"}</div>
    </div>
  );

  // ── DRAFTS VIEW ──
  if (dashView === "drafts") {
    const filteredDrafts = filterList(drafts);
    return (
      <div>
        {renderHero()}
        <div className="dash-below-hero">
          {renderSectionHeader("Drafts", `${drafts.length} in-progress quotes`, "quotations")}
          {renderSearch(filteredDrafts.length, "drafts")}
          {filteredDrafts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">{search ? "No results found" : "No drafts yet"}</div>
              <div className="empty-hint">{search ? "Try a different search term or check the spelling." : "Start a new estimate to begin pricing a project. You can save and come back anytime."}</div>
              {!search && <button className="btn btn-gold" onClick={onNew}>+ Create First Estimate</button>}
            </div>
          ) : (
            <div className="project-card-grid">
              {filteredDrafts.map((p, i) => renderCard(p, i, { section: "drafts" }))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── COMPLETED VIEW ──
  if (dashView === "completed") {
    const filteredCompleted = filterList(completed);
    return (
      <div>
        {renderHero()}
        <div className="dash-below-hero">
          {renderSectionHeader("Quotes Ready for Clients", `${completed.length} ready for review`, "quotations")}
          {renderSearch(filteredCompleted.length, "completed quotes")}
          {filteredCompleted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">{search ? "No results found" : "No completed quotes"}</div>
              <div className="empty-hint">{search ? "Try a different search term or check the spelling." : "Once every room in an estimate is filled out, it appears here ready for client review."}</div>
            </div>
          ) : (
            <div className="project-card-grid">
              {filteredCompleted.map((p, i) => renderCard(p, i, { section: "completed" }))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── QUOTATIONS HUB (sub-cards for Drafts and Completed) ──
  if (dashView === "quotations") {
    const allQuotations = [...drafts, ...completed];
    const filteredQuotations = filterList(allQuotations);
    const fDrafts = filterList(drafts);
    const fCompleted = filterList(completed);
    const hasSearch = search.trim().length > 0;

    return (
      <div>
        {renderHero()}
        <div className="dash-below-hero">
          {renderSectionHeader("Quotations", `${drafts.length + completed.length} total quotes`)}
          {renderSearch(filteredQuotations.length, "quotations")}
          {hasSearch ? (
            filteredQuotations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No results found</div>
                <div className="empty-hint">Try a different search term or check the spelling.</div>
              </div>
            ) : (
              <>
                {fCompleted.length > 0 && (
                  <>
                    <div className="dash-subsection-title">Quotes Ready for Clients ({fCompleted.length})</div>
                    <div className="project-card-grid">
                      {fCompleted.map((p, i) => renderCard(p, i, { section: "completed" }))}
                    </div>
                  </>
                )}
                {fDrafts.length > 0 && (
                  <>
                    <div className="dash-subsection-title">Drafts ({fDrafts.length})</div>
                    <div className="project-card-grid">
                      {fDrafts.map((p, i) => renderCard(p, i, { section: "drafts" }))}
                    </div>
                  </>
                )}
              </>
            )
          ) : (
          <div className="dash-hub-grid">
            <div className="dash-hub-card" onClick={() => goSection("drafts")} role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && goSection("drafts")}>
              <span className="dash-hub-icon">✏️</span>
              <div className="dash-hub-title">Drafts</div>
              <div className="dash-hub-count">{drafts.length}</div>
              <div className="dash-hub-sub">
                {drafts.length} in-progress quote{drafts.length !== 1 ? "s" : ""}
              </div>
              <span className="dash-hub-arrow">→</span>
            </div>
            <div className="dash-hub-card" onClick={() => goSection("completed")} role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && goSection("completed")}>
              <span className="dash-hub-icon">✅</span>
              <div className="dash-hub-title">Quotes Ready for Clients</div>
              <div className="dash-hub-count">{completed.length}</div>
              <div className="dash-hub-sub">
                {completed.length} ready for review
                {quotationTotal > 0 && <><br />{fmt(quotationTotal)} total value</>}
              </div>
              <span className="dash-hub-arrow">→</span>
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  // ── UNDER CONTRACT VIEW ──
  if (dashView === "active") {
    const searchFiltered = filterList(active);
    const filteredActive = stageFilter
      ? searchFiltered.filter(p => getActiveStage(p._status) === stageFilter)
      : searchFiltered;
    const stageCounts = {};
    ACTIVE_STAGES.forEach(s => { stageCounts[s.key] = searchFiltered.filter(p => getActiveStage(p._status) === s.key).length });
    return (
      <div>
        {renderHero()}
        <div className="dash-below-hero">
          {renderSectionHeader("Under Contract", `${active.length} active jobs — ${fmt(activeTotal)} total`)}
          {renderSearch(filteredActive.length, "active jobs")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setStageFilter(null)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${!stageFilter ? "var(--gold)" : "var(--border)"}`,
                background: !stageFilter ? "var(--gold-bg)" : "transparent",
                color: !stageFilter ? "var(--gold)" : "var(--muted)",
                transition: "all 0.15s",
              }}
            >All ({searchFiltered.length})</button>
            {ACTIVE_STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => setStageFilter(stageFilter === s.key ? null : s.key)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${stageFilter === s.key ? "var(--gold)" : "var(--border)"}`,
                  background: stageFilter === s.key ? "var(--gold-bg)" : "transparent",
                  color: stageFilter === s.key ? "var(--gold)" : "var(--muted)",
                  opacity: stageCounts[s.key] === 0 ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >{s.label} ({stageCounts[s.key]})</button>
            ))}
          </div>
          {filteredActive.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">{search || stageFilter ? "No results found" : "No active jobs"}</div>
              <div className="empty-hint">
                {search || stageFilter ? "Try a different search or clear the stage filter." : "When a quote is approved, move it to Under Contract to track its progress through production."}
              </div>
            </div>
          ) : (
            <div className="project-card-grid">
              {filteredActive.map((p, i) => renderCard(p, i, { section: "active" }))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CLOSED VIEW ──
  if (dashView === "closed") {
    const filteredClosed = filterList(closed);
    return (
      <div>
        {renderHero()}
        <div className="dash-below-hero">
          {renderSectionHeader("Closed / History", `${closed.length} archived jobs`)}
          {renderSearch(filteredClosed.length, "closed jobs")}
          {filteredClosed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">{search ? "No results found" : "No closed jobs yet"}</div>
              <div className="empty-hint">
                {search ? "Try a different search term or check the spelling." : "Completed jobs from Under Contract are archived here for your records."}
              </div>
            </div>
          ) : (
            <div className="project-card-grid">
              {filteredClosed.map((p, i) => renderCard(p, i, { section: "closed" }))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── HUB VIEW (default) ──
  const universalTotal = universalResults
    ? universalResults.drafts.length + universalResults.completed.length + universalResults.active.length + universalResults.closed.length
    : 0;

  return (
    <div>
      {renderHero()}
      <div className="dash-below-hero">
        {/* Universal search bar */}
        <div className="dash-search-row" style={{ marginBottom: 20 }}>
          <div className="dash-search-wrap">
            <span className="dash-search-icon">🔍</span>
            <input className="dash-search-input" placeholder="Search all quotes…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search all quotes" />
          </div>
          {search.trim() && <div className="dash-result-count">{universalTotal} result{universalTotal !== 1 ? "s" : ""}</div>}
        </div>

        {/* If searching, show universal results */}
        {universalResults ? (
          universalTotal === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No results found</div>
              <div className="empty-hint">Try a different search term or check the spelling.</div>
            </div>
          ) : (
            <>
              {universalResults.drafts.length > 0 && (
                <>
                  <div className="dash-subsection-title">Drafts ({universalResults.drafts.length})</div>
                  <div className="project-card-grid">
                    {universalResults.drafts.map((p, i) => renderCard(p, i, { section: "drafts" }))}
                  </div>
                </>
              )}
              {universalResults.completed.length > 0 && (
                <>
                  <div className="dash-subsection-title">Quotes Ready for Clients ({universalResults.completed.length})</div>
                  <div className="project-card-grid">
                    {universalResults.completed.map((p, i) => renderCard(p, i, { section: "completed" }))}
                  </div>
                </>
              )}
              {universalResults.active.length > 0 && (
                <>
                  <div className="dash-subsection-title">Under Contract ({universalResults.active.length})</div>
                  <div className="project-card-grid">
                    {universalResults.active.map((p, i) => renderCard(p, i, { section: "active" }))}
                  </div>
                </>
              )}
              {universalResults.closed.length > 0 && (
                <>
                  <div className="dash-subsection-title">Closed ({universalResults.closed.length})</div>
                  <div className="project-card-grid">
                    {universalResults.closed.map((p, i) => renderCard(p, i, { section: "closed" }))}
                  </div>
                </>
              )}
            </>
          )
        ) : (
          /* Hub cards */
          <div className="dash-hub-grid">
            {/* Quotations */}
            <div className="dash-hub-card" onClick={() => goSection("quotations")} role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && goSection("quotations")}>
              <span className="dash-hub-icon">📝</span>
              <div className="dash-hub-title">Quotations</div>
              <div className="dash-hub-count">{drafts.length + completed.length}</div>
              <div className="dash-hub-sub">
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""} · {completed.length} completed
                {quotationTotal > 0 && <><br />{fmt(quotationTotal)} total value</>}
              </div>
              <span className="dash-hub-arrow">→</span>
            </div>

            {/* Under Contract */}
            <div className="dash-hub-card" onClick={() => goSection("active")} role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && goSection("active")}>
              <span className="dash-hub-icon">🏗️</span>
              <div className="dash-hub-title">Under Contract</div>
              <div className="dash-hub-count">{active.length}</div>
              <div className="dash-hub-sub">
                {active.length} active job{active.length !== 1 ? "s" : ""}
                {activeTotal > 0 && <><br />{fmt(activeTotal)} total value</>}
              </div>
              <span className="dash-hub-arrow">→</span>
            </div>

            {/* Closed */}
            <div className="dash-hub-card" onClick={() => goSection("closed")} role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && goSection("closed")}>
              <span className="dash-hub-icon">🗄️</span>
              <div className="dash-hub-title">Closed / History</div>
              <div className="dash-hub-count">{closed.length}</div>
              <div className="dash-hub-sub">
                {closed.length} archived job{closed.length !== 1 ? "s" : ""}
              </div>
              <span className="dash-hub-arrow">→</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

