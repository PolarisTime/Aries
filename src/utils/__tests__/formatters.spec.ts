import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatDate,
  formatDateTime,
  formatInteger,
  formatWeight,
  parseDateTimeValue,
  toDateTimeMillis,
} from '../formatters'

describe('numeric formatters', () => {
  it('formatInteger returns string of integer', () => {
    expect(formatInteger(42)).toBe('42')
    expect(formatInteger(0)).toBe('0')
    expect(formatInteger(-1)).toBe('-1')
  })

  it('formatAmount keeps 2 decimal places', () => {
    expect(formatAmount(100)).toBe('100.00')
    expect(formatAmount(100.5)).toBe('100.50')
    expect(formatAmount(100.555)).toBe('100.56')
    expect(formatAmount(0)).toBe('0.00')
  })

  it('formatWeight keeps 3 decimal places', () => {
    expect(formatWeight(1.2)).toBe('1.200')
    expect(formatWeight(1.2346)).toBe('1.235')
    expect(formatWeight(0)).toBe('0.000')
  })
})

describe('parseDateTimeValue', () => {
  it('returns null for null/undefined/empty', () => {
    expect(parseDateTimeValue(null)).toBeNull()
    expect(parseDateTimeValue(undefined)).toBeNull()
    expect(parseDateTimeValue('')).toBeNull()
  })

  it('parses Dayjs object', () => {
    const d = dayjs('2024-06-15')
    const result = parseDateTimeValue(d)
    expect(result!.isSame(d)).toBe(true)
  })

  it('returns null for invalid Dayjs object', () => {
    const d = dayjs('invalid-date')
    const result = parseDateTimeValue(d)
    expect(result).toBeNull()
  })

  it('parses Date object', () => {
    const d = new Date(2024, 5, 15)
    const result = parseDateTimeValue(d)
    expect(result!.format('YYYY-MM-DD')).toBe('2024-06-15')
  })

  it('parses numeric timestamp (seconds)', () => {
    const seconds = Math.trunc(new Date(2024, 0, 1, 8, 0, 0).getTime() / 1000)
    const result = parseDateTimeValue(seconds)
    expect(result!.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-01 08:00:00')
  })

  it('parses numeric timestamp (milliseconds)', () => {
    const millis = new Date(2024, 5, 15, 10, 30, 0).getTime()
    const result = parseDateTimeValue(millis)
    expect(result!.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-06-15 10:30:00')
  })

  it('parses compact date yyyyMMdd', () => {
    const result = parseDateTimeValue('20240615')
    expect(result!.format('YYYY-MM-DD')).toBe('2024-06-15')
  })

  it('parses compact datetime yyyyMMddHHmmss', () => {
    const result = parseDateTimeValue('20240615103030')
    expect(result!.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-06-15 10:30:30')
  })

  it('parses ISO string', () => {
    const result = parseDateTimeValue('2024-06-15')
    expect(result!.format('YYYY-MM-DD')).toBe('2024-06-15')
  })

  it('returns null for non-date string', () => {
    expect(parseDateTimeValue('not-a-date')).toBeNull()
  })

  it('returns null for boolean', () => {
    expect(parseDateTimeValue(true)).toBeNull()
  })

  it('parses numeric string timestamp', () => {
    const millis = new Date(2024, 0, 1).getTime()
    const result = parseDateTimeValue(String(millis))
    expect(result!.format('YYYY-MM-DD')).toBe('2024-01-01')
  })

  it('handles 16-digit microsecond timestamps', () => {
    const micros = new Date(2024, 0, 1).getTime() * 1000
    const result = parseDateTimeValue(micros)
    expect(result!.format('YYYY-MM-DD')).toBe('2024-01-01')
  })

  it('handles 19-digit nanosecond timestamps', () => {
    const nanos = new Date(2024, 0, 1).getTime() * 1_000_000
    const result = parseDateTimeValue(nanos)
    expect(result!.format('YYYY-MM-DD')).toBe('2024-01-01')
  })

  it('handles negative timestamp numbers', () => {
    const result = parseDateTimeValue(-1000)
    expect(result).toBeNull()
  })

  it('returns null for Infinity', () => {
    expect(parseDateTimeValue(Infinity)).toBeNull()
  })

  it('returns null for NaN', () => {
    expect(parseDateTimeValue(NaN)).toBeNull()
  })
})

describe('toDateTimeMillis', () => {
  it('returns millis for valid date', () => {
    const millis = new Date(2024, 0, 1).getTime()
    expect(toDateTimeMillis(millis)).toBe(millis)
  })

  it('returns null for invalid value', () => {
    expect(toDateTimeMillis('not-a-date')).toBeNull()
  })

  it('returns null for null', () => {
    expect(toDateTimeMillis(null)).toBeNull()
  })
})

describe('date formatters', () => {
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

  it('returns fallback for null/undefined', () => {
    expect(formatDate(null)).toBe('\u2014')
    expect(formatDate(undefined)).toBe('\u2014')
  })

  it('returns string value as fallback for unparseable values', () => {
    expect(formatDate('garbage')).toBe('garbage')
    expect(formatDate(12345, '--')).toBe('12345')
  })

  it('converts boolean to string', () => {
    expect(formatDate(false)).toBe('false')
    expect(formatDate(true)).toBe('true')
  })

  it('converts bigint to string', () => {
    expect(formatDate(42n)).toBe('42')
  })

  it('returns fallback for object input', () => {
    expect(formatDate({})).toBe('\u2014')
    expect(formatDate({ a: 1 })).toBe('\u2014')
  })

  it('handles negative timestamps', () => {
    const negMillis = new Date(1969, 0, 1).getTime()
    const result = formatDate(negMillis)
    expect(result).toBeTruthy()
  })

  it('handles 11-digit timestamps (seconds with extra digit)', () => {
    const elevenDigits = 10000000000
    const result = formatDate(elevenDigits)
    expect(result).toBeTruthy()
  })

  it('formatDateTime returns fallback for object input', () => {
    expect(formatDateTime({})).toBe('\u2014')
    expect(formatDateTime({ a: 1 }, '--')).toBe('--')
  })
})
