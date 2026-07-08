import { describe, expect, it } from "vitest"
import { computeDurationSeconds, mergeRunningEntry } from "./timeTrackerUtils.js"

describe("time tracker helpers", () => {
  it("computes non-negative stopped durations", () => {
    expect(computeDurationSeconds("2026-01-01T00:00:00.000Z", "2026-01-01T00:10:00.000Z")).toBe(600)
    expect(computeDurationSeconds("2026-01-01T00:10:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(0)
  })

  it("merges a running entry without duplicating it", () => {
    const running = { id: "timer-1" }
    expect(mergeRunningEntry([], running)).toEqual([running])
    expect(mergeRunningEntry([running], running)).toEqual([running])
  })
})
