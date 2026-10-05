import { act, renderHook, waitFor } from '@testing-library/react'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { useApiQuery } from './useApiQuery'

function apiFailure(code: string, message: string) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', undefined, config, null, {
    status: 409,
    data: { code, message },
    statusText: '',
    headers: {},
    config,
  })
}

describe('useApiQuery', () => {
  it('starts loading, then exposes the data', async () => {
    const { result } = renderHook(() => useApiQuery(async () => ['a', 'b'], []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.error).toBeNull()
  })

  it('exposes a normalised error when the call fails', async () => {
    const { result } = renderHook(() =>
      useApiQuery(async () => {
        throw apiFailure('SLOT_FULL', 'Every bay is reserved.')
      }, []),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatchObject({ code: 'SLOT_FULL', message: 'Every bay is reserved.' })
    expect(result.current.data).toBeNull()
  })

  it('does not fetch while disabled', async () => {
    const fetcher = vi.fn(async () => 'data')
    const { result } = renderHook(() => useApiQuery(fetcher, [], { enabled: false }))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('refetches when a dependency changes', async () => {
    const fetcher = vi.fn(async (_signal: AbortSignal) => 'ok')
    const { result, rerender } = renderHook(({ station }) => useApiQuery(fetcher, [station]), {
      initialProps: { station: 'a' },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ station: 'b' })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('reload runs the call again and keeps the old data visible meanwhile', async () => {
    let calls = 0
    const { result } = renderHook(() => useApiQuery(async () => `call-${++calls}`, []))
    await waitFor(() => expect(result.current.data).toBe('call-1'))

    act(() => result.current.reload())

    expect(result.current.data).toBe('call-1')
    await waitFor(() => expect(result.current.data).toBe('call-2'))
  })

  it('aborts the previous request when a newer one starts', async () => {
    const signals: AbortSignal[] = []
    const { rerender } = renderHook(
      ({ id }) =>
        useApiQuery((signal) => {
          signals.push(signal)
          return new Promise<string>(() => {})
        }, [id]),
      { initialProps: { id: 1 } },
    )

    rerender({ id: 2 })

    await waitFor(() => expect(signals).toHaveLength(2))
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })
})
