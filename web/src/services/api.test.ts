import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api, { isCanceled, toApiError } from './api'

function failure(status: number | null, data?: unknown, code?: string) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response =
    status === null ? undefined : { status, data, statusText: '', headers: {}, config }
  return new AxiosError('request failed', code, config, null, response)
}

describe('toApiError', () => {
  it('uses the API error envelope when present', () => {
    const error = toApiError(
      failure(400, { code: 'RESERVATION_WINDOW_EXCEEDED', message: 'Reservations must be scheduled within 7 days.', details: ['reservationDate: 12 days'] }),
    )

    expect(error).toEqual({
      status: 400,
      code: 'RESERVATION_WINDOW_EXCEEDED',
      message: 'Reservations must be scheduled within 7 days.',
      details: ['reservationDate: 12 days'],
    })
  })

  it('defaults details to an empty list when the API sends null', () => {
    const error = toApiError(failure(409, { code: 'SLOT_FULL', message: 'Full', details: null }))
    expect(error.details).toEqual([])
  })

  it('reports an unreachable server as a network error', () => {
    const error = toApiError(failure(null, undefined, 'ERR_NETWORK'))
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBeNull()
    expect(error.message).toMatch(/Unable to reach/)
  })

  it.each(['ECONNABORTED', 'ETIMEDOUT'])('words a %s timeout differently from an outage', (code) => {
    expect(toApiError(failure(null, undefined, code)).message).toMatch(/too long/)
  })

  it('explains a 403 without an envelope', () => {
    expect(toApiError(failure(403, '')).code).toBe('FORBIDDEN')
  })

  it.each([500, 502, 503])('maps a bare %i to SERVICE_UNAVAILABLE', (status) => {
    expect(toApiError(failure(status, '<html>oops</html>')).code).toBe('SERVICE_UNAVAILABLE')
  })

  it('explains a bare 429', () => {
    expect(toApiError(failure(429, '')).code).toBe('TOO_MANY_ATTEMPTS')
  })

  it('gives a server error the correlation id as a support reference', () => {
    const error = failure(500, '<html/>')
    error.response!.headers = { 'x-correlation-id': 'abc123' }

    expect(toApiError(error).details).toEqual(['Reference: abc123'])
  })

  it('falls back to UNKNOWN_ERROR for anything else', () => {
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN_ERROR')
    expect(toApiError(failure(418, 'teapot')).code).toBe('UNKNOWN_ERROR')
  })

  it('ignores a body that is not shaped like an error', () => {
    expect(toApiError(failure(400, { error: 'nope' })).code).toBe('UNKNOWN_ERROR')
  })
})

describe('isCanceled', () => {
  it('recognises an aborted request', () => {
    expect(isCanceled(new axios.Cancel('aborted'))).toBe(true)
    expect(isCanceled(new Error('other'))).toBe(false)
  })
})

describe('request interceptor', () => {
  let sent: InternalAxiosRequestConfig | undefined
  const okAdapter: AxiosAdapter = async (config) => {
    sent = config
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }

  beforeEach(() => {
    sent = undefined
    api.defaults.adapter = okAdapter
  })

  it('always identifies the client as web', async () => {
    await api.get('/reservations')
    expect(sent?.headers.get('X-Client-Type')).toBe('web')
  })

  it('attaches the bearer token when signed in', async () => {
    localStorage.setItem('token', 'jwt-123')
    await api.get('/reservations')
    expect(sent?.headers.get('Authorization')).toBe('Bearer jwt-123')
  })

  it('sends no Authorization header when signed out', async () => {
    await api.get('/reservations')
    expect(sent?.headers.get('Authorization')).toBeFalsy()
  })
})

describe('401 handling', () => {
  const assign = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    assign.mockClear()
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  function respondWith(status: number) {
    api.defaults.adapter = async (config) => {
      throw new AxiosError('failed', undefined, config, null, { status, data: {}, statusText: '', headers: {}, config })
    }
  }

  it('signs out and returns to /login when a signed-in session gets a 401', async () => {
    localStorage.setItem('token', 'expired')
    localStorage.setItem('role', 'GridOperator')
    respondWith(401)

    await expect(api.get('/reservations')).rejects.toBeInstanceOf(AxiosError)

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('role')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('does not redirect on a failed login attempt', async () => {
    localStorage.setItem('token', 'still-here')
    respondWith(401)

    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError)

    expect(assign).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBe('still-here')
  })

  it('does not redirect when nobody was signed in', async () => {
    respondWith(401)

    await expect(api.get('/reservations')).rejects.toBeInstanceOf(AxiosError)

    expect(assign).not.toHaveBeenCalled()
  })

  it('leaves the session alone for other errors', async () => {
    localStorage.setItem('token', 'valid')
    respondWith(403)

    await expect(api.get('/reservations')).rejects.toBeInstanceOf(AxiosError)

    expect(assign).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBe('valid')
  })
})
