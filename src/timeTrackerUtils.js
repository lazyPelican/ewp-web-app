export const computeDurationSeconds = (startedAt, stoppedAt = Date.now()) => {
  const startMs = typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime()
  const stopMs = typeof stoppedAt === "number" ? stoppedAt : new Date(stoppedAt).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(stopMs)) return 0
  return Math.max(Math.round((stopMs - startMs) / 1000), 0)
}

export const mergeRunningEntry = (entries, runningEntry) => {
  if (!runningEntry) return entries || []
  const list = entries || []
  return list.some(entry => entry.id === runningEntry.id) ? list : [runningEntry, ...list]
}
