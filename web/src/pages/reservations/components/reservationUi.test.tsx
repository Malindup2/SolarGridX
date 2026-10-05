import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeReservation } from '../../../test/fixtures'
import { reservationColumns, reservationRowLabel } from './reservationColumns'
import StatusTimeline from './StatusTimeline'

describe('StatusTimeline', () => {
  function steps() {
    return screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
  }

  it('shows a pending reservation as awaiting review', () => {
    render(<StatusTimeline reservation={makeReservation({ status: 'Pending' })} />)

    expect(steps()[0]).toMatch(/Booked/)
    expect(steps()[1]).toMatch(/Awaiting operator review.*current step/)
    expect(steps()[2]).toMatch(/Energy transferred/)
  })

  it('names the approving operator on an approved reservation', () => {
    render(<StatusTimeline reservation={makeReservation({ status: 'Approved', approvedBy: 'Nimal Perera' })} />)

    expect(steps()[1]).toMatch(/Approved.*by Nimal Perera/)
    expect(steps()[2]).toMatch(/Awaiting QR scan/)
  })

  it('shows every step done for a completed reservation', () => {
    render(
      <StatusTimeline
        reservation={makeReservation({ status: 'Completed', approvedBy: 'Nimal', completedAt: '2026-10-03T04:00:00Z' })}
      />,
    )

    expect(steps()).toHaveLength(3)
    expect(steps()[2]).toMatch(/Energy transferred/)
    expect(screen.queryByText(/current step/)).not.toBeInTheDocument()
  })

  it.each(['Rejected', 'Cancelled'] as const)('ends at %s with no further steps', (status) => {
    render(<StatusTimeline reservation={makeReservation({ status })} />)

    expect(steps()).toHaveLength(2)
    expect(steps()[1]).toMatch(new RegExp(status))
  })
})

describe('reservationColumns', () => {
  it('has all six columns by default', () => {
    expect(reservationColumns().map((column) => column.key)).toEqual(['date', 'slot', 'station', 'nic', 'energy', 'status'])
  })

  it('returns only the requested columns, in the requested order', () => {
    expect(reservationColumns(['status', 'date']).map((column) => column.key)).toEqual(['status', 'date'])
  })

  it('renders a reservation the same way everywhere', () => {
    const row = makeReservation({ energyKwh: 12.5, status: 'Approved' })
    const cells = reservationColumns().map((column) => column.render(row))

    render(<>{cells.map((cell, index) => <div key={index}>{cell}</div>)}</>)

    expect(screen.getByText('Sat, 3 Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('09:00–10:00')).toBeInTheDocument()
    expect(screen.getByText('Negombo Solar Hub')).toBeInTheDocument()
    expect(screen.getByText('199812345678')).toBeInTheDocument()
    expect(screen.getByText('12.5 kWh')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('hides the NIC on the stacked mobile card', () => {
    const nic = reservationColumns().find((column) => column.key === 'nic')
    expect(nic?.hideOnMobile).toBe(true)
  })
})

describe('reservationRowLabel', () => {
  it('describes the row for screen readers', () => {
    expect(reservationRowLabel(makeReservation({ status: 'Pending' }))).toBe(
      'Open reservation for 199812345678 on Sat, 3 Oct 2026 at 09:00–10:00, Pending',
    )
  })
})
