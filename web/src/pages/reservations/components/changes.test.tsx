import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeReservation } from '../../../test/fixtures'
import { hoursFor, describeHours, validateSchedule } from '../../../components/stations/stationRules'
import ScheduleFields from '../../../components/stations/ScheduleFields'
import { useState } from 'react'
import type { ScheduleDraft } from '../../../components/stations/stationRules'

const service = vi.hoisted(() => ({ updateEnergy: vi.fn(), reschedule: vi.fn() }))
vi.mock('../../../services/reservationService', () => ({ reservationService: service }))
vi.mock('../../../services/stationService', () => ({ stationService: { getById: vi.fn().mockResolvedValue({ batterySlotCount: 4 }), getAll: vi.fn().mockResolvedValue([]) } }))
vi.mock('../../../services/slotService', () => ({ slotService: { forStation: vi.fn().mockResolvedValue([]) } }))

const { default: ReservationChangeActions } = await import('./ReservationChangeActions')

describe('ReservationChangeActions', () => {
  beforeEach(() => vi.clearAllMocks())

  function renderActions(overrides = {}, onStale = vi.fn()) {
    render(
      <MemoryRouter>
        <ReservationChangeActions reservation={makeReservation({ updatedAt: '2026-10-01T08:14:22.123Z', ...overrides })} onStale={onStale} />
      </MemoryRouter>,
    )
    return onStale
  }

  it('warns that changing an approved booking needs re-approval and cancels its QR code', async () => {
    renderActions({ status: 'Approved' })

    await userEvent.click(screen.getByRole('button', { name: 'Edit energy' }))

    expect(await screen.findByText(/sends it back to Pending for approval again/)).toBeInTheDocument()
    expect(screen.getByText(/QR code stops working/)).toBeInTheDocument()
  })

  it('does not show that warning for a Pending booking', async () => {
    renderActions({ status: 'Pending' })

    await userEvent.click(screen.getByRole('button', { name: 'Edit energy' }))

    await screen.findByRole('dialog')
    expect(screen.queryByText(/sends it back to Pending/)).not.toBeInTheDocument()
  })

  it('sends the version the page loaded so someone else\'s change is not overwritten', async () => {
    service.updateEnergy.mockResolvedValue(makeReservation({ energyKwh: 20 }))
    renderActions()

    await userEvent.click(screen.getByRole('button', { name: 'Edit energy' }))
    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText('Energy (kWh)')
    await userEvent.clear(field)
    await userEvent.type(field, '20')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(service.updateEnergy).toHaveBeenCalledWith('res-1', 20, '2026-10-01T08:14:22.123Z'))
  })

  it('offers to load the latest version when the booking changed meanwhile', async () => {
    const conflict = Object.assign(new Error('x'), {
      isAxiosError: true,
      response: { status: 409, data: { code: 'RESERVATION_CHANGED', message: 'This reservation was changed by someone else. Reload it and try again.' } },
    })
    service.updateEnergy.mockRejectedValue(conflict)
    const onStale = renderActions()

    await userEvent.click(screen.getByRole('button', { name: 'Edit energy' }))
    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText('Energy (kWh)')
    await userEvent.clear(field)
    await userEvent.type(field, '20')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByText(/changed by someone else/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Try again' }))
    expect(onStale).toHaveBeenCalledOnce()
  })
})

describe('opening hours per day', () => {
  const schedule = {
    openTime: '06:00',
    closeTime: '18:00',
    activeDays: ['Monday', 'Saturday'],
    dayHours: [{ day: 'Saturday', openTime: '08:00', closeTime: '12:00' }],
  }

  it('uses a day\'s own hours, else the default', () => {
    expect(hoursFor(schedule, 'Saturday')).toEqual({ openTime: '08:00', closeTime: '12:00' })
    expect(hoursFor(schedule, 'Monday')).toEqual({ openTime: '06:00', closeTime: '18:00' })
    expect(describeHours(schedule, 'Saturday')).toBe('08:00–12:00')
  })

  it('validates each day\'s own hours', () => {
    expect(validateSchedule(schedule)).toBeNull()
    expect(validateSchedule({ ...schedule, dayHours: [{ day: 'Saturday', openTime: '12:00', closeTime: '08:00' }] })).toMatch(/Saturday must close later/)
    expect(validateSchedule({ ...schedule, dayHours: [{ day: 'Friday', openTime: '08:00', closeTime: '12:00' }] })).toMatch(/not an operating day/)
    expect(validateSchedule({ ...schedule, dayHours: [{ day: 'Saturday', openTime: '', closeTime: '12:00' }] })).toMatch(/Saturday's opening/)
  })
})

describe('ScheduleFields', () => {
  function Harness({ initial }: { initial: ScheduleDraft }) {
    const [value, setValue] = useState(initial)
    return (
      <>
        <ScheduleFields value={value} onChange={setValue} />
        <output data-testid="state">{JSON.stringify(value.dayHours)}</output>
      </>
    )
  }

  const base: ScheduleDraft = { openTime: '06:00', closeTime: '18:00', activeDays: ['Monday', 'Saturday'], dayHours: [] }

  it('gives a day its own hours when ticked, starting from the default', async () => {
    render(<Harness initial={base} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Saturday' }))

    expect(JSON.parse(screen.getByTestId('state').textContent!)).toEqual([{ day: 'Saturday', openTime: '06:00', closeTime: '18:00' }])
    expect(screen.getByLabelText('Saturday opens')).toHaveValue('06:00')
  })

  it('lets the day\'s hours be edited, and drops them when unticked', async () => {
    render(<Harness initial={base} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Saturday' }))

    const opens = screen.getByLabelText('Saturday opens')
    await userEvent.clear(opens)
    await userEvent.type(opens, '09:30')
    expect(JSON.parse(screen.getByTestId('state').textContent!)[0].openTime).toBe('09:30')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Saturday' }))
    expect(screen.getByTestId('state')).toHaveTextContent('[]')
  })

  it('removes a day\'s own hours when that day stops operating', async () => {
    render(<Harness initial={{ ...base, dayHours: [{ day: 'Saturday', openTime: '08:00', closeTime: '12:00' }] }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sat' }))

    expect(screen.getByTestId('state')).toHaveTextContent('[]')
    expect(screen.queryByRole('checkbox', { name: 'Saturday' })).not.toBeInTheDocument()
  })

  it('only lists operating days for special hours', () => {
    render(<Harness initial={base} />)

    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Tuesday' })).not.toBeInTheDocument()
  })
})
