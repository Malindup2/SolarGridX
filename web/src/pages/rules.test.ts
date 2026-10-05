import { describe, expect, it } from 'vitest'
import { eventLabel } from '../components/auditFormat'
import { filterStations, validateSchedule, validateStationDraft, type StationDraft } from '../components/stations/stationRules'
import { tokenSubject } from '../lib/jwt'
import type { ProsumerResponse } from '../types/prosumer'
import type { SlotResponse } from '../types/slot'
import type { StationResponse } from '../types/station'
import type { UserResponse } from '../types/user'
import { filterProsumers, validateProsumerDraft } from './prosumers/prosumerRules'
import { slotsForDay, validateSlotDraft } from './slots/slotRules'
import { filterUsers, validateUserDraft, type UserDraft } from './users/userRules'

const userDraft = (overrides: Partial<UserDraft> = {}): UserDraft => ({
  fullName: 'Nimal Perera',
  email: 'nimal@solargridx.com',
  role: 'GridOperator',
  status: 'Active',
  password: 'Temp@1234',
  nic: '',
  phone: '',
  address: '',
  ...overrides,
})

describe('validateUserDraft', () => {
  it('accepts a complete new user', () => {
    expect(validateUserDraft(userDraft(), true)).toEqual({})
  })

  it('needs a name, a valid email and an 8+ character password when creating', () => {
    const errors = validateUserDraft(userDraft({ fullName: ' ', email: 'not-an-email', password: 'short' }), true)
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password'])
  })

  it('does not ask for a password when editing', () => {
    expect(validateUserDraft(userDraft({ password: '' }), false)).toEqual({})
  })

  it('checks the NIC format only when one is given', () => {
    expect(validateUserDraft(userDraft({ nic: '12345' }), true).nic).toBeDefined()
    expect(validateUserDraft(userDraft({ nic: '851234567V' }), true).nic).toBeUndefined()
    expect(validateUserDraft(userDraft({ nic: '200012345678' }), true).nic).toBeUndefined()
  })
})

describe('filterUsers', () => {
  const users = [
    { id: '1', fullName: 'Amal Admin', email: 'amal@x.lk', role: 'Backoffice', status: 'Active', createdAt: '' },
    { id: '2', fullName: 'Nimal Operator', email: 'nimal@x.lk', role: 'GridOperator', status: 'Deactivated', createdAt: '' },
  ] as UserResponse[]

  it('filters by role, status and a case-insensitive search', () => {
    expect(filterUsers(users, '', 'GridOperator', '').map((u) => u.id)).toEqual(['2'])
    expect(filterUsers(users, '', '', 'Active').map((u) => u.id)).toEqual(['1'])
    expect(filterUsers(users, 'NIMAL@', '', '').map((u) => u.id)).toEqual(['2'])
    expect(filterUsers(users, '', '', '')).toHaveLength(2)
  })
})

describe('prosumer rules', () => {
  it('requires a valid NIC only when creating', () => {
    const draft = { nic: 'bad', fullName: 'A', email: 'a@b.lk', password: 'Temp@1234', phone: '', address: '' }
    expect(validateProsumerDraft(draft, true).nic).toBeDefined()
    expect(validateProsumerDraft(draft, false).nic).toBeUndefined()
  })

  it('filters by status and searches NIC, name and email', () => {
    const prosumers = [
      { nic: '851234567V', fullName: 'Kamala', email: 'k@x.lk', status: 'Pending' },
      { nic: '200012345678', fullName: 'Sunil', email: 's@x.lk', status: 'Active' },
    ] as ProsumerResponse[]
    expect(filterProsumers(prosumers, '', 'Pending').map((p) => p.nic)).toEqual(['851234567V'])
    expect(filterProsumers(prosumers, '2000', '').map((p) => p.nic)).toEqual(['200012345678'])
  })
})

describe('slot rules', () => {
  const valid = { slotDate: '2026-10-03', startTime: '09:00', endTime: '10:00', capacityKwh: '30' }

  it('accepts a valid slot', () => {
    expect(validateSlotDraft(valid)).toEqual({})
  })

  it('rejects an end before the start, bad times and zero capacity', () => {
    expect(validateSlotDraft({ ...valid, endTime: '08:00' }).endTime).toMatch(/after/)
    expect(validateSlotDraft({ ...valid, startTime: '9am' }).startTime).toBeDefined()
    expect(validateSlotDraft({ ...valid, capacityKwh: '0' }).capacityKwh).toBeDefined()
  })

  it('lists one day of slots in start-time order', () => {
    const slots = [
      { id: 'b', slotDate: '2026-10-03T00:00:00Z', startTime: '11:00' },
      { id: 'x', slotDate: '2026-10-04T00:00:00Z', startTime: '08:00' },
      { id: 'a', slotDate: '2026-10-03T00:00:00Z', startTime: '09:00' },
    ] as SlotResponse[]
    expect(slotsForDay(slots, '2026-10-03').map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('station rules', () => {
  const draft: StationDraft = {
    stationName: 'Negombo Hub',
    location: 'Beach Rd, Negombo',
    latitude: '7.2',
    longitude: '79.8',
    capacityKwh: '120',
    batterySlotCount: '4',
    type: 'AC',
    schedule: { openTime: '06:00', closeTime: '18:00', activeDays: ['Monday'], dayHours: [] },
  }

  it('accepts a complete station', () => {
    expect(validateStationDraft(draft, true)).toEqual({})
  })

  it('checks coordinates, capacity and whole-number bays', () => {
    const errors = validateStationDraft({ ...draft, latitude: '91', longitude: '', capacityKwh: '-1', batterySlotCount: '2.5' }, true)
    expect(Object.keys(errors).sort()).toEqual(['batterySlotCount', 'capacityKwh', 'latitude', 'longitude'])
  })

  it('only checks the schedule when creating', () => {
    const noDays = { ...draft, schedule: { ...draft.schedule, activeDays: [] } }
    expect(validateStationDraft(noDays, true).schedule).toBeDefined()
    expect(validateStationDraft(noDays, false).schedule).toBeUndefined()
  })

  it('needs the station to close after it opens', () => {
    expect(validateSchedule({ openTime: '18:00', closeTime: '06:00', activeDays: ['Monday'], dayHours: [] })).toMatch(/later/)
  })

  it('searches name and address', () => {
    const stations = [
      { id: '1', stationName: 'Negombo Hub', location: 'Beach Rd', status: 'Active' },
      { id: '2', stationName: 'Kandy Hub', location: 'Lake Rd', status: 'Inactive' },
    ] as StationResponse[]
    expect(filterStations(stations, 'lake', '').map((s) => s.id)).toEqual(['2'])
    expect(filterStations(stations, '', 'Active').map((s) => s.id)).toEqual(['1'])
  })
})

describe('eventLabel', () => {
  it('turns event names into sentences', () => {
    expect(eventLabel('ReservationApproved')).toBe('Reservation approved')
    expect(eventLabel('SlotOffline')).toBe('Slot offline')
  })
})

describe('tokenSubject', () => {
  const token = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.y`

  it('reads the user id from the token', () => {
    expect(tokenSubject(token({ sub: '64b7f0f0f0f0f0f0f0f0f0f0' }))).toBe('64b7f0f0f0f0f0f0f0f0f0f0')
  })

  it('returns null for a missing or broken token', () => {
    expect(tokenSubject(null)).toBeNull()
    expect(tokenSubject('garbage')).toBeNull()
    expect(tokenSubject('a.!!!.b')).toBeNull()
  })
})
