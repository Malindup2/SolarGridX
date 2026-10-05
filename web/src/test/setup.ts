/*
 * setup.ts
 * Runs before every test file: adds the jest-dom matchers and resets the DOM
 * and browser storage so tests never leak state into each other.
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
