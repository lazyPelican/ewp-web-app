import { describe, expect, it } from 'vitest'
import { blankRoom, calcInstall, installationFootage, installationIssue, isRoomComplete } from './appUtils.js'
import { buildPricingSnapshotForRooms, detectPricingChanges, pricingSnapshotToTables } from './pricingSnapshots.js'
import { sanitizeRoom } from './sanitize.js'

const pricing = {
  woodwork: [{ name: 'Base', price: 100, finLF: 2 }],
  installPerLF: [{ name: 'Euro', rate: 100 }, { name: 'Paint', rate: 90 }],
  installType: [{ name: 'Legacy', rate: 0.2 }, { name: 'Hourly Rate', rate: 135 }],
}
const room = (overrides = {}) => ({
  ...blankRoom(0), name: 'Kitchen', sections: ['cabinetry', 'finishing', 'install'],
  cabinetry: [{ product: 'Base', qty: '50' }],
  finishing: [{ type: 'Paint', lf: '100' }],
  install: { method: 'per_lf', type: 'Euro', adjPct: '' }, ...overrides,
})

describe('installation per linear foot', () => {
  it('uses category rates and entered footage across finishing rows', () => {
    const r = room({ finishing: [{ lf: '60' }, { lf: '40' }] })
    expect(calcInstall(r.install, 5000, pricing, r)).toBe(10000)
    expect(calcInstall({ ...r.install, type: 'Paint' }, 5000, pricing, r)).toBe(9000)
    expect(installationFootage(r, pricing)).toEqual({ lf: 100, source: 'Entered finishing LF' })
  })
  it('uses fractional LF, applies adjustments, and rounds up to $5', () => {
    const r = room({ finishing: [{ lf: '1.01' }], install: { method: 'per_lf', type: 'Paint', adjPct: '10' } })
    expect(calcInstall(r.install, 0, pricing, r)).toBe(100)
    expect(calcInstall({ ...r.install, adjPct: '-100' }, 0, pricing, r)).toBe(0)
  })
  it('falls back to cabinetry when footage is absent or finishing excluded', () => {
    const r = room({ finishing: [{ lf: '' }] })
    expect(installationFootage(r, pricing)).toEqual({ lf: 100, source: 'Cabinetry estimate' })
    expect(installationFootage(room({ sections: ['cabinetry', 'install'], finishing: [{ lf: '500' }] }), pricing).lf).toBe(100)
  })
  it('retains legacy percentages, hourly pricing, and No Install', () => {
    expect(calcInstall({ type: 'Legacy' }, 1000, pricing)).toBe(200)
    expect(calcInstall({ type: 'Hourly Rate', metric: '2' }, 0, pricing)).toBe(270)
    expect(calcInstall({ method: 'hourly', type: 'Hourly Rate', metric: '2' }, 0, pricing)).toBe(270)
    expect(calcInstall({ method: 'none', type: 'No Install' }, 1000, pricing)).toBe(0)
    expect(blankRoom(0, 0, 'legacy').install).not.toHaveProperty('method')
    expect(sanitizeRoom(room()).install.method).toBe('per_lf')
  })
  it('requires configured rates, category and footage for completion', () => {
    expect(isRoomComplete(room(), pricing)).toBe(true)
    expect(isRoomComplete(room(), { ...pricing, installPerLF: [] })).toBe(false)
    expect(isRoomComplete(room({ install: { method: 'per_lf', type: '' } }), pricing)).toBe(false)
    expect(installationIssue(room({ cabinetry: [], finishing: [] }), pricing)).toMatch(/positive/)
    expect(isRoomComplete(room(), { ...pricing, installPerLF: [{ name: 'Euro', rate: -1 }] })).toBe(false)
    const r = room({ sections: ['cabinetry'] })
    expect(calcInstall(r.install, 5000, pricing, r)).toBe(0)
    expect(installationIssue(r, pricing)).toBeNull()
  })
  it('snapshots rates and LF factors, including a deleted category', () => {
    const r = room({ finishing: [] })
    const saved = buildPricingSnapshotForRooms([r], pricing)
    const changed = { ...pricing, woodwork: [{ name: 'Base', price: 100, finLF: 5 }], installPerLF: [{ name: 'Euro', rate: 200 }] }
    expect(calcInstall(r.install, 0, pricingSnapshotToTables(saved, changed), r)).toBe(10000)
    expect(detectPricingChanges(saved, buildPricingSnapshotForRooms([r], changed)).map(c => c.key)).toEqual(['installPerLF', 'woodworkFinLF'])
    const removed = { ...changed, installPerLF: [] }
    expect(calcInstall(r.install, 0, pricingSnapshotToTables(saved, removed), r)).toBe(10000)
    expect(detectPricingChanges(saved, buildPricingSnapshotForRooms([r], removed))).toContainEqual(expect.objectContaining({ key: 'installPerLF', removed: true }))
  })
})
