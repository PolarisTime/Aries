import type { ModuleRecord } from '@/types/module-page'

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

export function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  )
}

export function parseParentRelationNos(value: unknown) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[，,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

export function getModuleRecordPrimaryNo(record: ModuleRecord, configuredKey?: string) {
  if (configuredKey && record[configuredKey]) {
    return String(record[configuredKey])
  }

  const fallbackKey = primaryNoFallbackKeys.find((key) => record[key])
  return fallbackKey ? String(record[fallbackKey]) : String(record.id)
}

export function generatePrimaryNo(moduleKey: string, year: string, serial: string) {
  const prefixMap: Record<string, string> = {
    'purchase-orders': 'CG',
    'purchase-inbounds': 'RK',
    'sales-orders': 'XS',
    'sales-outbounds': 'CK',
    'freight-bills': 'W',
    'purchase-contracts': 'CGHT',
    'sales-contracts': 'XSHT',
    'supplier-statements': 'GYDZ',
    'customer-statements': 'KHDZ',
    'freight-statements': 'WDZ',
    receipts: 'SK',
    payments: 'FK',
    'invoice-receipts': 'SP',
    'invoice-issues': 'KP',
  }

  return `${year}${prefixMap[moduleKey] || 'NO'}${serial}`
}

export function isTagListColumnKey(columnKey: string) {
  return tagListColumnKeySet.has(columnKey)
}

export function getTagListValues(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }

  return String(value || '')
    .split(/[，,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function isFriendlyTagColumnKey(columnKey: string) {
  return friendlyTagColumnKeySet.has(columnKey)
}

export function getFriendlyTagColor(columnKey: string, value: unknown) {
  const normalizedValue = String(value || '')
  return friendlyTagColorMap[columnKey]?.[normalizedValue] || 'warning'
}
