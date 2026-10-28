import type {
  OperationLogCategory,
  OperationLogFilters,
  OperationLogRecord,
  OperationLogSummary,
} from '@/api/system/operation-logs'

/** 时间相对量：由组件用 i18n 组装成「3 分钟前」，便于测试且不绑语言。 */
export type RelativeTimeParts = { value: number; unit: string }

export function relativeTimeParts(
  iso: string,
  now: Date = new Date(),
): RelativeTimeParts | null {
  const time = new Date(iso).getTime()
  if (!Number.isFinite(time)) return null
  const diffMs = time - now.getTime()
  const abs = Math.abs(diffMs)
  const units: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
    { unit: 'day', ms: 86_400_000 },
    { unit: 'hour', ms: 3_600_000 },
    { unit: 'minute', ms: 60_000 },
    { unit: 'second', ms: 1_000 },
  ]
  for (const item of units) {
    if (abs >= item.ms || item.unit === 'second') {
      return { value: Math.round(diffMs / item.ms), unit: item.unit }
    }
  }
  return null
}

/** 耗时展示：<1s 用 ms，>=1s 用 s（保留 1 位）。 */
export function formatDuration(ms: number | undefined): string | null {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return null
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function isFailure(
  record: Pick<OperationLogRecord, 'resultStatus'>,
): boolean {
  return record.resultStatus !== '成功'
}

/** 类别：优先用后端字段，历史数据按路径/模块兜底推断。 */
export function categoryOf(
  record: Pick<
    OperationLogRecord,
    'operationCategory' | 'requestPath' | 'moduleName'
  >,
): OperationLogCategory {
  const value = record.operationCategory?.toUpperCase()
  if (value === 'SESSION' || value === 'BUSINESS' || value === 'SYSTEM') {
    return value
  }
  if (record.requestPath.includes('/auth/')) return 'SESSION'
  if (
    record.requestPath.includes('/system/') ||
    record.moduleName.toLowerCase().includes('system')
  ) {
    return 'SYSTEM'
  }
  return 'BUSINESS'
}

/** 失败原因摘要：优先结构化错误，其次备注，最后 HTTP 状态。 */
export function failureSummary(record: OperationLogRecord): string | null {
  if (!isFailure(record)) return null
  const message = record.errorMessage?.trim()
  if (message) {
    return record.errorCode ? `${record.errorCode}: ${message}` : message
  }
  if (record.remark?.trim()) return record.remark.trim()
  if (record.statusCode !== undefined) return `HTTP ${record.statusCode}`
  return null
}

/** 快捷筛选 → 过滤条件（纯函数，方便测试与本地保存视图）。 */
export function applyQuickFilter(
  quick: 'all' | 'failed' | 'today' | 'mine',
  base: OperationLogFilters,
  context: { today: string; loginName?: string },
): OperationLogFilters {
  const next: OperationLogFilters = { ...base }
  delete next.resultStatus
  delete next.startTime
  delete next.endTime
  delete next.operatorName
  if (quick === 'failed') next.resultStatus = '失败'
  if (quick === 'today') {
    next.startTime = context.today
    next.endTime = context.today
  }
  if (quick === 'mine' && context.loginName) {
    next.operatorName = context.loginName
  }
  return next
}

const CSV_COLUMNS: { key: keyof OperationLogRecord; title: string }[] = [
  { key: 'operationTime', title: '时间' },
  { key: 'operatorName', title: '操作人' },
  { key: 'loginName', title: '登录名' },
  { key: 'moduleName', title: '模块' },
  { key: 'actionType', title: '动作' },
  { key: 'businessNo', title: '单据号' },
  { key: 'resultStatus', title: '结果' },
  { key: 'statusCode', title: 'HTTP' },
  { key: 'durationMs', title: '耗时(ms)' },
  { key: 'clientIp', title: 'IP' },
  { key: 'requestMethod', title: '方法' },
  { key: 'requestPath', title: '路径' },
  { key: 'logNo', title: '日志号' },
  { key: 'errorMessage', title: '失败原因' },
]

const csvCell = (value: unknown): string => {
  const text = value === undefined || value === null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

/** 导出当前页为 CSV（带 BOM，Excel 打开中文不乱码）。 */
export function buildCsv(records: readonly OperationLogRecord[]): string {
  const header = CSV_COLUMNS.map((column) => csvCell(column.title)).join(',')
  const lines = records.map((record) =>
    CSV_COLUMNS.map((column) => csvCell(record[column.key])).join(','),
  )
  return `\uFEFF${[header, ...lines].join('\r\n')}`
}

/** 本地日期键（不能用 toISOString：本地零点会退到前一天）。 */
const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/** 趋势补零：保证 7 天都有柱子，避免只有 2 天数据时图挤在一块。 */
export function fillTrend(
  summary: OperationLogSummary | undefined,
  days: number,
  today: string,
): { date: string; total: number; failed: number }[] {
  const byDate = new Map(
    (summary?.byDay ?? []).map((item) => [item.date, item] as const),
  )
  const base = new Date(`${today}T00:00:00`)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(base)
    date.setDate(base.getDate() - (days - 1 - index))
    const key = localDateKey(date)
    const hit = byDate.get(key)
    return { date: key, total: hit?.total ?? 0, failed: hit?.failed ?? 0 }
  })
}
