import dayjs from 'dayjs'
import { asString } from '@/utils/type-narrowing'

function asDateInput(value: unknown): string | number {
  return typeof value === 'number' ? value : asString(value)
}

export function useModuleDisplaySupport() {
  const formatCellValue = (value: unknown, columnType?: string): string => {
    if (value === null || value === undefined) return '--'
    if (columnType === 'amount' || columnType === 'number') {
      const num = Number(value)
      return Number.isNaN(num)
        ? asString(value)
        : num.toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
    }
    if (columnType === 'weight') {
      const num = Number(value)
      return Number.isNaN(num)
        ? asString(value)
        : num.toLocaleString('zh-CN', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })
    }
    if (columnType === 'count' || columnType === 'integer') {
      const num = Number(value)
      return Number.isNaN(num) ? asString(value) : num.toLocaleString('zh-CN')
    }
    if (columnType === 'date' || columnType === 'datetime') {
      const d = dayjs(asDateInput(value))
      return d.isValid()
        ? d.format(
            columnType === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD',
          )
        : asString(value)
    }
    if (columnType === 'boolean') {
      return value ? '是' : '否'
    }
    return asString(value)
  }

  return { formatCellValue }
}
