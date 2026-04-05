import { Component } from "react"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#FDFAF5",
        fontFamily: "'DM Sans', sans-serif", padding: 24, boxSizing: "border-box",
      }}>
        <div style={{
          background: "#fff", border: "1px solid #EDE8DF", borderRadius: 12,
          padding: "48px 40px", maxWidth: 440, width: "100%", textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2D2D2D", marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>
            An unexpected error occurred. Your data has not been lost.
          </div>
          <div style={{
            background: "#F5F0E8", border: "1px solid #EDE8DF", borderRadius: 6,
            padding: "10px 14px", fontSize: 11, color: "#A08060", fontFamily: "monospace",
            textAlign: "left", marginBottom: 28, wordBreak: "break-all",
          }}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 28px", borderRadius: 7, border: "none",
              background: "#2D2D2D", color: "#fff", fontSize: 13,
              fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }
}
