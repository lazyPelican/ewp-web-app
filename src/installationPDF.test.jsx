import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { DEFAULT_PRICING } from './pricing.js'
import { blankRoom, calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall } from './appUtils.js'

// Keep the real PDF renderer; remove remote logo fetching from this runtime test.
vi.mock('@react-pdf/renderer', async importOriginal => ({ ...await importOriginal(), Image: () => null }))
import { buildCustomerPDFBlob, buildInternalPDFBlob, buildSummaryPDFBlob, buildQuickBooksPDFBlob } from './PDFTemplates.jsx'

const pricing = { ...DEFAULT_PRICING, installPerLF: [{ name: 'Euro', rate: 100 }] }
const options = { pricing, preparedBy: 'Test Estimator', calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall }
const room = { ...blankRoom(0), name: 'Kitchen', sections: ['finishing', 'install'], finishing: [{ type: DEFAULT_PRICING.finishing[0].name, lf: '100', adjPct: '', notes: '' }], install: { method: 'per_lf', type: 'Euro', adjPct: '', notes: '' } }
const project = { id: 'Test', name: 'Installation QA', address: '100 Test Street', contactName: 'Test Client', contactPhone: '555-0100', bidDate: '2026-10-04', noDelivery: true, installationPricingVersion: 2 }

it('renders real internal, customer and executive summary PDFs', async () => {
  for (const [name, build] of [['internal', buildInternalPDFBlob], ['customer', buildCustomerPDFBlob], ['summary', buildSummaryPDFBlob], ['quickbooks', buildQuickBooksPDFBlob]]) {
    const blob = await build(project, [room], options)
    const bytes = Buffer.from(await blob.arrayBuffer())
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(2000)
    if (process.env.EWP_PDF_QA) {
      mkdirSync('dist/installation-qa', { recursive: true })
      writeFileSync(`dist/installation-qa/${name}.pdf`, bytes)
    }
  }
}, 30000)

it('blocks issuing a per-LF PDF with no configured rate', async () => {
  for (const build of [buildInternalPDFBlob, buildCustomerPDFBlob, buildSummaryPDFBlob, buildQuickBooksPDFBlob]) {
    await expect(build(project, [room], { ...options, pricing: { ...pricing, installPerLF: [] } })).rejects.toThrow(/valid rate/)
  }
})

it('still renders an existing percentage-based quote', async () => {
  const legacyRoom = { ...room, install: { type: 'Euro - Finished', adjPct: '', notes: '' } }
  const legacyProject = { ...project }
  delete legacyProject.installationPricingVersion
  const blob = await buildInternalPDFBlob(legacyProject, [legacyRoom], options)
  expect(blob.size).toBeGreaterThan(2000)
})
