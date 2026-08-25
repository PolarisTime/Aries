import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createGlobalSearchDebouncer,
  normalizeGlobalSearchKeyword,
  shouldSearchGlobalKeyword,
} from '@/layouts/global-search-request'

describe('global search request scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rapid input dispatches only the latest keyword after the debounce window', () => {
    const dispatch = vi.fn()
    const scheduler = createGlobalSearchDebouncer(300)

    scheduler.schedule('S', dispatch)
    scheduler.schedule('SO', dispatch)
    scheduler.schedule('SO-2026', dispatch)

    vi.advanceTimersByTime(299)
    expect(dispatch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith('SO-2026')
  })

  it('cancel prevents a pending search from dispatching', () => {
    const dispatch = vi.fn()
    const scheduler = createGlobalSearchDebouncer(300)

    scheduler.schedule('SO-2026', dispatch)
    scheduler.cancel()
    vi.runAllTimers()

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('normalizes whitespace and skips keywords shorter than two characters', () => {
    expect(normalizeGlobalSearchKeyword('  SO-2026  ')).toBe('SO-2026')
    expect(normalizeGlobalSearchKeyword('   ')).toBe('')
    expect(shouldSearchGlobalKeyword('S')).toBe(false)
    expect(shouldSearchGlobalKeyword('SO')).toBe(true)
    expect(shouldSearchGlobalKeyword('  SO  ')).toBe(true)
  })
})
