/*
 * useNow.ts
 * The current time, refreshed on an interval, so countdowns and "now" markers stay true on a screen left open.
 */

import { useEffect, useState } from 'react'

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
