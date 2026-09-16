import dayjs from 'dayjs'

export const PERIODS = ['上午', '中午', '下午']
export const BREEDS = ['螺纹钢', '盘螺', '高线', '圆钢']
export const PAGE_SIZE = 20
export const MATRIX_DAYS = 30
export const BACKFILL_POLL_INTERVAL_MS = 3000
/** 本地时区的今天(YYYY-MM-DD); 不用 UTC, 避免跨时区日期偏移。 */
export const today = () => dayjs().format('YYYY-MM-DD')

export const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export type Filters = {
  breed?: string
  material?: string
  factory?: string
  spec?: string
  change?: string
}

export type CalendarMap = Record<
  string,
  { periods: string[]; rows: Record<string, number> }
>

export type QuoteSort = { field?: string; order?: 'asc' | 'desc' }
