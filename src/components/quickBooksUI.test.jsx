// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PrintEmailPage } from './PrintEmailPage.jsx'
import { buildQuickBooksPDFBlob, exportPDFQuickBooks } from '../pdfExport.js'

vi.mock('../pdfExport.js', () => ({
  exportPDFInternal: vi.fn(), exportPDFCustomer: vi.fn(), exportPDFSummary: vi.fn(),
  buildInternalPDFBlob: vi.fn(), buildCustomerPDFBlob: vi.fn(), buildSummaryPDFBlob: vi.fn(),
  exportPDFQuickBooks: vi.fn(), buildQuickBooksPDFBlob: vi.fn().mockResolvedValue(new Blob(['PDF'])),
}))
afterEach(() => { cleanup(); delete HTMLElement.prototype.scrollIntoView; vi.clearAllMocks(); vi.unstubAllGlobals() })

it('provides a fourth PDF item with its own preview and download', async () => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:quickbooks'), revokeObjectURL: vi.fn() })
  const project = { id: 'Test', name: 'Kitchen', bidDate: '2026-10-05' }
  const pricing = {}
  render(<PrintEmailPage project={project} rooms={[]} pricing={pricing} preparedBy="Estimator" />)
  const card = screen.getByText('Summary for QuickBooks').closest('.card')
  fireEvent.click(within(card).getByRole('button', { name: 'Download PDF' }))
  expect(exportPDFQuickBooks).toHaveBeenCalledWith(project, [], 'Estimator', pricing, expect.any(Function))
  fireEvent.click(within(card).getByRole('button', { name: 'Preview' }))
  await waitFor(() => expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe('blob:quickbooks'))
  expect(buildQuickBooksPDFBlob).toHaveBeenCalledWith(project, [], 'Estimator', pricing)
  expect(screen.getAllByRole('button', { name: 'Download PDF' })).toHaveLength(4)
})
