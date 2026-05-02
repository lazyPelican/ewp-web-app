import React, { useState, useEffect, Suspense, lazy } from "react"
import ReactDOM from "react-dom/client"
import "./global.css"
import { supabase } from "./supabase.js"
import ErrorBoundary from "./ErrorBoundary.jsx"
import { logError } from "./logger.js"

const Auth = lazy(() => import("./Auth.jsx"))
const PendingApproval = lazy(() => import("./PendingApproval.jsx"))
const AdminPanel = lazy(() => import("./AdminPanel.jsx"))
const App = lazy(() => import("./App.jsx"))

const suspenseFallback = (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FDFAF5",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: "#9E9E9E",
      fontSize: 14,
    }}
  >
    Loading…
  </div>
)

function Root() {
  const [session, setSession] = useState(null)
  const [approvalStatus, setApprovalStatus] = useState(null) // null | "pending" | "approved" | "rejected"
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem("ewp-theme") === "dark")

  // Browser back closes admin panel
  useEffect(() => {
    if (approvalStatus !== "approved") return
    window.history.pushState({ showAdmin }, "")
  }, [showAdmin, approvalStatus])
  useEffect(() => {
    const onPop = () => { if (showAdmin) setShowAdmin(false) }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [showAdmin])

  // VITE_ADMIN_EMAILS kept as a fast UI hint; authoritative check is the DB is_admin() RPC below
  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",").map(e => e.trim().toLowerCase())

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) logError("getSession", error)
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
    try {
      // ── Admin check: DB is authoritative; env var is a fast first guess ──
      const clientSideAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase())

      // Try DB-backed admin verification (requires is_admin() RPC + admins table)
      let dbAdmin = false
      try {
        const { data: adminResult } = await supabase.rpc("is_admin")
        dbAdmin = !!adminResult
      } catch {
        // RLS SQL not yet applied — fall back to client-side check only
        dbAdmin = clientSideAdmin
      }

      const adminConfirmed = dbAdmin || clientSideAdmin
      setIsAdmin(adminConfirmed)

      if (adminConfirmed) {
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
        // First time sign-in — check if email is pre-approved
        const { data: preApproved } = await supabase
          .from("pre_approved_emails")
          .select("email")
          .eq("email", user.email?.toLowerCase())
          .maybeSingle()

        const status = preApproved ? "approved" : "pending"
        await supabase.from("user_approvals").upsert({
          user_id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || "",
          last_name:  user.user_metadata?.last_name  || "",
          status,
          created_at: new Date().toISOString(),
          ...(preApproved ? { reviewed_at: new Date().toISOString(), reviewed_by: "pre-approved" } : {}),
        }, { onConflict: "user_id" })
        setApprovalStatus(status)
      } else {
        setApprovalStatus(data.status)
      }
    } catch (err) {
      logError("checkApproval", err)
      // On unexpected error, keep loading=false so user isn't stuck
      setApprovalStatus("pending")
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
        color: dark ? "#A09580" : "rgb(140, 145, 145)",
        background: dark ? "rgba(42, 40, 32, 0.65)" : "rgba(253, 250, 245, 0.65)",
        backdropFilter: "blur(14px)",
        borderTop: dark ? "1px solid #3A3628" : "1px solid #E4D9C8",
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
            border: dark ? "1px solid #3A3628" : "1px solid #E4D9C8",
            background: dark ? "rgba(55, 51, 38, 0.6)" : "rgba(255, 255, 255, 0.65)",
          }}
        >
          <span>Created by Bilal Ahmed</span>
          <span style={{ opacity: dark ? 0.55 : 0.6 }}>|</span>
          <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>NextGen Sheets</span>
          <span style={{ opacity: dark ? 0.55 : 0.6 }}>|</span>
          <img
            src="/upwork_light.png"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
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
  } else if (isGuest) {
    content = (
      <Suspense fallback={suspenseFallback}>
        <App
          session={null}
          isAdmin={false}
          isGuest={true}
          onGuestExit={() => setIsGuest(false)}
          onOpenAdmin={() => {}}
        />
      </Suspense>
    )
  } else if (!session) {
    content = (
      <Suspense fallback={suspenseFallback}>
        <Auth onGuestLogin={() => setIsGuest(true)} />
      </Suspense>
    )
  } else if (approvalStatus === "pending") {
    content = (
      <Suspense fallback={suspenseFallback}>
        <PendingApproval user={session.user} />
      </Suspense>
    )
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
    // Approved — show the app (isAdmin is set by DB-backed check in checkApproval)
    content = (
      <Suspense fallback={suspenseFallback}>
        {showAdmin
          ? <AdminPanel currentUser={session.user} session={session} isAdmin={isAdmin} onBack={() => setShowAdmin(false)} />
          : <App session={session} isAdmin={isAdmin} onOpenAdmin={() => setShowAdmin(true)} />}
      </Suspense>
    )
  }

  const versionLabel = `version_${__BUILD_DATE__}`

  return (
    <>
      <main id="main-content" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
        {content}
      </main>
      {footer}
      <div style={{
        position: "fixed",
        bottom: "max(6px, env(safe-area-inset-bottom, 6px))",
        right: 16,
        fontSize: 10,
        fontFamily: "'DM Sans', sans-serif",
        color: dark ? "rgba(160, 149, 128, 0.6)" : "rgba(122, 122, 122, 0.55)",
        pointerEvents: "none",
        zIndex: 10000,
        letterSpacing: "0.04em",
      }}>
        {versionLabel}
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
)
