// Centralized error/event logger
// Production: console output is suppressed — only Sentry (when integrated) will capture.
// Development: full console output for debugging.
// To add Sentry: import * as Sentry from "@sentry/react" and uncomment the Sentry lines below.

const isDev  = import.meta.env.DEV
const isProd = import.meta.env.PROD

export function logError(context, error, extra = {}) {
  // Future: Sentry.captureException(error, { extra: { context, ...extra } })
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
