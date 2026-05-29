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
