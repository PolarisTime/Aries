import { useTranslation } from 'react-i18next'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

export function useModuleDisplaySupport() {
  const { t } = useTranslation()

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
      return columnType === 'datetime'
        ? formatDateTime(value, asString(value))
        : formatDate(value, asString(value))
    }
    if (columnType === 'boolean') {
      return value
        ? t('hooks.displaySupport.yes')
        : t('hooks.displaySupport.no')
    }
    return asString(value)
  }

  return { formatCellValue }
}
