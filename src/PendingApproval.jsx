import { supabase } from "./supabase.js"

export default function PendingApproval({ user }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FDFAF5",
      fontFamily: "'DM Sans', sans-serif",
      padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
      boxSizing: "border-box",
    }}>
      <div style={{
        background: "#fff",
        border: "1px solid #EDE8DF",
        borderRadius: 12,
        padding: "clamp(28px, 5vw, 48px) clamp(20px, 5vw, 40px)",
        width: "100%",
        maxWidth: 400,
        boxSizing: "border-box",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>

        <div style={{
          fontSize: 20, fontWeight: 700, color: "#2D2D2D", marginBottom: 8,
        }}>
          Approval Pending
        </div>

        <div style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, marginBottom: 8 }}>
          Your account (<strong>{user.email}</strong>) has been received and is awaiting admin approval.
        </div>

        <div style={{ fontSize: 13, color: "#9E9E9E", lineHeight: 1.6, marginBottom: 32 }}>
          You'll be able to access the Estimate Manager once an administrator approves your account. This typically happens within one business day.
        </div>

        <button
          onClick={handleSignOut}
          style={{
            background: "transparent",
            border: "1px solid #EDE8DF",
            borderRadius: 7,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 600,
            color: "#6B6B6B",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
