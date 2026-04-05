import { useState } from "react"
import { supabase } from "./supabase.js"
import { sanitizeName, sanitizeEmail, isValidEmail } from "./sanitize.js"

export default function Auth() {
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
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
    char: "#E8E2D9", gold: "#C9A96E", muted: "#666666",
    inputBg: "#141414", inputColor: "#E8E2D9",
    tabBg: "#111111", red: "#E05C50", redBg: "#2A0D0D", redBorder: "#5A2A28",
    green: "#4CAF80", greenBg: "#0D2A1A", greenBorder: "#1A4D35",
    submitBg: "#E8E2D9", submitColor: "#1A1A1A",
  } : {
    bg: "#FDFAF5", card: "#fff", border: "#EDE8DF",
    char: "#2D2D2D", gold: "#C9A96E", muted: "#9E9E9E",
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

  const switchMode = (m) => { setMode(m); reset(); setPassword(""); setConfirmPassword(""); setFirstName(""); setLastName("") }

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
        boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.08)",
        textAlign: "center", transition: "background 0.2s, border-color 0.2s",
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%", border: `2px solid ${t.char}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontSize: 22,
          fontFamily: "Georgia, serif", fontWeight: 700, color: t.char,
        }}>E</div>

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
          <input
            type="password" placeholder="Password"
            value={password} onChange={e => { setPassword(e.target.value); reset() }}
            onKeyDown={handleKeyDown}
            style={inputStyle(false)}
          />
          {mode === "signup" && (
            <input
              type="password" placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); reset() }}
              onKeyDown={handleKeyDown}
              style={inputStyle(password && confirmPassword && password !== confirmPassword)}
            />
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
      </div>
    </div>
  )
}
