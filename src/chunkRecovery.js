const CHUNK_RELOAD_KEY = "ewp-chunk-reload-attempted-at"
const BACKGROUND_RELOAD_KEY = "ewp-background-error-reload-attempted-at"

export function isChunkLoadError(error) {
  const message = String(error?.message || error || "")
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload|loading chunk .* failed|chunkloaderror|module script load failed/i.test(message)
}

export function reloadForFreshAssets() {
  if (typeof window === "undefined") return false

  const lastAttempt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  const now = Date.now()
  if (now - lastAttempt < 10000) return false

  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
  window.location.reload()
  return true
}

export function reloadAfterBackgroundError() {
  if (typeof window === "undefined") return false

  const hiddenAt = Number(window.__ewpLastHiddenAt || 0)
  const now = Date.now()
  if (!hiddenAt || now - hiddenAt < 5 * 60 * 1000) return false

  const lastAttempt = Number(window.sessionStorage.getItem(BACKGROUND_RELOAD_KEY) || 0)
  if (now - lastAttempt < 10 * 60 * 1000) return false

  window.sessionStorage.setItem(BACKGROUND_RELOAD_KEY, String(now))
  window.location.reload()
  return true
}
