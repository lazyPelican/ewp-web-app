import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase.js"

// ── ATTACHMENT PREVIEW ─────────────────────────────────────────
export function AttachmentPreview({ url }) {
  if (!url) return null;
  const lower = url.toLowerCase().split("?")[0];
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower);
  const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(lower);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-block", maxWidth: "85%" }}>
        <img src={url} alt="attachment" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 6, border: "1px solid var(--ivory3)", display: "block" }} />
      </a>
    );
  }
  if (isVideo) {
    return (
      <video src={url} controls style={{ maxWidth: "85%", maxHeight: 280, borderRadius: 6, border: "1px solid var(--ivory3)" }} />
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--gold)" }}>📎 View Attachment</a>
  );
}

// ── BUG REPORT MODAL ───────────────────────────────────────────
export function BugReportModal({ session, onClose }) {
  const [desc, setDesc] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const reporterName = [
    session?.user?.user_metadata?.first_name,
    session?.user?.user_metadata?.last_name,
  ].filter(Boolean).join(" ") || session?.user?.email?.split("@")[0] || "Unknown";
  const reporterEmail = session?.user?.email || "";

  const handleSubmit = async () => {
    if (!desc.trim()) return;
    setSubmitting(true);
    let attachmentUrl = null;
    if (attachment) {
      if (attachment.size > 50 * 1024 * 1024) { alert("File must be under 50 MB."); setSubmitting(false); return; }
      const ext = attachment.name.split(".").pop();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage.from("bug-attachments").upload(path, attachment);
      if (upErr) {
        console.error("Storage upload error:", upErr);
        alert("Attachment upload failed:\n" + (upErr.message || JSON.stringify(upErr)) + "\n\nReport will be submitted without attachment.");
      } else if (upData) {
        const { data: urlData } = supabase.storage.from("bug-attachments").getPublicUrl(path);
        attachmentUrl = urlData?.publicUrl || null;
      }
    }
    const { error } = await supabase.from("bug_reports").insert({
      reporter_name: reporterName, reporter_email: reporterEmail,
      user_id: session?.user?.id, description: desc.trim(),
      status: "open", attachment_url: attachmentUrl,
    });
    if (error) { console.error("Bug report insert error:", error); alert("Failed to submit:\n" + (error.message || JSON.stringify(error))); setSubmitting(false); return; }
    setDone(true); setSubmitting(false);
  };

  if (done) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-body" style={{ textAlign: "center", padding: "40px 32px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Report Submitted</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
            We'll review your report and get back to you shortly.
          </div>
          <button className="btn btn-gold" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">🐛 Report an Error</span>
          <button className="btn btn-ghost" style={{ color: "var(--muted)" }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <div className="field-label">Your Name</div>
              <div style={{ padding: "8px 12px", background: "var(--ivory2)", borderRadius: 4, fontSize: 13, border: "1px solid var(--ivory3)" }}>{reporterName}</div>
            </div>
            <div>
              <div className="field-label">Date</div>
              <div style={{ padding: "8px 12px", background: "var(--ivory2)", borderRadius: 4, fontSize: 13, border: "1px solid var(--ivory3)" }}>
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="field-label">Describe the issue <span style={{ color: "var(--red)" }}>*</span></div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What went wrong? What were you trying to do? What did you expect to happen?"
              rows={5} style={{
                width: "100%", padding: "10px 12px", borderRadius: 4, resize: "vertical",
                border: "1px solid var(--ivory3)", background: "var(--input-bg)",
                fontFamily: "var(--font-body)", fontSize: 13, color: "var(--char)", boxSizing: "border-box",
              }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="field-label">Screenshot or Screen Recording (optional)</div>
            <div style={{
              border: "2px dashed var(--ivory3)", borderRadius: 6, padding: "14px 16px",
              textAlign: "center", cursor: "pointer", background: "var(--ivory2)",
            }} onClick={() => fileRef.current?.click()}>
              {attachment ? (
                <div style={{ fontSize: 13 }}>
                  📎 <strong>{attachment.name}</strong>
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>({(attachment.size / 1024).toFixed(0)} KB)</span>
                  <button style={{ marginLeft: 12, background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13 }}
                    onClick={e => { e.stopPropagation(); setAttachment(null); }}>✕ Remove</button>
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  📁 Click to attach a screenshot or screen recording<br />
                  <span style={{ fontSize: 11 }}>PNG, JPG, GIF, MP4, WEBM — max 50 MB</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
              onChange={e => setAttachment(e.target.files[0] || null)} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={handleSubmit} disabled={!desc.trim() || submitting}>
              {submitting ? "⏳ Submitting…" : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BUG THREAD MODAL ───────────────────────────────────────────
export function BugThreadModal({ report, session, isAdmin, onClose, onStatusChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(report.status);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const senderName = isAdmin
    ? "EWP Admin"
    : [session?.user?.user_metadata?.first_name, session?.user?.user_metadata?.last_name]
        .filter(Boolean).join(" ") || session?.user?.email?.split("@")[0] || "User";

  const statusMeta = {
    open:        { bg: "rgba(184,59,46,0.12)",  border: "rgba(184,59,46,0.25)",  color: "#B83B2E", label: "Open" },
    in_progress: { bg: "rgba(160,122,58,0.12)", border: "rgba(160,122,58,0.25)", color: "#a07a3a", label: "In Progress" },
    resolved:    { bg: "rgba(42,107,64,0.12)",  border: "rgba(42,107,64,0.25)",  color: "#2A6B40", label: "Resolved" },
  };

  useEffect(() => { loadMessages(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase.from("bug_report_messages").select("*")
      .eq("report_id", report.id).order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!reply.trim() && !attachment) return;
    setSending(true);
    let attachmentUrl = null;
    if (attachment) {
      const ext = attachment.name.split(".").pop();
      const path = `${report.id}/${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage.from("bug-attachments").upload(path, attachment);
      if (upErr) {
        console.error("Storage upload error:", upErr);
        alert("Attachment upload failed:\n" + (upErr.message || JSON.stringify(upErr)));
      } else if (upData) {
        const { data: urlData } = supabase.storage.from("bug-attachments").getPublicUrl(path);
        attachmentUrl = urlData?.publicUrl || null;
      }
    }
    await supabase.from("bug_report_messages").insert({
      report_id: report.id, sender_name: senderName,
      sender_role: isAdmin ? "admin" : "user",
      message: reply.trim(), attachment_url: attachmentUrl,
    });
    if (isAdmin && currentStatus === "open") {
      await supabase.from("bug_reports").update({ status: "in_progress" }).eq("id", report.id);
      setCurrentStatus("in_progress");
      onStatusChange?.("in_progress");
    }
    setReply(""); setAttachment(null); setSending(false);
    loadMessages();
  };

  const changeStatus = async (s) => {
    await supabase.from("bug_reports").update({ status: s }).eq("id", report.id);
    setCurrentStatus(s);
    onStatusChange?.(s);
  };

  const sm = statusMeta[currentStatus] || statusMeta.open;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0, flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div className="modal-title">🐛 {report.reporter_name}</div>
            <button className="btn btn-ghost" style={{ color: "var(--muted)" }} onClick={onClose}>✕</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {new Date(report.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {report.reporter_email && ` · ${report.reporter_email}`}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, background: sm.bg, border: `1px solid ${sm.border}`, color: sm.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {sm.label}
            </span>
            {isAdmin && ["open","in_progress","resolved"].filter(s => s !== currentStatus).map(s => (
              <button key={s} onClick={() => changeStatus(s)} style={{
                fontSize: 10, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
                border: "1px solid var(--ivory3)", background: "transparent", color: "var(--muted)",
                fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>→ {statusMeta[s].label}</button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Original report bubble */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
              {report.reporter_name} · {new Date(report.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
            <div style={{ background: "var(--ivory2)", border: "1px solid var(--ivory3)", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 13, color: "var(--char)", lineHeight: 1.65, maxWidth: "85%", whiteSpace: "pre-wrap" }}>
              {report.description}
            </div>
            {report.attachment_url && <AttachmentPreview url={report.attachment_url} />}
          </div>

          {/* Messages */}
          {loading
            ? <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>Loading…</div>
            : messages.map(msg => {
                const mine = msg.sender_role === "admin";
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: mine ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                      {msg.sender_name} · {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div style={{
                      background: mine ? "rgba(160,122,58,0.12)" : "var(--ivory2)",
                      border: mine ? "1px solid rgba(160,122,58,0.28)" : "1px solid var(--ivory3)",
                      borderRadius: mine ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                      padding: "10px 14px", fontSize: 13, color: "var(--char)", lineHeight: 1.65, maxWidth: "85%", whiteSpace: "pre-wrap",
                    }}>{msg.message}</div>
                    {msg.attachment_url && <AttachmentPreview url={msg.attachment_url} />}
                  </div>
                );
              })
          }
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {currentStatus !== "resolved" ? (
          <div style={{ borderTop: "1px solid var(--ivory3)", padding: "12px 20px", flexShrink: 0 }}>
            <textarea value={reply} onChange={e => setReply(e.target.value)}
              placeholder={isAdmin ? "Type your response to the user…" : "Add a follow-up message…"}
              rows={3} style={{
                width: "100%", padding: "9px 12px", borderRadius: 4, resize: "none",
                border: "1px solid var(--ivory3)", background: "var(--input-bg)",
                fontFamily: "var(--font-body)", fontSize: 13, color: "var(--char)",
                boxSizing: "border-box", marginBottom: 8,
              }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button title="Attach file" onClick={() => fileRef.current?.click()} style={{
                background: "none", border: "1px solid var(--ivory3)", borderRadius: 4,
                padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--muted)",
                fontFamily: "var(--font-body)",
              }}>
                📎 {attachment ? attachment.name.slice(0, 18) + (attachment.name.length > 18 ? "…" : "") : "Attach"}
              </button>
              {attachment && (
                <button onClick={() => setAttachment(null)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 12 }}>✕</button>
              )}
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
                onChange={e => setAttachment(e.target.files[0] || null)} />
              <button className="btn btn-gold btn-sm" style={{ marginLeft: "auto" }}
                onClick={handleSend} disabled={(!reply.trim() && !attachment) || sending}>
                {sending ? "Sending…" : "Send ↵"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--ivory3)", padding: "12px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>
            ✅ This report has been resolved.
            {isAdmin && <button onClick={() => changeStatus("open")} style={{ marginLeft: 10, background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)" }}>Reopen</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MY REPORTS MODAL ───────────────────────────────────────────
export function MyReportsModal({ session, isAdmin, onClose }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const q = isAdmin
      ? supabase.from("bug_reports").select("*").order("created_at", { ascending: false })
      : supabase.from("bug_reports").select("*").eq("user_id", session?.user?.id).order("created_at", { ascending: false });
    const { data } = await q;
    setReports(data || []);
    setLoading(false);
  };

  const sm = {
    open:        { bg: "rgba(184,59,46,0.10)",  color: "#B83B2E", label: "Open" },
    in_progress: { bg: "rgba(160,122,58,0.10)", color: "#a07a3a", label: "In Progress" },
    resolved:    { bg: "rgba(42,107,64,0.10)",  color: "#2A6B40", label: "Resolved" },
  };

  if (selected) return (
    <BugThreadModal
      report={selected}
      session={session}
      isAdmin={isAdmin}
      onClose={() => { setSelected(null); loadReports(); }}
      onStatusChange={newStatus => setSelected(r => ({ ...r, status: newStatus }))}
    />
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <span className="modal-title">{isAdmin ? "📋 All Bug Reports" : "📋 My Error Reports"}</span>
          <button className="btn btn-ghost" style={{ color: "var(--muted)" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading
            ? <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
            : reports.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: 13 }}>No reports yet.</div>
              : reports.map(r => {
                  const s = sm[r.status] || sm.open;
                  return (
                    <div key={r.id} onClick={() => setSelected(r)} style={{ padding: "14px 20px", borderBottom: "1px solid var(--ivory3)", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--ivory2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--char)", marginBottom: 4 }}>
                            {r.description.length > 90 ? r.description.slice(0, 90) + "…" : r.description}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {isAdmin && <><strong style={{ color: "var(--char2)" }}>{r.reporter_name}</strong> · </>}
                            {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 10, background: s.bg, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })
          }
        </div>
      </div>
    </div>
  );
}

// ── BUG REPORTS TAB (for AdminPanel embed) ─────────────────────
export function BugReportsTab({ session, isAdmin }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const sm = {
    open:        { bg: "rgba(184,59,46,0.10)",  color: "#B83B2E", label: "Open" },
    in_progress: { bg: "rgba(160,122,58,0.10)", color: "#a07a3a", label: "In Progress" },
    resolved:    { bg: "rgba(42,107,64,0.10)",  color: "#2A6B40", label: "Resolved" },
  };

  const counts = {
    all: reports.length,
    open: reports.filter(r => r.status === "open").length,
    in_progress: reports.filter(r => r.status === "in_progress").length,
    resolved: reports.filter(r => r.status === "resolved").length,
  };

  const filtered = filter === "all" ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--char)", fontFamily: "var(--font-display)" }}>Bug Reports</div>
        <div style={{ fontSize: 13, color: "var(--mid)", marginTop: 4 }}>Review and respond to user-submitted error reports</div>
        <div style={{ height: 2, background: "var(--gold)", width: 48, marginTop: 12 }} />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all","All"],["open","Open"],["in_progress","In Progress"],["resolved","Resolved"]].map(([key,label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-body)",
            border: filter === key ? "1px solid var(--gold)" : "1px solid var(--ivory3)",
            background: filter === key ? "var(--gold-bg)" : "transparent",
            color: filter === key ? "var(--gold)" : "var(--mid)",
          }}>{label} <span style={{ opacity: 0.6 }}>({counts[key] || 0})</span></button>
        ))}
      </div>

      {/* List */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--ivory3)", borderRadius: 6, overflow: "hidden" }}>
        {loading
          ? <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
          : filtered.length === 0
            ? <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: 13 }}>No reports.</div>
            : filtered.map(r => {
                const s = sm[r.status] || sm.open;
                return (
                  <div key={r.id} onClick={() => setSelected(r)} style={{ padding: "14px 20px", borderBottom: "1px solid var(--ivory3)", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--ivory2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--char)", marginBottom: 4 }}>
                          {r.description.length > 110 ? r.description.slice(0, 110) + "…" : r.description}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          <strong style={{ color: "var(--char2)" }}>{r.reporter_name}</strong>
                          {r.reporter_email && ` · ${r.reporter_email}`}
                          {" · "}
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 10, background: s.bg, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })
        }
      </div>

      {selected && (
        <BugThreadModal
          report={selected}
          session={session}
          isAdmin={isAdmin}
          onClose={() => { setSelected(null); loadReports(); }}
          onStatusChange={newStatus => setSelected(r => ({ ...r, status: newStatus }))}
        />
      )}
    </div>
  );
}
