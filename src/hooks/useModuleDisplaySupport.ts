import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatAmount,
  formatDate,
  formatDateTime,
  formatInteger,
  formatWeight,
} from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

export function useModuleDisplaySupport() {
  const { t } = useTranslation()

  const formatCellValue = useCallback(
    (value: unknown, columnType?: string): string => {
      if (value === null || value === undefined || value === '') return '-'
      /*
       * 数值格式一律委托给 utils/formatters 的口径函数（金额 2 位、重量 3 位、整数原样），
       * 不在这里另写 toLocaleString —— 同一口径两处实现必然漂移（曾经表格带千分位、
       * 汇总不带）。
       */
      if (columnType === 'amount' || columnType === 'number') {
        const num = Number(value)
        return Number.isNaN(num) ? asString(value) : formatAmount(num)
      }
      if (columnType === 'weight') {
        const num = Number(value)
        return Number.isNaN(num) ? asString(value) : formatWeight(num)
      }
      if (columnType === 'count' || columnType === 'integer') {
        const num = Number(value)
        return Number.isNaN(num) ? asString(value) : formatInteger(num)
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
    },
    [t],
  )

  return { formatCellValue }
}
