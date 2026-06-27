import { formatDateTime } from '@/utils/formatters'

export function formatDatabaseDateTime(
  value: string | undefined | null,
): string {
  return formatDateTime(value, '--')
}

const DATABASE_MEMORY_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatDatabaseMemory(
  value: number | string | undefined | null,
): string {
  const numericValue =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (
    typeof numericValue !== 'number' ||
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return '--'
  }

  if (numericValue === 0) {
    return '0 B'
  }

  let unitIndex = 0
  let displayValue = numericValue
  while (displayValue >= 1024 && unitIndex < DATABASE_MEMORY_UNITS.length - 1) {
    displayValue /= 1024
    unitIndex += 1
  }

  const fractionDigits = unitIndex === 0 || displayValue >= 100 ? 0 : 1
  return `${displayValue.toFixed(fractionDigits)} ${DATABASE_MEMORY_UNITS[unitIndex]}`
}
