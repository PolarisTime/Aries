import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type ParentSelectorColumn = {
  dataIndex: string
}

const AUDITED_STATUS = '已审核'

export function compactParentSelectorFilters(filters: SearchParams) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return true
    }),
  )
}

export function mergeParentSelectorFilters(
  submittedFilters: SearchParams,
  fixedFilters: SearchParams,
) {
  return {
    ...compactParentSelectorFilters(submittedFilters),
    ...compactParentSelectorFilters(fixedFilters),
  }
}

function hasPositiveQuantity(value: unknown) {
  const quantity = Number(value)
  return Number.isFinite(quantity) && quantity > 0
}

export function hasImportableQuantity(
  parentModuleKey: string,
  record: ModuleRecord,
) {
  const items = Array.isArray(record.items) ? record.items : []
  if (
    record.importableQuantity !== undefined &&
    record.importableQuantity !== null
  ) {
    return hasPositiveQuantity(record.importableQuantity)
  }
  // List endpoints return summary rows without loading line items. Keep those
  // rows selectable so the detail resolver can load the authoritative quantity.
  if (!Array.isArray(record.items)) {
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
  const usesDedicatedCandidateEndpoint = Boolean(
    candidateStatementModuleKey || candidateQueryType,
  )
  return records.filter((record) => {
    if (isDeletedModuleRecord(record)) {
      return false
    }
    if (usesDedicatedCandidateEndpoint) {
      return true
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
