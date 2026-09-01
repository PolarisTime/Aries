import { describe, expect, it, vi } from 'vitest'
import {
  cashLedgerReducer,
  createInitialLedgerState,
} from '@/views/finance/CashLedgerView'

describe('cash ledger filter defaults', () => {
  it('defaults the business date range to the previous three months through today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-28T12:00:00+08:00'))

    const state = createInitialLedgerState(30)

    expect(state.startDate).toBe('2026-03-28')
    expect(state.endDate).toBe('2026-06-28')

    vi.useRealTimers()
  })

  it('restores the date range when filters are reset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-28T12:00:00+08:00'))

    const state = createInitialLedgerState(30)
    const changedState = cashLedgerReducer(
      {
        ...state,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
      { type: 'reset-filters' },
    )

    expect(changedState.startDate).toBe('2026-03-28')
    expect(changedState.endDate).toBe('2026-06-28')

    vi.useRealTimers()
  })
})
