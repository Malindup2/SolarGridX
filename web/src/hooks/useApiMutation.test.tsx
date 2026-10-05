import { act, renderHook, waitFor } from '@testing-library/react'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { useApiMutation } from './useApiMutation'

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

describe('useApiMutation', () => {
  it('resolves to the result and passes the arguments through', async () => {
    const mutator = vi.fn(async (id: string, reason: string) => `${id}:${reason}`)
    const { result } = renderHook(() => useApiMutation(mutator))

    let value: string | null = null
    await act(async () => {
      value = await result.current.run('res-1', 'no capacity')
    })

    expect(value).toBe('res-1:no capacity')
    expect(mutator).toHaveBeenCalledWith('res-1', 'no capacity')
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('resolves to null and stores the error on failure', async () => {
    const { result } = renderHook(() =>
      useApiMutation(async () => {
        throw apiFailure('RESERVATION_ALREADY_DECIDED', 'This reservation is already Approved.')
      }),
    )

    let value: unknown = 'unset'
    await act(async () => {
      value = await result.current.run()
    })

    expect(value).toBeNull()
    expect(result.current.error).toMatchObject({ code: 'RESERVATION_ALREADY_DECIDED' })
  })

  it('reports loading while the call is in flight', async () => {
    let finish: (value: string) => void = () => {}
    const { result } = renderHook(() => useApiMutation(() => new Promise<string>((resolve) => (finish = resolve))))

    let pending: Promise<string | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.run()
    })
    await waitFor(() => expect(result.current.loading).toBe(true))

    await act(async () => {
      finish('done')
      await pending
    })
    expect(result.current.loading).toBe(false)
  })

  it('ignores a second submit while one is in flight', async () => {
    let finish: (value: string) => void = () => {}
    const mutator = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)))
    const { result } = renderHook(() => useApiMutation(mutator))

    let first: Promise<string | null> = Promise.resolve(null)
    let second: string | null = 'unset'
    await act(async () => {
      first = result.current.run()
      second = await result.current.run()
    })

    expect(second).toBeNull()
    expect(mutator).toHaveBeenCalledTimes(1)

    await act(async () => {
      finish('ok')
      await first
    })
  })

  it('clears the previous error when it runs again', async () => {
    let fail = true
    const { result } = renderHook(() =>
      useApiMutation(async () => {
        if (fail) throw apiFailure('SLOT_FULL', 'Full')
        return 'ok'
      }),
    )
    await act(async () => {
      await result.current.run()
    })
    expect(result.current.error).not.toBeNull()

    fail = false
    await act(async () => {
      await result.current.run()
    })

    expect(result.current.error).toBeNull()
  })

  it('reset clears the error', async () => {
    const { result } = renderHook(() =>
      useApiMutation(async () => {
        throw apiFailure('SLOT_FULL', 'Full')
      }),
    )
    await act(async () => {
      await result.current.run()
    })

    act(() => result.current.reset())

    expect(result.current.error).toBeNull()
  })
})
