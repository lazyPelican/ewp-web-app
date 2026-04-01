import React, { useState, useEffect } from "react"
import ReactDOM from "react-dom/client"
import "./global.css"
import { supabase } from "./supabase.js"
import Auth from "./Auth.jsx"
import PendingApproval from "./PendingApproval.jsx"
import AdminPanel from "./AdminPanel.jsx"
import App from "./App.jsx"

function Root() {
  const [session, setSession] = useState(null)
  const [approvalStatus, setApprovalStatus] = useState(null) // null | "pending" | "approved" | "rejected"
  const [loading, setLoading] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem("ewp-theme") === "dark")

  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",").map(e => e.trim().toLowerCase())

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkApproval(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkApproval(session.user)
      else { setApprovalStatus(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = () => setDark(localStorage.getItem("ewp-theme") === "dark")
    window.addEventListener("storage", handler)
    window.addEventListener("ewp-theme-change", handler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener("ewp-theme-change", handler)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  const checkApproval = async (user) => {
    // Admins are always approved
    if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      setApprovalStatus("approved")
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("user_approvals")
      .select("status")
      .eq("user_id", user.id)
      .single()

    if (error || !data) {
      // First time sign-in — create a pending record
      await supabase.from("user_approvals").upsert({
        user_id: user.id,
        email: user.email,
        status: "pending",
        created_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      setApprovalStatus("pending")
    } else {
      setApprovalStatus(data.status)
    }

    setLoading(false)
  }

  const footer = (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "10px max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
        textAlign: "center",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "clamp(11px, 2.8vw, 14px)",
        color: dark ? "rgba(232, 226, 217, 0.72)" : "#9E9E9E",
        background: dark ? "rgba(20, 20, 20, 0.82)" : "rgba(253, 250, 245, 0.9)",
        backdropFilter: "blur(6px)",
        borderTop: dark ? "1px solid rgba(42, 42, 42, 0.8)" : "1px solid rgba(237, 232, 223, 0.8)",
        zIndex: 9999,
      }}
    >
      <div style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        lineHeight: 1.25,
        flexWrap: "wrap",
      }}>
        <a
          href="https://www.upwork.com/freelancers/~017990988818971adb?mp_source=share"
          target="_blank"
          rel="noreferrer"
          aria-label="Upwork profile: Bilal Ahmed"
          title="View Upwork profile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 999,
            textDecoration: "none",
            color: "inherit",
            border: dark ? "1px solid rgba(42, 42, 42, 0.9)" : "1px solid rgba(237, 232, 223, 0.95)",
            background: dark ? "rgba(28, 28, 28, 0.6)" : "rgba(255, 255, 255, 0.65)",
          }}
        >
          <span>Created by Bilal Ahmed</span>
          <span style={{ opacity: dark ? 0.55 : 0.6 }}>|</span>
          <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>NextGen Sheets</span>
          <span style={{ opacity: dark ? 0.55 : 0.6 }}>|</span>
          <img
            src="/upwork_light.png"
            alt="Upwork logo"
            aria-hidden="true"
            width={24}
            height={24}
            style={{ display: "block" }}
          />
        </a>
      </div>
    </div>
  )

  let content = null

  if (loading) {
    content = (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#FDFAF5",
        fontFamily: "'DM Sans', sans-serif", color: "#9E9E9E", fontSize: 14,
      }}>
        Loading…
      </div>
    )
  } else if (!session) {
    content = <Auth />
  } else if (approvalStatus === "pending") {
    content = <PendingApproval user={session.user} />
  } else if (approvalStatus === "rejected") {
    content = (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#FDFAF5",
        fontFamily: "'DM Sans', sans-serif", textAlign: "center",
      }}>
        <div style={{
          background: "#fff", border: "1px solid #EDE8DF", borderRadius: 12,
          padding: "48px 40px", width: 380,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🚫</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2D2D2D", marginBottom: 8 }}>
            Access Denied
          </div>
          <div style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, marginBottom: 28 }}>
            Your request for access ({session.user.email}) was not approved.
            Please contact your administrator.
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: "9px 20px", borderRadius: 6,
              border: "1px solid #EDE8DF", background: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: "#6B6B6B", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  } else {
    // Approved — show the app (with optional admin panel link for admins)
    const isAdmin = ADMIN_EMAILS.includes(session.user.email?.toLowerCase())
    content = showAdmin
      ? <AdminPanel currentUser={session.user} onBack={() => setShowAdmin(false)} />
      : <App session={session} isAdmin={isAdmin} onOpenAdmin={() => setShowAdmin(true)} />
  }

  return (
    <div style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      {content}
      {footer}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
