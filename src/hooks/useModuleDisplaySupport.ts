import dayjs from 'dayjs'

export function useModuleDisplaySupport() {
  const formatCellValue = (value: unknown, columnType?: string): string => {
    if (value === null || value === undefined) return '--'
    if (columnType === 'amount' || columnType === 'number') {
      const num = Number(value)
      return Number.isNaN(num) ? String(value) : num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    if (columnType === 'weight') {
      const num = Number(value)
      return Number.isNaN(num) ? String(value) : num.toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    }
    if (columnType === 'count' || columnType === 'integer') {
      const num = Number(value)
      return Number.isNaN(num) ? String(value) : num.toLocaleString('zh-CN')
    }
    if (columnType === 'date' || columnType === 'datetime') {
      const d = dayjs(value as string | number)
      return d.isValid() ? d.format(columnType === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD') : String(value)
    }
    if (columnType === 'boolean') {
      return value ? '是' : '否'
    }
    return String(value)
  }

  return { formatCellValue }
}
