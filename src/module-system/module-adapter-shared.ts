import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

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
  'categoryCode',
  'supplierCode',
  'customerCode',
  'carrierCode',
  'warehouseCode',
  'departmentCode',
]

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
  fullDate = year,
) {
  const masterPrefixMap: Record<string, string> = {
    material: 'MAT',
    'material-categories': 'MC',
    supplier: 'SUP',
    customer: 'CUS',
    carrier: 'CAR',
    warehouse: 'WH',
  }

  const masterPrefix = masterPrefixMap[moduleKey]
  if (masterPrefix) {
    return `${masterPrefix}${serial.slice(-4)}`
  }

  if (moduleKey === 'department') {
    return `${fullDate}-${serial.slice(-4)}`
  }

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
