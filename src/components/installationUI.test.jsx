// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InstallSection } from './RoomsPage.jsx'

afterEach(cleanup)
const pricing = { installPerLF: [{ name: 'Euro', rate: 100 }], installType: [{ name: 'Hourly Rate', rate: 135 }], woodwork: [{ name: 'Base', finLF: 2 }] }
const room = { sections: ['finishing', 'install'], cabinetry: [{ product: 'Base', qty: '50' }], finishing: [{ lf: '100' }], install: { method: 'per_lf', type: 'Euro' } }
const props = { room, data: room.install, cabTotal: 1000, pricing, onChange: vi.fn() }

describe('installation form', () => {
  it('shows live footage, source, rate and rounded total', () => {
    const { rerender } = render(<InstallSection {...props} />)
    expect(screen.getByLabelText('Installation Linear Feet').value).toBe('100')
    expect(screen.getByText('Entered finishing LF')).toBeTruthy()
    expect(screen.getByText('Install Total: $10,000.00')).toBeTruthy()
    const changedRoom = { ...room, finishing: [{ lf: '1.01' }] }
    rerender(<InstallSection {...props} room={changedRoom} />)
    expect(screen.getByText('Install Total: $105.00')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Installation Method'), { target: { value: 'hourly' } })
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ method: 'hourly', type: 'Hourly Rate' }))
  })
  it('keeps legacy options and warns when the LF table is empty', () => {
    const { rerender } = render(<InstallSection {...props} pricing={{ ...pricing, installPerLF: [] }} />)
    expect(screen.getByRole('status').textContent).toMatch(/not been configured/)
    rerender(<InstallSection {...props} data={{ type: 'Hourly Rate', metric: '2' }} room={{ ...room, install: { type: 'Hourly Rate', metric: '2' } }} />)
    expect(screen.queryByLabelText('Installation Method')).toBeNull()
    expect(screen.getByText('Install Total: $270.00')).toBeTruthy()
  })
})
