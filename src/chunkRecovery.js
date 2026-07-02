const CHUNK_RELOAD_KEY = "ewp-chunk-reload-attempted-at"

export function isChunkLoadError(error) {
  const message = String(error?.message || error || "")
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload/i.test(message)
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
