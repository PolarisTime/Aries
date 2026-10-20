import dayjs, { type Dayjs } from 'dayjs'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'

export const DISPLAY_DATE_FORMAT = 'YYYY年MM月DD日'
export const DISPLAY_DATE_TIME_FORMAT = 'YYYY年MM月DD日 HH:mm:ss'

/**
 * 日期（时间）选择器的格式列表：**第一个用于展示**，其余用于解析。
 *
 * <p>展示统一走中文口径；同时保留 ISO 作为手输兼容格式 —— rc-picker 严格按列表里的格式解析，
 * 只给中文格式会让沿用 ISO 习惯直接键入的用户「输了但没生效」。</p>
 */
export const DATE_PICKER_FORMATS = [DISPLAY_DATE_FORMAT, 'YYYY-MM-DD']
export const DATE_TIME_PICKER_FORMATS = [
  DISPLAY_DATE_TIME_FORMAT,
  'YYYY-MM-DD HH:mm:ss',
]

/**
 * 格式化整数
 */
export function formatInteger(value: number): string {
  return String(value)
}

/**
 * 金额 / 重量等数值**一律不使用千分位分隔符**（`useGrouping: false`）。
 *
 * <p>这是产品决定：界面上的数字要能被直接复制进 Excel / 搜索框 / 其他系统而不带分隔符，
 * 复制 `1981382.98` 比复制 `1,981,382.98` 更不容易出错（后者粘进表单常常变成两段）。</p>
 *
 * <p>收敛说明：表格单元格（`useModuleDisplaySupport`）、对账模型、单据引用浮层原先各自写了
 * 一份 `toLocaleString`，与这里重复。同一口径多处实现必然漂移，因此统一改为调用本文件的
 * {@link formatAmount} / {@link formatWeight}，不要在新代码里再写 `toLocaleString`。</p>
 */
export function formatAmount(value: number): string {
  return value.toLocaleString('zh-CN', {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * 格式化重量（3 位小数、不带千分位，与 {@link formatAmount} 同一约定）
 */
export function formatWeight(value: number): string {
  return value.toLocaleString('zh-CN', {
    useGrouping: false,
    minimumFractionDigits: DISPLAY_WEIGHT_PRECISION,
    maximumFractionDigits: DISPLAY_WEIGHT_PRECISION,
  })
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

export function formatDate(value: unknown, fallback = '—'): string {
  const parsed = parseDateTimeValue(value)
  return parsed
    ? parsed.format(DISPLAY_DATE_FORMAT)
    : getDateFallback(value, fallback)
}

/**
 * 格式化日期时间（YYYY年MM月DD日 HH:mm:ss）
 */
export function formatDateTime(value: unknown, fallback = '—'): string {
  const parsed = parseDateTimeValue(value)
  return parsed
    ? parsed.format(DISPLAY_DATE_TIME_FORMAT)
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

  return dayjs(candidate)
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
