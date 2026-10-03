import { describe, expect, it } from 'vitest'
import { clockLabel, timeLabel, formatDateTime, formatKwh, formatSlotDate, formatSlotTime, isoDate, slotDayKey } from './format'

describe('formatSlotDate', () => {
  it('formats a slot day', () => {
    expect(formatSlotDate('2026-10-03T00:00:00Z')).toBe('Sat, 3 Oct 2026')
  })

  it('reads UTC midnight with UTC parts, so the day never shifts', () => {
    // 23:59 UTC is still the 3rd, whatever the machine's timezone is.
    expect(formatSlotDate('2026-10-03T23:59:00Z')).toBe('Sat, 3 Oct 2026')
  })

  it.each([null, undefined, '', 'not a date'])('shows a dash for %j', (value) => {
    expect(formatSlotDate(value)).toBe('—')
  })
})

describe('formatSlotTime', () => {
  it('joins start and end with an en dash', () => {
    expect(formatSlotTime('09:00', '10:30')).toBe('09:00–10:30')
  })
})

describe('formatDateTime', () => {
  it('includes the date and a two-digit time', () => {
    expect(formatDateTime('2026-10-01T08:14:22Z')).toMatch(/Oct 2026/)
    expect(formatDateTime('2026-10-01T08:14:22Z')).toMatch(/\d{2}:\d{2}/)
  })

  it.each([null, undefined, '', 'garbage'])('shows a dash for %j', (value) => {
    expect(formatDateTime(value)).toBe('—')
  })
})

describe('formatKwh', () => {
  it('appends the unit', () => {
    expect(formatKwh(30)).toBe('30 kWh')
  })

  it('keeps at most two decimals', () => {
    expect(formatKwh(12.3456)).toBe('12.35 kWh')
  })

  it('groups thousands', () => {
    expect(formatKwh(1200)).toBe('1,200 kWh')
  })
})

describe('slotDayKey', () => {
  it('keeps only the yyyy-MM-dd part', () => {
    expect(slotDayKey('2026-10-03T00:00:00Z')).toBe('2026-10-03')
  })
})

describe('isoDate', () => {
  it('is a local yyyy-MM-dd string', () => {
    expect(isoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('offsets by whole days', () => {
    const today = new Date(`${isoDate()}T12:00:00`)
    const later = new Date(`${isoDate(7)}T12:00:00`)
    expect(Math.round((later.getTime() - today.getTime()) / 86_400_000)).toBe(7)
  })

  it('goes backwards for negative offsets', () => {
    expect(isoDate(-1) < isoDate(0)).toBe(true)
  })
})

describe('clockLabel', () => {
  it('shows the date and time in Sri Lanka whatever the browser zone is', () => {
    // 14:30 UTC is 20:00 in Sri Lanka.
    expect(clockLabel(new Date('2026-10-03T14:30:00Z'))).toBe('Saturday 3 October · 20:00')
  })

  it('rolls over to the next day after midnight in Sri Lanka', () => {
    expect(clockLabel(new Date('2026-10-03T19:00:00Z'))).toBe('Sunday 4 October · 00:30')
  })
})

describe('timeLabel', () => {
  it('shows only the Sri Lanka time', () => {
    expect(timeLabel(new Date('2026-10-03T14:30:00Z'))).toBe('20:00')
  })
})
