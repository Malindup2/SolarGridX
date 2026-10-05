import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEYS, clearSession, getStoredToken } from './session'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getStoredToken', () => {
  it('returns null when nobody is signed in', () => {
    expect(getStoredToken()).toBeNull()
  })

  it('returns the stored token', () => {
    localStorage.setItem('token', 'abc.def.ghi')
    expect(getStoredToken()).toBe('abc.def.ghi')
  })

  it('returns null instead of throwing when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getStoredToken()).toBeNull()
  })
})

describe('clearSession', () => {
  it('removes every session key', () => {
    SESSION_KEYS.forEach((key) => localStorage.setItem(key, 'x'))

    clearSession()

    SESSION_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it('leaves unrelated keys alone', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('token', 'x')

    clearSession()

    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => clearSession()).not.toThrow()
  })
})
