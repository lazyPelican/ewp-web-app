import { Component } from "react"
import { isChunkLoadError, reloadAfterBackgroundError, reloadForFreshAssets } from "./chunkRecovery.js"
import { logError } from "./logger.js"

const isDev = import.meta.env?.DEV ?? true
const isLocalhost = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: null, errorMessage: null, errorStack: null }
  }

  static getDerivedStateFromError(error) {
    // Generate a short reference ID so users can report it without exposing stack details
    const errorId = Math.random().toString(36).slice(2, 8).toUpperCase()
    return {
      hasError: true,
      errorId,
      errorMessage: error?.message || String(error || "Unknown error"),
      errorStack: error?.stack || null,
    }
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error) && reloadForFreshAssets()) return
    if (reloadAfterBackgroundError()) return

    logError("errorBoundary", error, {
      errorId: this.state.errorId,
      componentStack: info?.componentStack,
    })

    // Only log to console in development; in production only Sentry (when added) should capture this
    if (isDev) {
      console.error("[ErrorBoundary] Uncaught error:", error, info)
    }
    // Future: Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#FDFAF5",
        fontFamily: "var(--font-body)", padding: 24, boxSizing: "border-box",
      }}>
        <div style={{
          background: "#fff", border: "1px solid #EDE8DF", borderRadius: 12,
          padding: "48px 40px", maxWidth: 440, width: "100%", textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A08060", marginBottom: 16 }}>App Error</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2D2D2D", marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>
            An unexpected error occurred. Your data has not been lost.
          </div>
          <div style={{
            background: "#F5F0E8", border: "1px solid #EDE8DF", borderRadius: 6,
            padding: "10px 14px", fontSize: 11, color: "#A08060", fontFamily: "monospace",
            textAlign: "left", marginBottom: 28,
          }}>
            Error ref: {this.state.errorId}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 28px", borderRadius: 7, border: "none",
              background: "#2D2D2D", color: "#fff", fontSize: 13,
              fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)",
            }}
          >
            Reload App
          </button>
          {(isDev || isLocalhost) && this.state.errorMessage && (
            <details style={{ marginTop: 18, textAlign: "left", fontSize: 11, color: "#666", lineHeight: 1.5 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Error details</summary>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#F8F4ED", border: "1px solid #EDE8DF", borderRadius: 6, padding: 12, maxHeight: 220, overflow: "auto" }}>
                {this.state.errorStack || this.state.errorMessage}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
