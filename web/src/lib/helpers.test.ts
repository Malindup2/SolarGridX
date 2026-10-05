import { describe, expect, it } from 'vitest'
import { checkAvatarFile } from '../pages/account/profileRules'
import { readResetToken } from '../pages/auth/resetToken'
import { slotProblem, slotStart } from '../pages/reservations/components/slotAvailability'
import type { SlotResponse } from '../types/slot'
import { initialsOf } from './initials'
import { badgeText, notificationRoute, routeForHit } from './notificationRoute'
import { toParams } from './query'

describe('notificationRoute', () => {
  it.each([
    [{ action: 'Reservation', resourceId: 'r1' }, '/reservations/r1'],
    [{ action: 'Station', resourceId: 's 1' }, '/stations/s%201'],
    [{ action: 'Prosumer', resourceId: '851234567V' }, '/prosumers/851234567V'],
    [{ action: 'User', resourceId: 'u1' }, '/users'],
    [{ action: 'Profile', resourceId: null }, '/profile'],
    [{ action: 'Reservation', resourceId: null }, '/reservations'],
  ] as const)('%o opens %s', (notification, expected) => {
    expect(notificationRoute(notification)).toBe(expected)
  })
})

describe('badgeText', () => {
  it('caps the badge at 99+', () => {
    expect(badgeText(7)).toBe('7')
    expect(badgeText(99)).toBe('99')
    expect(badgeText(100)).toBe('99+')
  })
})

describe('routeForHit', () => {
  it('sends each kind of search result to its page', () => {
    expect(routeForHit({ kind: 'prosumer', id: '200012345678', label: '', sublabel: null })).toBe('/prosumers/200012345678')
    expect(routeForHit({ kind: 'station', id: 's1', label: '', sublabel: null })).toBe('/stations/s1')
    expect(routeForHit({ kind: 'reservation', id: 'r1', label: '', sublabel: null })).toBe('/reservations/r1')
    expect(routeForHit({ kind: 'user', id: 'u1', label: '', sublabel: null })).toBe('/users')
  })
})

describe('initialsOf', () => {
  it('uses the first and last names', () => {
    expect(initialsOf('Nimal Kumara Perera')).toBe('NP')
    expect(initialsOf('amal')).toBe('A')
    expect(initialsOf('  ')).toBe('?')
    expect(initialsOf(null)).toBe('?')
  })
})

describe('checkAvatarFile', () => {
  it('accepts a JPEG or PNG up to 1 MB', () => {
    expect(checkAvatarFile({ type: 'image/png', size: 1024 })).toBeNull()
    expect(checkAvatarFile({ type: 'image/jpeg', size: 1024 * 1024 })).toBeNull()
  })

  it('rejects other types, empty files and anything over 1 MB', () => {
    expect(checkAvatarFile({ type: 'image/gif', size: 10 })).toMatch(/JPEG or PNG/)
    expect(checkAvatarFile({ type: 'image/png', size: 1024 * 1024 + 1 })).toMatch(/1 MB/)
    expect(checkAvatarFile({ type: 'image/png', size: 0 })).toMatch(/empty/)
  })
})

describe('readResetToken', () => {
  const token = 'A'.repeat(64)

  it('reads a 64-character hex token from the fragment', () => {
    expect(readResetToken(`#token=${token}`)).toBe(token)
  })

  it('ignores anything that is not a full token', () => {
    expect(readResetToken('')).toBeNull()
    expect(readResetToken('#token=abc')).toBeNull()
    expect(readResetToken(`#token=${'Z'.repeat(64)}`)).toBeNull()
  })
})

describe('slotProblem', () => {
  const slot = (overrides: Partial<SlotResponse> = {}): SlotResponse => ({
    id: 's1',
    stationId: 'st1',
    slotDate: '2026-10-05T00:00:00Z',
    startTime: '09:00',
    endTime: '10:00',
    capacityKwh: 30,
    isAvailable: true,
    reservedCount: 0,
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  })
  const before = new Date('2026-10-05T03:29:00Z') // 08:59 in Sri Lanka

  it('reads the slot start as Sri Lanka time', () => {
    expect(slotStart(slot()).toISOString()).toBe('2026-10-05T03:30:00.000Z')
  })

  it('explains why a slot cannot be picked', () => {
    expect(slotProblem(slot(), 4, before)).toBeNull()
    expect(slotProblem(slot({ isAvailable: false }), 4, before)).toBe('Offline')
    expect(slotProblem(slot({ reservedCount: 4 }), 4, before)).toBe('Full')
    expect(slotProblem(slot(), 4, new Date('2026-10-05T03:30:00Z'))).toBe('Already started')
  })
})

describe('toParams', () => {
  it('keeps non-empty strings, numbers and booleans only', () => {
    expect(toParams({ a: ' x ', b: '', c: 2, d: Number.NaN, e: true, f: undefined, g: null }).toString()).toBe('a=x&c=2&e=true')
  })
})
