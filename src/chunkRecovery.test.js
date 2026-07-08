import { describe, expect, it, vi } from "vitest"
import { isChunkLoadError, reloadForFreshAssets } from "./chunkRecovery.js"

describe("chunk recovery", () => {
  it("detects dynamic import failures", () => {
    expect(isChunkLoadError(new Error("failed to fetch dynamically imported module"))).toBe(true)
    expect(isChunkLoadError(new Error("ordinary error"))).toBe(false)
  })

  it("prevents rapid reload loops", () => {
    const store = new Map()
    const originalWindow = globalThis.window
    globalThis.window = {
      sessionStorage: {
        getItem: key => store.get(key) || null,
        setItem: (key, value) => store.set(key, value),
      },
      location: { reload: vi.fn() },
    }

    expect(reloadForFreshAssets()).toBe(true)
    expect(reloadForFreshAssets()).toBe(false)
    expect(globalThis.window.location.reload).toHaveBeenCalledTimes(1)

    globalThis.window = originalWindow
  })
})
