import dayjs, { type Dayjs } from 'dayjs'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'

const DATE_FORMAT = 'YYYY-MM-DD'
const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/**
 * 格式化整数
 */
export function formatInteger(value: number): string {
  return String(value)
}

/**
 * 格式化金额（保留2位小数）
 */
export function formatAmount(value: number): string {
  return value.toFixed(2)
}

/**
 * 格式化重量（保留3位小数）
 */
export function formatWeight(value: number): string {
  return value.toFixed(DISPLAY_WEIGHT_PRECISION)
}

/**
 * Parse date-like values from API responses.
 *
 * Supported inputs:
 * - ISO/date strings
 * - Unix timestamps in seconds or milliseconds
 * - Numeric timestamp strings
 * - Compact values: yyyyMMdd, yyyyMMddHHmmss
 */
export function parseDateTimeValue(value: unknown): Dayjs | null {
  if (value == null || value === '') {
    return null
  }

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null
  }

  if (value instanceof Date) {
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed : null
  }

  if (typeof value === 'number') {
    return parseNumericDateTime(String(Math.trunc(value)), value)
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  if (/^-?\d+$/.test(normalized)) {
    return parseNumericDateTime(normalized, Number(normalized))
  }

  const parsed = dayjs(normalized)
  return parsed.isValid() ? parsed : null
}

export function toDateTimeMillis(value: unknown): number | null {
  const parsed = parseDateTimeValue(value)
  if (!parsed) {
    return null
  }
  const millis = parsed.valueOf()
  return Number.isFinite(millis) ? millis : null
}

export function formatDate(value: unknown, fallback = '—'): string {
  const parsed = parseDateTimeValue(value)
  return parsed ? parsed.format(DATE_FORMAT) : getDateFallback(value, fallback)
}

/**
 * 格式化日期时间（YYYY-MM-DD HH:mm:ss）
 */
export function formatDateTime(value: unknown, fallback = '—'): string {
  const parsed = parseDateTimeValue(value)
  return parsed
    ? parsed.format(DATE_TIME_FORMAT)
    : getDateFallback(value, fallback)
}

function parseNumericDateTime(rawValue: string, numericValue: number) {
  const compact = parseCompactDateTime(rawValue)
  if (compact) {
    return compact
  }

  const timestamp = normalizeTimestampMillis(rawValue, numericValue)
  if (timestamp == null) {
    return null
  }

  const parsed = dayjs(timestamp)
  return parsed.isValid() ? parsed : null
}

function parseCompactDateTime(rawValue: string) {
  if (!/^\d+$/.test(rawValue)) {
    return null
  }

  if (rawValue.length === 8) {
    const year = Number(rawValue.slice(0, 4))
    const month = Number(rawValue.slice(4, 6))
    const day = Number(rawValue.slice(6, 8))
    return parseDateParts(year, month, day)
  }

  if (rawValue.length === 14) {
    const year = Number(rawValue.slice(0, 4))
    const month = Number(rawValue.slice(4, 6))
    const day = Number(rawValue.slice(6, 8))
    const hour = Number(rawValue.slice(8, 10))
    const minute = Number(rawValue.slice(10, 12))
    const second = Number(rawValue.slice(12, 14))
    return parseDateParts(year, month, day, hour, minute, second)
  }

  return null
}

function parseDateParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const candidate = new Date(year, month - 1, day, hour, minute, second)
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day ||
    candidate.getHours() !== hour ||
    candidate.getMinutes() !== minute ||
    candidate.getSeconds() !== second
  ) {
    return null
  }

  const parsed = dayjs(candidate)
  return parsed.isValid() ? parsed : null
}

function normalizeTimestampMillis(rawValue: string, numericValue: number) {
  if (!Number.isFinite(numericValue)) {
    return null
  }

  const signless = rawValue.replace(/^-/, '')
  if (signless.length === 10) {
    return numericValue * 1000
  }
  if (signless.length === 13) {
    return numericValue
  }
  if (signless.length === 16) {
    return Math.trunc(numericValue / 1000)
  }
  if (signless.length === 19) {
    return Math.trunc(numericValue / 1_000_000)
  }

  const abs = Math.abs(numericValue)
  if (abs >= 1_000_000_000_000) {
    return numericValue
  }
  if (abs >= 1_000_000_000) {
    return numericValue * 1000
  }

  return null
}

function getDateFallback(value: unknown, fallback: string) {
  if (value == null || value === '') {
    return fallback
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }
  return fallback
}
