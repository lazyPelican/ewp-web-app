// Centralized error/event logger
// Production: console output is suppressed — only Sentry (when integrated) will capture.
// Development: full console output for debugging.
// To add Sentry: import * as Sentry from "@sentry/react" and uncomment the Sentry lines below.

const isDev  = import.meta.env.DEV
const isProd = import.meta.env.PROD
const ERROR_LOG_KEY = "ewp-client-error-log"

export function saveClientError(context, error, extra = {}) {
  if (typeof window === "undefined") return
  try {
    const item = {
      at: new Date().toISOString(),
      context,
      message: error?.message || String(error),
      stack: error?.stack || null,
      extra,
      url: window.location.href,
      userAgent: window.navigator?.userAgent || null,
    }
    const previous = JSON.parse(window.localStorage.getItem(ERROR_LOG_KEY) || "[]")
    window.localStorage.setItem(ERROR_LOG_KEY, JSON.stringify([item, ...previous].slice(0, 10)))
  } catch {
    // Logging must never break the app.
  }
}

export function logError(context, error, extra = {}) {
  // Future: Sentry.captureException(error, { extra: { context, ...extra } })
  saveClientError(context, error, extra)
  if (isDev) {
    console.error(`[EWP:${context}]`, error?.message || String(error), extra)
  }
}

export function logWarn(context, message, extra = {}) {
  // Future: Sentry.captureMessage(message, { level: "warning", extra: { context, ...extra } })
  if (isDev) console.warn(`[EWP:${context}]`, message, extra)
}

export function logInfo(context, message, extra = {}) {
  if (isDev) console.info(`[EWP:${context}]`, message, extra)
}

// Wraps an async function, logs errors, optionally calls onError(msg)
export async function safeAsync(context, fn, onError) {
  try {
    return await fn()
  } catch (err) {
    logError(context, err)
    onError?.(isProd ? "An unexpected error occurred." : (err?.message || "An unexpected error occurred."))
  }
}
