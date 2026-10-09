import { describe, expect, it } from 'vitest'
import { quoteTotals, assertQuoteTotals } from '../supabase/functions/_shared/quoteTotals.js'
import { calcQuoteTotals, calcTotal, blankRoom } from './appUtils.js'
import { DEFAULT_PRICING } from './pricing.js'
import { quickBooksSummary } from './quickBooksSummary.js'
import { sanitizeProject } from './sanitize.js'
import { validateQuotePayload } from './quoteValidation.js'
import { buildPricingSnapshotForRooms, pricingSnapshotToTables } from './pricingSnapshots.js'

const discount = (mode, value) => ({ enabled: true, mode, value })
const room = { ...blankRoom(0), install: { method: 'none', type: 'No Install' }, cabinetry: [{ product: 'Test Cabinet', qty: 1 }] }
const pricing = { ...DEFAULT_PRICING, woodwork: [{ name: 'Test Cabinet', price: 99000 }] }

describe('grand-total discounts', () => {
  it.each([['amount', 5000], ['percent', 5], ['target', 95000]])('reaches 95,000 in %s mode, including delivery', (mode, value) => {
    const result = quoteTotals({ deliveryAmount: 1000, discount: discount(mode, value) }, 99000)
    expect(result.grandTotal).toBe(95000)
    expect(result.discountAmount).toBe(5000)
    expect(result.discountPercent).toBe(5)
    expect(result.delivery).toBe(1000)
  })
  it('deducts after tax without changing tax', () => {
    const project = { installationType: 'contractor', deliveryAmount: 1000 }
    const original = quoteTotals(project, 99000)
    const result = quoteTotals({ ...project, discount: discount('percent', 5) }, 99000)
    expect(result.tax).toBeCloseTo(8530, 8)
    expect(result.tax).toBe(original.tax)
    expect(result.discountAmount).toBe(5426.5)
    expect(result.grandTotal).toBe(103103.5)
  })
  it('maintains targets, fixed dollars and percentages when costs change', () => {
    expect(quoteTotals({ discount: discount('target', 95000) }, 110000).discountAmount).toBe(15000)
    expect(quoteTotals({ discount: discount('amount', 5000) }, 110000).grandTotal).toBe(105000)
    expect(quoteTotals({ discount: discount('percent', 5) }, 110000).grandTotal).toBe(104500)
    expect(quoteTotals({ discount: discount('target', 95000) }, 90000).error).toMatch(/Target/)
  })
  it('uses cents rather than installation-style $5 rounding', () => {
    expect(quoteTotals({ discount: discount('amount', 1.23) }, 100).grandTotal).toBe(98.77)
    const totals = quoteTotals({ discount: discount('percent', 5) }, 99.99)
    expect(totals.discountAmount).toBe(5)
    expect(totals.grandTotal).toBe(94.99)
    expect(quoteTotals({ taxEnabled: true, taxRate: 8.53, discount: discount('target', 95.12) }, 99.99).grandTotal).toBe(95.12)
  })
  it.each([['amount', 100], ['percent', 100], ['target', 0]])('allows a zero final price via %s', (mode, value) => {
    expect(quoteTotals({ discount: discount(mode, value) }, 100).grandTotal).toBe(0)
  })
  it('handles zero base and zero discounts', () => {
    expect(quoteTotals({ discount: discount('percent', 0) }, 0).discountPercent).toBe(0)
    expect(quoteTotals({ discount: discount('amount', 0) }, 100).grandTotal).toBe(100)
  })
  it.each([['amount', ''], ['amount', null], ['amount', -1], ['percent', 101], ['amount', 101], ['target', 101], ['target', 'Infinity'], ['amount', 'bad'], ['other', 5]])('rejects invalid %s value %s', (mode, value) => {
    expect(quoteTotals({ discount: discount(mode, value) }, 100).error).toBeTruthy()
    expect(() => assertQuoteTotals({ discount: discount(mode, value) }, 100)).toThrow()
  })
  it('does not change legacy totals or reinterpret disabled values', () => {
    const p = { taxEnabled: true, taxRate: 8.53 }
    const legacy = 12.345 + 12.345 * (8.53 / 100)
    expect(quoteTotals(p, 12.345).grandTotal).toBe(legacy)
    expect(quoteTotals({ ...p, discount: { enabled: false, mode: 'amount', value: 'bad' } }, 12.345).grandTotal).toBe(legacy)
  })
  it('preserves discounts through JSON, sanitization and pricing snapshots', () => {
    const project = sanitizeProject(JSON.parse(JSON.stringify({ discount: discount('target', '95000'), deliveryAmount: 1000 })))
    const snapshot = buildPricingSnapshotForRooms([room], pricing)
    const savedPricing = pricingSnapshotToTables(snapshot, pricing)
    expect(calcTotal({ project, rooms: [room] }, savedPricing)).toBe(95000)
    expect(validateQuotePayload(project, [room], savedPricing).ok).toBe(true)
    expect(validateQuotePayload({ ...project, discount: discount('amount', 200000) }, [room], savedPricing).ok).toBe(false)
  })
  it('QuickBooks retains categories and explicit tax while matching client/server totals', () => {
    const project = { installationType: 'contractor', deliveryAmount: 1000, discount: discount('target', 95000) }
    const qb = quickBooksSummary(project, [room], pricing)
    expect(qb.lines.map(line => line.amount)).toEqual([99000, 0, 0, 1000])
    expect(qb.tax).toBeCloseTo(8530, 8)
    expect(qb.discountAmount).toBe(13530)
    expect(qb.grandTotal).toBe(calcQuoteTotals({ project, rooms: [room] }, pricing).grandTotal)
    expect(qb.grandTotal).toBe(assertQuoteTotals(project, 99000).grandTotal)
  })
})
