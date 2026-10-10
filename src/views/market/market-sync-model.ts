import dayjs from 'dayjs'

export const PERIODS = ['上午', '中午', '下午']
export const BREEDS = ['螺纹钢', '盘螺', '高线', '圆钢']
export const PAGE_SIZE = 20
export const MATRIX_DAYS = 30
export const BACKFILL_POLL_INTERVAL_MS = 3000
/** 本地时区的今天(YYYY-MM-DD); 不用 UTC, 避免跨时区日期偏移。 */
export const today = () => dayjs().format('YYYY-MM-DD')

/** 周六/周日。只是"没有行情"的兜底判据, 不能当成交易日的唯一依据(调休上班日是工作日)。 */
export const isWeekend = (date: string) => {
  const dow = dayjs(date).day()
  return dow === 0 || dow === 6
}

/**
 * 是否交易日: **有行情即为交易日**, 否则工作日按"待同步"处理。
 *
 * <p>不能只按周末判断: 法定节假日(如国庆 10-01~10-07)与调休上班的周六日(如 2026-10-10)
 * 都不服从「周六周日无行情」的直觉 —— 项目里补数逻辑已按同一结论处理
 * ({@code SteelQuoteSyncService#backfill} 不再按周末盲跳), 覆盖矩阵与覆盖统计必须一致,
 * 否则会把有行情的调休上班日显示成"休市"(不可点、不计入覆盖)。</p>
 */
export const isTradingDay = (date: string, periods?: readonly string[]) =>
  Boolean(periods?.length) || !isWeekend(date)

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
