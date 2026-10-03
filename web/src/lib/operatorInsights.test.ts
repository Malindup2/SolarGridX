import { describe, expect, it } from 'vitest'
import type { ReservationResponse } from '../types/reservation'
import type { SlotResponse } from '../types/slot'
import { buildOperatorInsights, durationLabel, endOf, startOf, todaySchedule } from './operatorInsights'

// 2026-10-03 20:00 in Sri Lanka is 14:30 UTC.
const NOW = new Date('2026-10-03T14:30:00Z')

function reservation(over: Partial<ReservationResponse>): ReservationResponse {
  return {
    id: 'r', nic: '200204003085', stationId: 's', stationName: 'Colombo-Yard1', slotId: 'sl',
    reservationDate: '2026-10-03T00:00:00Z', startTime: '21:00', endTime: '22:00', slotTime: '',
    energyKwh: 5, status: 'Approved', qrEligible: true, approvedBy: null, rejectionReason: null,
    completedAt: null, createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z', ...over,
  }
}

function slot(over: Partial<SlotResponse>): SlotResponse {
  return {
    id: 'sl', stationId: 's', slotDate: '2026-10-03T00:00:00Z', startTime: '19:00', endTime: '20:00',
    capacityKwh: 30, isAvailable: true, reservedCount: 0, updatedAt: '2026-10-03T00:00:00Z', ...over,
  }
}

describe('slot and reservation times', () => {
  it('reads "HH:mm" as Sri Lanka time', () => {
    expect(startOf(reservation({ startTime: '06:00' })).toISOString()).toBe('2026-10-03T00:30:00.000Z')
  })

  it('treats an end at or before the start as the next day', () => {
    expect(endOf(reservation({ startTime: '23:00', endTime: '00:00' })).toISOString()).toBe('2026-10-03T18:30:00.000Z')
  })
})

describe('durationLabel', () => {
  it.each([
    [5, '5 min'],
    [130, '2 h 10 min'],
    [1440, '1 day'],
    [3000, '2 days'],
  ])('%d minutes reads %s', (minutes, label) => expect(durationLabel(minutes)).toBe(label))
})

describe('buildOperatorInsights', () => {
  const reservations = [
    reservation({ id: 'a', status: 'Pending', energyKwh: 4 }),
    reservation({ id: 'b', status: 'Completed', energyKwh: 6, startTime: '10:00', endTime: '11:00' }),
    reservation({ id: 'c', status: 'Cancelled', energyKwh: 9 }),
    reservation({ id: 'd', status: 'Approved', reservationDate: '2026-10-05T00:00:00Z', startTime: '06:00', endTime: '07:00' }),
    reservation({ id: 'e', status: 'Approved', startTime: '21:00', endTime: '22:00' }),
  ]
  const result = buildOperatorInsights(reservations, [slot({ reservedCount: 2 }), slot({ id: 's2', reservedCount: 1 })], 5, NOW)

  it('counts today without cancelled or rejected bookings', () => {
    expect(result.bookingsToday).toBe(3)
    expect(result.completedToday).toBe(1)
    expect(result.kwhToday).toBe(15)
  })

  it('works out bay use from today\'s slots', () => {
    expect(result.baysReserved).toBe(3)
    expect(result.baysTotal).toBe(10)
    expect(result.utilisation).toBeCloseTo(0.3)
  })

  it('picks the soonest approved booking that has not ended', () => {
    expect(result.next?.id).toBe('e')
  })

  it('spreads demand over seven days from today', () => {
    expect(result.week).toHaveLength(7)
    expect(result.week[0]).toMatchObject({ day: '2026-10-03', bookings: 3 })
    expect(result.week[2]).toMatchObject({ day: '2026-10-05', bookings: 1 })
  })

  it('counts every status', () => {
    expect(result.statusCounts).toMatchObject({ Pending: 1, Approved: 2, Completed: 1, Cancelled: 1, Rejected: 0 })
    expect(result.total).toBe(5)
  })

  it('has no utilisation when there are no slots today', () => {
    expect(buildOperatorInsights([], [], 5, NOW).utilisation).toBeNull()
  })
})

describe('todaySchedule', () => {
  it('tags past, running, upcoming and offline slots in time order', () => {
    const rows = todaySchedule(
      [
        slot({ id: 'late', startTime: '21:00', endTime: '22:00' }),
        slot({ id: 'now', startTime: '19:30', endTime: '20:30' }),
        slot({ id: 'old', startTime: '08:00', endTime: '09:00' }),
        slot({ id: 'off', startTime: '23:00', endTime: '23:59', isAvailable: false }),
        slot({ id: 'tomorrow', slotDate: '2026-10-04T00:00:00Z' }),
      ],
      5,
      NOW,
    )
    expect(rows.map((r) => [r.slot.id, r.state])).toEqual([
      ['old', 'past'],
      ['now', 'now'],
      ['late', 'upcoming'],
      ['off', 'offline'],
    ])
  })
})
