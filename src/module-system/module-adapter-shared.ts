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
