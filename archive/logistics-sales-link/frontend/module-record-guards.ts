import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export function hasGeneratedSalesOutbound(
  record: ModuleRecord | null | undefined,
): boolean {
  return Boolean(
    asString(record?.sourceSalesOutboundId).trim() ||
      asString(record?.sourceSalesOutboundNo).trim(),
  )
}

export function isDocumentFlowRecordEditLocked(
  moduleKey: string,
  record: ModuleRecord | null | undefined,
): boolean {
  if (!record) {
    return false
  }
  if (moduleKey === 'freight-bill') {
    return hasGeneratedSalesOutbound(record)
  }
  if (moduleKey === 'sales-outbound') {
    return !asString(record.sourceFreightBillId).trim()
  }
  return false
}
