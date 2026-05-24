import dayjs from 'dayjs'

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
  return value.toFixed(3)
}

/**
 * 格式化日期时间（YYYY-MM-DD HH:mm:ss）
 */
export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—'
  }
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

/**
 * 格式化日期（YYYY-MM-DD）
 */
function formatDate(value?: string | null): string {
  if (!value) {
    return '—'
  }
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化百分比
 */
function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
