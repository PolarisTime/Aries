import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, toDateTimeMillis } from './formatters'

describe('date time formatters', () => {
  const localMillis = new Date(2024, 0, 1, 8, 0, 0).getTime()
  const localSeconds = Math.trunc(localMillis / 1000)

  it('formats millisecond timestamps', () => {
    expect(formatDateTime(localMillis)).toBe('2024-01-01 08:00:00')
    expect(formatDateTime(String(localMillis))).toBe('2024-01-01 08:00:00')
  })

  it('formats second timestamps', () => {
    expect(formatDateTime(localSeconds)).toBe('2024-01-01 08:00:00')
    expect(formatDateTime(String(localSeconds))).toBe('2024-01-01 08:00:00')
  })

  it('formats compact date strings', () => {
    expect(formatDate('20240101')).toBe('2024-01-01')
    expect(formatDateTime('20240101080910')).toBe('2024-01-01 08:09:10')
  })

  it('keeps caller fallback for blank or invalid values', () => {
    expect(formatDateTime(null, '--')).toBe('--')
    expect(formatDateTime('', '--')).toBe('--')
    expect(formatDateTime('not-a-date', '--')).toBe('not-a-date')
  })

  it('normalizes timestamps to milliseconds', () => {
    expect(toDateTimeMillis(localSeconds)).toBe(localSeconds * 1000)
    expect(toDateTimeMillis(localMillis)).toBe(localMillis)
  })
})
