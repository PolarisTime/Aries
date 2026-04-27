import dayjs from 'dayjs'
import type { Ref } from 'vue'
import type { ModuleColumnDefinition, ModuleDetailField, ModuleRecord } from '@/types/module-page'

export interface StatusMeta {
  text: string
  color: 'default' | 'success' | 'processing' | 'warning' | 'error'
}

export function useModuleDisplaySupport(statusMap: Ref<Record<string, StatusMeta>>) {
  function formatBatchNoEnabled(value: unknown) {
    if (value === true) {
      return '启用'
    }
    if (value === false) {
      return '关闭'
    }
    return '--'
  }

  function formatAmount(value: unknown) {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount.toFixed(2) : '--'
  }

  function formatWeight(value: unknown) {
    const weight = Number(value)
    return Number.isFinite(weight) ? weight.toFixed(3) : '--'
  }

  function formatCount(value: unknown) {
    const count = Number(value)
    return Number.isFinite(count) ? String(count) : '--'
  }

  function formatCellValue(column: ModuleColumnDefinition | undefined, value: unknown) {
    if (!column) {
      if (Array.isArray(value)) {
        return value.length ? value.map((item) => String(item)).join('、') : '--'
      }
      return value ? String(value) : '--'
    }
    if (column.type === 'amount') {
      return formatAmount(value)
    }
    if (column.type === 'weight') {
      return formatWeight(value)
    }
    if (column.type === 'count') {
      return formatCount(value)
    }
    if (column.type === 'date') {
      return value ? dayjs(String(value)).format('YYYY-MM-DD') : '--'
    }
    if (column.dataIndex === 'batchNoEnabled') {
      return formatBatchNoEnabled(value)
    }
    if (Array.isArray(value)) {
      return value.length ? value.map((item) => String(item)).join('、') : '--'
    }
    return value ? String(value) : '--'
  }

  function formatDetailValue(field: ModuleDetailField, record: ModuleRecord | null) {
    if (!record) {
      return '--'
    }

    const value = record[field.key]
    if (field.type === 'amount') {
      return formatAmount(value)
    }
    if (field.type === 'weight') {
      return formatWeight(value)
    }
    if (field.type === 'count') {
      return formatCount(value)
    }
    if (field.type === 'status') {
      return statusMap.value[String(value || '')]?.text || String(value || '--')
    }
    if (field.type === 'date') {
      return value ? dayjs(String(value)).format('YYYY-MM-DD') : '--'
    }
    if (field.key === 'batchNoEnabled') {
      return formatBatchNoEnabled(value)
    }
    if (Array.isArray(value)) {
      return value.length ? value.map((item) => String(item)).join('、') : '--'
    }
    return value ? String(value) : '--'
  }

  function getStatusMeta(value: unknown): StatusMeta {
    return statusMap.value[String(value || '')] || {
      text: String(value || '--'),
      color: 'default',
    }
  }

  return {
    formatAmount,
    formatCellValue,
    formatCount,
    formatDetailValue,
    formatWeight,
    getStatusMeta,
  }
}
