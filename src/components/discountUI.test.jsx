// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SummaryPage } from './SummaryPage.jsx'
import { DEFAULT_PRICING } from '../pricing.js'
import { blankRoom } from '../appUtils.js'

afterEach(cleanup)
const pricing = { ...DEFAULT_PRICING, woodwork: [{ name: 'Test Cabinet', price: 99000 }] }
const room = { ...blankRoom(0), name: 'Kitchen', cabinetry: [{ product: 'Test Cabinet', qty: 1 }], install: { method: 'none', type: 'No Install' } }
const project = { name: 'Discount QA', deliveryAmount: 1000, noDelivery: false }
const onSave = vi.fn().mockResolvedValue({ ok: true })

function Harness({ initial = project }) {
  const [value, setValue] = useState(initial)
  const [visible, setVisible] = useState(true)
  return <>
    <button onClick={() => setVisible(v => !v)}>{visible ? 'Leave Summary' : 'Return to Summary'}</button>
    {visible && <SummaryPage project={value} rooms={[room]} pricing={pricing} onChange={change => setValue(p => ({ ...p, ...change }))} onSave={onSave} onNext={vi.fn()} />}
  </>
}

it('offers all modes and reports amount, percent and final price immediately', () => {
  render(<Harness />)
  expect(screen.queryByRole('radiogroup')).toBeNull()
  fireEvent.click(screen.getByRole('switch', { name: 'Enable discount' }))
  const section = screen.getByRole('region', { name: 'Discount' })
  for (const [mode, label, value] of [['amount', '$ Discount', '5000'], ['percent', '% Discount', '5'], ['target', 'Target Price', '95000']]) {
    fireEvent.click(screen.getByRole('radio', { name: label }))
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value } })
    expect(within(section).getByText('$5,000.00')).toBeTruthy()
    expect(within(section).getByText('5.00%')).toBeTruthy()
    expect(within(section).getByText('$95,000.00')).toBeTruthy()
  }
  fireEvent.click(screen.getByRole('switch'))
  expect(screen.queryByRole('spinbutton')).toBeNull()
  expect(screen.getAllByText('$100,000.00').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('switch'))
  expect(screen.getByRole('spinbutton').value).toBe('95000')
})

it('blocks invalid discounts and restores a saved selection on reopen', () => {
  render(<Harness initial={{ ...project, discount: { enabled: true, mode: 'target', value: '110000' } }} />)
  expect(screen.getByRole('radio', { name: 'Target Price' }).checked).toBe(true)
  expect(screen.getByRole('alert').textContent).toMatch(/cannot exceed/)
  expect(screen.getByRole('button', { name: 'Save and Continue' }).disabled).toBe(true)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '95000' } })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('button', { name: 'Save and Continue' }).disabled).toBe(false)
})

it('places discount controls after room summaries and before the grand total', () => {
  const { container } = render(<Harness />)
  const discountSection = screen.getByRole('region', { name: 'Discount' })
  const roomSummary = container.querySelector('.report-room')
  const grandTotal = container.querySelector('.grand-total')
  expect(roomSummary.compareDocumentPosition(discountSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(discountSection.compareDocumentPosition(grandTotal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('keeps totals visible with an empty discount and resets it off when returning', () => {
  const { container } = render(<Harness />)
  fireEvent.click(screen.getByRole('switch'))
  expect(within(screen.getByRole('region', { name: 'Discount' })).getByText('$100,000.00')).toBeTruthy()
  expect(container.querySelector('.grand-total-value').textContent).toBe('$100,000.00')
  expect(screen.getByRole('button', { name: 'Save and Continue' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Leave Summary' }))
  fireEvent.click(screen.getByRole('button', { name: 'Return to Summary' }))
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
  expect(screen.queryByRole('spinbutton')).toBeNull()
  expect(screen.getByRole('button', { name: 'Save and Continue' }).disabled).toBe(false)
})

it.each(['0', '5000'])('retains an entered discount of %s on returning and updates totals live', value => {
  const { container } = render(<Harness />)
  fireEvent.click(screen.getByRole('switch'))
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value } })
  expect(container.querySelector('.grand-total-value').textContent).toBe(value === '0' ? '$100,000.00' : '$95,000.00')
  fireEvent.click(screen.getByRole('button', { name: 'Leave Summary' }))
  fireEvent.click(screen.getByRole('button', { name: 'Return to Summary' }))
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  expect(screen.getByRole('spinbutton').value).toBe(value)
})
