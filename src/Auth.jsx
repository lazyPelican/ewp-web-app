import { useState } from "react"
import { supabase } from "./supabase.js"
import { sanitizeName, sanitizeEmail, isValidEmail } from "./sanitize.js"

export default function Auth({ onGuestLogin }) {
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem("ewp-theme") === "dark")

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem("ewp-theme", next ? "dark" : "light")
    document.documentElement.classList.toggle("dark", next)
    window.dispatchEvent(new Event("ewp-theme-change"))
  }

  const t = dark ? {
    bg: "#141414", card: "#1C1C1C", border: "#2A2A2A",
    char: "#E8E2D9", gold: "#7BAF7A", muted: "#666666",
    inputBg: "#141414", inputColor: "#E8E2D9",
    tabBg: "#111111", red: "#E05C50", redBg: "#2A0D0D", redBorder: "#5A2A28",
    green: "#4CAF80", greenBg: "#0D2A1A", greenBorder: "#1A4D35",
    submitBg: "#E8E2D9", submitColor: "#1A1A1A",
  } : {
    bg: "#FDFAF5", card: "#fff", border: "#EDE8DF",
    char: "#2D2D2D", gold: "#7BAF7A", muted: "#9E9E9E",
    inputBg: "#FDFAF5", inputColor: "#2D2D2D",
    tabBg: "#F5F0E8", red: "#C0392B", redBg: "#fdf0ef", redBorder: "#f5c6c3",
    green: "#065F46", greenBg: "#D1FAE5", greenBorder: "#6EE7B7",
    submitBg: "#2D2D2D", submitColor: "#FDFAF5",
  }

  const font = "'DM Sans', sans-serif"

  const inputStyle = (hasError) => ({
    width: "100%", padding: "10px 14px", borderRadius: 7,
    border: `1px solid ${hasError ? t.red : t.border}`,
    fontSize: 14, outline: "none", background: t.inputBg, color: t.inputColor,
    boxSizing: "border-box", fontFamily: font, transition: "border-color 0.15s",
  })

  const reset = () => { setError(null); setSuccess(null) }

  const handleSignIn = async () => {
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail || !password) { setError("Please enter your email and password."); return }
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address."); return }
    setLoading(true); reset()
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUp = async () => {
    const cleanFirst = sanitizeName(firstName, 60)
    const cleanLast  = sanitizeName(lastName, 60)
    const cleanEmail = sanitizeEmail(email)
    if (!cleanFirst || !cleanLast) { setError("Please enter your first and last name."); return }
    if (!cleanEmail || !password) { setError("Please fill in all fields."); return }
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address."); return }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true); reset()
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { first_name: cleanFirst, last_name: cleanLast } },
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess("Account created! Check your email to confirm your address, then sign in.")
      setMode("signin")
      setPassword(""); setConfirmPassword(""); setFirstName(""); setLastName("")
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") mode === "signin" ? handleSignIn() : handleSignUp()
  }

  const switchMode = (m) => { setMode(m); reset(); setPassword(""); setConfirmPassword(""); setFirstName(""); setLastName(""); setShowPassword(false); setShowConfirm(false) }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: t.bg, fontFamily: font,
      transition: "background 0.2s",
      padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
      boxSizing: "border-box",
    }}>
      {/* Dark mode toggle — top right corner */}
      <button
        onClick={toggleDark}
        style={{
          position: "fixed", top: 16, right: 20,
          background: "transparent",
          border: `1px solid ${t.border}`,
          borderRadius: 20, padding: "6px 14px",
          cursor: "pointer", color: t.gold,
          fontSize: 13, fontFamily: font, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.15s",
        }}
      >
        {dark ? "☀ Light" : "☾ Dark"}
      </button>

      <div style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
        padding: "clamp(28px, 5vw, 48px) clamp(20px, 5vw, 40px)",
        width: "100%",
        maxWidth: 360,
        boxSizing: "border-box",
        position: "relative", zIndex: 1,
        boxShadow: dark
          ? "0 2px 4px rgba(0,0,0,0.28), 0 8px 20px rgba(0,0,0,0.38), 0 20px 48px rgba(0,0,0,0.32)"
          : "0 2px 4px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.10), 0 20px 48px rgba(0,0,0,0.08)",
        textAlign: "center", transition: "background 0.2s, border-color 0.2s",
      }}>
        {/* Logo */}
        <img
          src={dark ? "/ewp-logo.png" : "/ewp-logo-dark.png"}
          alt="Engstrom Wood Products"
          style={{
            width: 80, height: 80,
            objectFit: "contain",
            margin: "0 auto 20px", display: "block",
          }}
        />

        <div style={{ fontSize: 20, fontWeight: 700, color: t.char, marginBottom: 4 }}>
          Engstrom Wood Products
        </div>
        <div style={{
          fontSize: 12, color: t.muted, marginBottom: 32,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Estimate Manager
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", background: t.tabBg, borderRadius: 8,
          padding: 3, marginBottom: 24, gap: 3,
        }}>
          {["signin", "signup"].map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: "7px 0", borderRadius: 6, border: "none",
              background: mode === m ? t.card : "transparent",
              color: mode === m ? t.char : t.muted,
              fontWeight: mode === m ? 600 : 400, fontSize: 13,
              cursor: "pointer", fontFamily: font,
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}>
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background: t.greenBg, border: `1px solid ${t.greenBorder}`,
            borderRadius: 7, padding: "10px 14px", marginBottom: 16,
            fontSize: 13, color: t.green, textAlign: "left", lineHeight: 1.5,
          }}>
            {success}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "signup" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text" placeholder="First name"
                value={firstName} onChange={e => { setFirstName(e.target.value); reset() }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle(!firstName.trim() && error?.includes("name")), flex: 1 }}
              />
              <input
                type="text" placeholder="Last name"
                value={lastName} onChange={e => { setLastName(e.target.value); reset() }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle(!lastName.trim() && error?.includes("name")), flex: 1 }}
              />
            </div>
          )}
          <input
            type="email" placeholder="Email address"
            value={email} onChange={e => { setEmail(e.target.value); reset() }}
            onKeyDown={handleKeyDown}
            style={inputStyle(false)} autoFocus={mode === "signin"}
          />
          <div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"} placeholder="Password"
                value={password} onChange={e => { setPassword(e.target.value); reset() }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle(false), width: "100%", boxSizing: "border-box", paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: t.muted, fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {mode === "signup" && password.length > 0 && (() => {
              // Strength scoring
              let score = 0
              if (password.length >= 8) score++
              if (/[A-Z]/.test(password)) score++
              if (/[a-z]/.test(password)) score++
              if (/[0-9]/.test(password)) score++
              if (/[^A-Za-z0-9]/.test(password)) score++
              // Map to 4 levels: Weak (0-1), Fair (2), Good (3), Strong (4-5)
              const level = score <= 1 ? 0 : score === 2 ? 1 : score === 3 ? 2 : 3
              const labels = ["Weak", "Fair", "Good", "Strong"]
              const colors = ["#E05252", "#E8963A", "#D4B300", "#2E9E5E"]
              const darkColors = ["#E05252", "#E8963A", "#C9A930", "#3DBF74"]
              const segColors = dark ? darkColors : colors
              return (
                <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 3, flex: 1 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= level ? segColors[level] : (dark ? "#2A2A2A" : "#E8E2D9"),
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, minWidth: 38, textAlign: "right",
                    color: segColors[level], fontFamily: font,
                  }}>
                    {labels[level]}
                  </span>
                </div>
              )
            })()}
          </div>
          {mode === "signup" && (
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"} placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); reset() }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle(password && confirmPassword && password !== confirmPassword), paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: t.muted, fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                }}
              >
                {showConfirm ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: t.redBg, border: `1px solid ${t.redBorder}`,
            borderRadius: 6, padding: "8px 12px", marginTop: 12,
            fontSize: 12, color: t.red, textAlign: "left",
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={mode === "signin" ? handleSignIn : handleSignUp}
          disabled={loading}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 7, border: "none",
            background: t.submitBg, color: t.submitColor,
            fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: font, marginTop: 16, opacity: loading ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {/* Forgot password */}
        {mode === "signin" && (
          <button
            onClick={async () => {
              if (!email) { setError("Enter your email address first."); return }
              setLoading(true); reset()
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "?reset=1",
              })
              if (error) setError(error.message)
              else setSuccess("Password reset email sent — check your inbox.")
              setLoading(false)
            }}
            style={{
              marginTop: 12, background: "none", border: "none",
              color: t.gold, fontSize: 12, cursor: "pointer",
              fontFamily: font, textDecoration: "underline",
            }}
          >
            Forgot password?
          </button>
        )}

        <div style={{ fontSize: 11, color: t.gold, marginTop: 20, lineHeight: 1.6 }}>
          {mode === "signup"
            ? "New accounts require admin approval before access is granted."
            : "Access is restricted to approved team members."}
        </div>

        {/* Guest access */}
        {mode === "signin" && onGuestLogin && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
            <button
              onClick={onGuestLogin}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 7,
                border: "none",
                background: t.submitBg, color: t.submitColor,
                fontWeight: 600, fontSize: 14, cursor: "pointer",
                fontFamily: font, transition: "opacity 0.15s",
                letterSpacing: "0.01em",
              }}
            >
              Continue as Guest
            </button>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 7, lineHeight: 1.5, textAlign: "center" }}>
              Try the app without an account
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
