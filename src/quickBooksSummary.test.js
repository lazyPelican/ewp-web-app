import { expect, it } from 'vitest'
import { quickBooksSummary } from './quickBooksSummary.js'
import { pricingSnapshotToTables } from './pricingSnapshots.js'

const pricing = {
  woodwork: [{ name: 'Cabinet', price: 100, finLF: 2 }], construction: [], wood: [],
  upgrades: [{ name: 'Upgrade', price: 50 }], countertops: [{ name: 'Quartz', price: 200 }],
  finishing: [{ name: 'Paint', pricePerLF: 90 }], installPerLF: [{ name: 'Euro', rate: 100 }],
  installType: [{ name: 'Legacy', rate: 0.2 }],
}
const room = {
  cabinetry: [{ product: 'Cabinet', qty: '2', adjPct: '10' }], upgrades: [{ upgrade: 'Upgrade', qty: '1' }],
  countertops: [{ product: 'Quartz', qty: '1' }], finishing: [{ type: 'Paint', lf: '2' }],
  install: { method: 'per_lf', type: 'Euro' },
}

it('combines cabinets, upgrades and countertops and reconciles delivery/tax', () => {
  const result = quickBooksSummary({ deliveryAmount: '50', taxEnabled: true, taxRate: '10' }, [room, room], pricing)
  expect(result.lines.map(line => line.name)).toEqual(['Wood Products', 'Finishing', 'Installation', 'Delivery'])
  expect(result.lines.map(line => line.amount)).toEqual([940, 360, 400, 50])
  expect(result.subtotal).toBe(1750)
  expect(result.tax).toBe(175)
  expect(result.grandTotal).toBe(1925)
})

it('uses saved installation rates and supports legacy quotes without delivery', () => {
  const savedPricing = pricingSnapshotToTables({ installPerLF: { Euro: 90 } }, pricing)
  expect(quickBooksSummary({ noDelivery: true, deliveryAmount: '500' }, [room], savedPricing).lines.map(line => line.amount)).toEqual([470, 180, 180, 0])
  const legacy = quickBooksSummary({ noDelivery: true }, [{ ...room, install: { type: 'Legacy' } }], pricing)
  expect(legacy.lines[2].amount).toBe(45)
  expect(legacy.tax).toBe(0)
  expect(legacy.grandTotal).toBe(695)
})

it('keeps zero categories and applies the quote installation tax rules', () => {
  const result = quickBooksSummary({ noDelivery: true }, [], pricing)
  expect(result.lines).toHaveLength(4)
  expect(result.grandTotal).toBe(0)
  const taxed = quickBooksSummary({ installationType: 'contractor', taxEnabled: false }, [room], pricing)
  expect(taxed.hasTax).toBe(true)
  expect(taxed.tax).toBeCloseTo(850 * 0.0853)
})
