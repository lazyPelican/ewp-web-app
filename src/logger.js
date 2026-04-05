// Centralized error/event logger
// To add Sentry later: import * as Sentry from "@sentry/react" and call Sentry.captureException(err)

const isDev = import.meta.env.DEV

export function logError(context, error, extra = {}) {
  const msg = error?.message || String(error)
  console.error(`[EWP:${context}]`, msg, extra)
  // Future: Sentry.captureException(error, { extra: { context, ...extra } })
}

export function logWarn(context, message, extra = {}) {
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
    onError?.(err?.message || "An unexpected error occurred.")
  }
}
