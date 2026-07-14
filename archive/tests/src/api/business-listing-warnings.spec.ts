import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerWarnMock = vi.hoisted(() => vi.fn())
const loggerErrorMock = vi.hoisted(() => vi.fn())
const getUnsupportedFilterKeysMock = vi.hoisted(() => vi.fn())

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: loggerWarnMock,
    error: loggerErrorMock,
  },
}))

vi.mock('./business-listing-filtering', () => ({
  getUnsupportedFilterKeys: getUnsupportedFilterKeysMock,
}))

import {
  reportClientFilterFallback,
  reportClientFilterTruncation,
  reportUnpaginatedRowFetch,
} from './business-listing-warnings'

describe('business-listing-warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
    } as unknown as Window & typeof globalThis)
  })

  describe('reportClientFilterFallback', () => {
    it('does nothing when no unsupported keys', () => {
      getUnsupportedFilterKeysMock.mockReturnValue([])
      reportClientFilterFallback('purchase-order', { keyword: 'test' })
      expect(loggerWarnMock).not.toHaveBeenCalled()
    })

    it('logs warning for unsupported filters', () => {
      getUnsupportedFilterKeysMock.mockReturnValue(['customField'])
      reportClientFilterFallback('purchase-order', { customField: 'value' })
      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'purchase-order fell back to client-side filtering',
        ),
        expect.any(String),
      )
    })

    it('dispatches custom event on first report', () => {
      getUnsupportedFilterKeysMock.mockReturnValue(['customField'])
      const dispatchSpy = vi.fn()
      vi.stubGlobal('window', { dispatchEvent: dispatchSpy })

      reportClientFilterFallback('test', { customField: 'val' })

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'leo:client-filter-fallback',
          detail: expect.objectContaining({
            moduleKey: 'test',
            unsupportedKeys: ['customField'],
            recurring: false,
          }),
        }),
      )
    })

    it('suppresses repeated reports within interval and re-reports after expiry', () => {
      vi.useFakeTimers()
      getUnsupportedFilterKeysMock.mockReturnValue(['field'])

      reportClientFilterFallback('m', { field: 'v' })
      expect(loggerWarnMock).toHaveBeenCalledTimes(1)

      reportClientFilterFallback('m', { field: 'v' })
      expect(loggerWarnMock).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(5 * 60 * 1000 + 1)
      reportClientFilterFallback('m', { field: 'v' })

      expect(loggerWarnMock).toHaveBeenCalledTimes(2)
      expect(loggerWarnMock).toHaveBeenLastCalledWith(
        expect.stringContaining('(recurring)'),
        expect.any(String),
      )
      vi.useRealTimers()
    })

    it('does not dispatch event when window is undefined', () => {
      getUnsupportedFilterKeysMock.mockReturnValue(['field'])
      vi.stubGlobal('window', undefined)

      expect(() =>
        reportClientFilterFallback('m', { field: 'v' }),
      ).not.toThrow()
    })
  })

  describe('reportClientFilterTruncation', () => {
    it('logs error with max rows detail', () => {
      reportClientFilterTruncation('purchase-order', 2000)
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'purchase-order client-filter hit the hard limit of 2000 rows',
        ),
      )
    })
  })

  describe('reportUnpaginatedRowFetch', () => {
    it('does not warn when row count is under threshold', () => {
      reportUnpaginatedRowFetch('test', 100)
      expect(loggerWarnMock).not.toHaveBeenCalled()
    })

    it('warns when row count exceeds threshold', () => {
      reportUnpaginatedRowFetch('test', 6000)
      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'listAllBusinessModuleRows fetched 6000 rows without pagination',
        ),
      )
    })

    it('warns exactly at threshold', () => {
      reportUnpaginatedRowFetch('test', 5000)
      expect(loggerWarnMock).not.toHaveBeenCalled()
    })
  })
})
