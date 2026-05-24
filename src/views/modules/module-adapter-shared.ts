import type { ModuleRecord } from '@/types/module-page'
import { normalizeStringArray } from '@/utils/normalizers'
import { asString } from '@/utils/type-narrowing'

export { normalizeStringArray }

const primaryNoFallbackKeys = [
  'orderNo',
  'inboundNo',
  'outboundNo',
  'billNo',
  'settingCode',
  'permissionCode',
  'loginName',
  'roleCode',
  'ticketNo',
  'statementNo',
  'receiptNo',
  'paymentNo',
  'receiveNo',
  'issueNo',
  'materialCode',
]

const friendlyTagColorMap: Record<string, Record<string, string>> = {
  permissionType: {
    菜单权限: 'processing',
    按钮权限: 'success',
  },
  roleType: {
    系统角色: 'processing',
    财务角色: 'warning',
  },
  dataScope: {
    全部数据: 'processing',
    本部门: 'success',
    本人: 'default',
  },
  batchNoEnabled: {
    true: 'success',
    false: 'default',
  },
}

const tagListColumnKeySet = new Set(['roleNames'])
const friendlyTagColumnKeySet = new Set(Object.keys(friendlyTagColorMap))

export function parseParentRelationNos(value: unknown) {
  return Array.from(
    new Set(
      asString(value)
        .split(/[，,\s]+/)
        .flatMap((item) => {
          const v = item.trim()
          return v ? [v] : []
        }),
    ),
  )
}

export function getModuleRecordPrimaryNo(
  record: ModuleRecord,
  configuredKey?: string,
) {
  if (configuredKey && record[configuredKey]) {
    return asString(record[configuredKey])
  }

  const fallbackKey = primaryNoFallbackKeys.find((key) => record[key])
  return fallbackKey ? String(record[fallbackKey]) : String(record.id)
}

export function generatePrimaryNo(
  moduleKey: string,
  year: string,
  serial: string,
) {
  const prefixMap: Record<string, string> = {
    'purchase-order': 'CG',
    'purchase-inbound': 'RK',
    'sales-order': 'XS',
    'sales-outbound': 'CK',
    'freight-bill': 'W',
    'purchase-contract': 'CGHT',
    'sales-contract': 'XSHT',
    'supplier-statement': 'GYDZ',
    'customer-statement': 'KHDZ',
    'freight-statement': 'WDZ',
    receipts: 'SK',
    payments: 'FK',
    'invoice-receipt': 'SP',
    'invoice-issue': 'KP',
  }

  return `${year}${prefixMap[moduleKey] || 'NO'}${serial}`
}

export function isTagListColumnKey(columnKey: string) {
  return tagListColumnKeySet.has(columnKey)
}

export function getTagListValues(value: unknown) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const v = String(item)
      return v ? [v] : []
    })
  }

  return asString(value)
    .split(/[，,]+/)
    .flatMap((item) => {
      const v = item.trim()
      return v ? [v] : []
    })
}

export function isFriendlyTagColumnKey(columnKey: string) {
  return friendlyTagColumnKeySet.has(columnKey)
}

export function getFriendlyTagColor(columnKey: string, value: unknown) {
  const normalizedValue = asString(value)
  return friendlyTagColorMap[columnKey]?.[normalizedValue] || 'warning'
}
