import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const AUDITED_STATUS = '已审核'
const PURCHASE_COMPLETED_STATUS = '完成采购'
const SALES_COMPLETED_STATUS = '完成销售'

function hasPositiveQuantity(value: unknown) {
  const quantity = Number(value)
  return Number.isFinite(quantity) && quantity > 0
}

export function hasImportableQuantity(
  parentModuleKey: string,
  record: ModuleRecord,
) {
  const items = Array.isArray(record.items) ? record.items : []
  if (items.length === 0) {
    return false
  }

  if (parentModuleKey === 'purchase-order') {
    return items.some((item) =>
      hasPositiveQuantity(
        item.salesRemainingQuantity ?? item.remainingQuantity ?? item.quantity,
      ),
    )
  }

  if (parentModuleKey === 'sales-order') {
    return items.some((item) =>
      hasPositiveQuantity(item.remainingQuantity ?? item.quantity),
    )
  }

  return true
}

export function filterImportableParentRecords(
  parentModuleKey: string,
  records: ModuleRecord[],
  candidateStatementModuleKey?: string,
) {
  return records.filter((record) => {
    if (
      candidateStatementModuleKey === 'supplier-statement' &&
      parentModuleKey === 'purchase-inbound'
    ) {
      return asString(record.status) === PURCHASE_COMPLETED_STATUS
    }
    if (
      candidateStatementModuleKey === 'customer-statement' &&
      parentModuleKey === 'sales-order'
    ) {
      return asString(record.status) === SALES_COMPLETED_STATUS
    }
    if (
      candidateStatementModuleKey === 'freight-statement' &&
      parentModuleKey === 'freight-bill'
    ) {
      return asString(record.status) === AUDITED_STATUS
    }
    if (
      parentModuleKey === 'purchase-order' ||
      parentModuleKey === 'sales-order'
    ) {
      return (
        asString(record.status) === AUDITED_STATUS &&
        hasImportableQuantity(parentModuleKey, record)
      )
    }
    if (parentModuleKey === 'freight-bill') {
      return asString(record.status) === AUDITED_STATUS
    }
    return true
  })
}

export function resolveSelectedParentRows(
  selectedRowKeys: string[],
  selectedRecordMap: Record<string, ModuleRecord>,
  currentRecords: ModuleRecord[],
) {
  const currentRecordMap = new Map(
    currentRecords.map((record) => [String(record.id), record]),
  )
  return selectedRowKeys.flatMap((key) => {
    const normalizedKey = String(key)
    const record =
      currentRecordMap.get(normalizedKey) || selectedRecordMap[normalizedKey]
    return record ? [record] : []
  })
}
