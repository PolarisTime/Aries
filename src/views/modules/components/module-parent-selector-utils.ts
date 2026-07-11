import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import type {
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type ParentSelectorColumn = {
  dataIndex: string
}

const AUDITED_STATUS = '已审核'
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
  if (hasPositiveQuantity(record.importableQuantity)) {
    return true
  }
  if (items.length === 0) {
    return parentModuleKey === 'sales-order'
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
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType'],
) {
  return records.filter((record) => {
    if (isDeletedModuleRecord(record)) {
      return false
    }
    if (
      candidateQueryType === 'purchase-prepayment' &&
      parentModuleKey === 'purchase-order'
    ) {
      const status = asString(record.status)
      return (
        status === DOCUMENT_STATUS.AUDITED ||
        status === DOCUMENT_STATUS.PURCHASE_COMPLETED
      )
    }
    if (
      candidateStatementModuleKey === 'supplier-statement' &&
      parentModuleKey === 'purchase-inbound'
    ) {
      return asString(record.status) === DOCUMENT_STATUS.INBOUND_COMPLETED
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

export function resolveVisibleParentSelectorColumns<
  T extends ParentSelectorColumn,
>(columns: T[], hiddenColumnKeys?: string[]) {
  if (!hiddenColumnKeys?.length) {
    return columns
  }
  const hiddenKeySet = new Set(hiddenColumnKeys)
  return columns.filter((column) => !hiddenKeySet.has(column.dataIndex))
}
