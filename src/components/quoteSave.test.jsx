// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SummaryPage } from './SummaryPage.jsx'
import { ProjectSetup } from './ProjectSetup.jsx'
import { DEFAULT_PRICING } from '../pricing.js'

afterEach(cleanup)
const project = { id: 'Test', name: 'Kitchen', address: '100 Test Street', bidDate: '2026-10-05', email: 'bad-email', contactPhone: '', contactName: '' }

it('shows a failed save and only continues after a successful retry', async () => {
  const onSave = vi.fn().mockResolvedValueOnce({ ok: false, error: 'Client email is invalid.' }).mockResolvedValueOnce({ ok: true })
  const onNext = vi.fn()
  const onEditProject = vi.fn()
  render(<SummaryPage project={project} rooms={[]} pricing={DEFAULT_PRICING} onSave={onSave} onNext={onNext} onEditProject={onEditProject} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Client email is invalid/))
  expect(screen.queryByText('Estimate saved successfully')).toBeNull()
  expect(onNext).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Edit Project Details' }))
  expect(onEditProject).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }))
  await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
  expect(screen.getByText('Estimate saved successfully')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

it('recovers from a thrown save error without false success', async () => {
  const onNext = vi.fn()
  render(<SummaryPage project={project} rooms={[]} pricing={DEFAULT_PRICING} onSave={vi.fn().mockRejectedValue(new Error('Offline'))} onNext={onNext} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not be saved/))
  expect(onNext).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Save and Continue' }).disabled).toBe(false)
})

it('flags invalid emails in Project Details and accepts blank optional email', () => {
  const onNext = vi.fn()
  const { rerender } = render(<ProjectSetup project={project} onChange={vi.fn()} onNext={onNext} />)
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Rooms' }))
  expect(screen.getByRole('alert').textContent).toMatch(/valid email/)
  expect(onNext).not.toHaveBeenCalled()
  rerender(<ProjectSetup project={{ ...project, email: '' }} onChange={vi.fn()} onNext={onNext} />)
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Rooms' }))
  expect(onNext).toHaveBeenCalledOnce()
})
