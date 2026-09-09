import i18next from 'i18next'
import type { Key } from 'react'
import type { PatchStateUpdater } from '@/hooks/usePatchState'
import { getDisplayStatus } from '@/module-system/record/module-record-deletion'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { resolveSelectedParentRows } from '../module-parent-selector-utils'
import type { ParentSelectorFormatCellValue } from './parent-selector-mode'
import type { ParentSelectorState } from './use-parent-selector-data'

type SelectedSummaryField = {
  key: string
  label: string
  type?: 'date'
}

function getSelectedRecordSummaryFieldMap(): Record<
  string,
  SelectedSummaryField[]
> {
  return {
    'purchase-order': [
      {
        key: 'supplierName',
        label: i18next.t('modules.parentSelector.summary.supplierName'),
      },
      {
        key: 'buyerName',
        label: i18next.t('modules.parentSelector.summary.buyerName'),
      },
      {
        key: 'orderDate',
        label: i18next.t('modules.parentSelector.summary.orderDate'),
        type: 'date',
      },
    ],
    'purchase-inbound': [
      {
        key: 'supplierName',
        label: i18next.t('modules.parentSelector.summary.supplierName'),
      },
      {
        key: 'purchaseOrderNo',
        label: i18next.t('modules.parentSelector.summary.relatedOrder'),
      },
      {
        key: 'inboundDate',
        label: i18next.t('modules.parentSelector.summary.inboundDate'),
        type: 'date',
      },
    ],
    'sales-order': [
      {
        key: 'customerName',
        label: i18next.t('modules.parentSelector.summary.customerName'),
      },
      {
        key: 'projectName',
        label: i18next.t('modules.parentSelector.summary.projectName'),
      },
      {
        key: 'deliveryDate',
        label: i18next.t('modules.parentSelector.summary.deliveryDate'),
        type: 'date',
      },
    ],
    'sales-outbound': [
      {
        key: 'customerName',
        label: i18next.t('modules.parentSelector.summary.customerName'),
      },
      {
        key: 'projectName',
        label: i18next.t('modules.parentSelector.summary.projectName'),
      },
      {
        key: 'outboundDate',
        label: i18next.t('modules.parentSelector.summary.outboundDate'),
        type: 'date',
      },
    ],
    'freight-bill': [
      {
        key: 'carrierName',
        label: i18next.t('modules.parentSelector.summary.carrierName'),
      },
      {
        key: 'outboundNo',
        label: i18next.t('modules.parentSelector.summary.relatedOutbound'),
      },
      {
        key: 'billTime',
        label: i18next.t('modules.parentSelector.summary.billTime'),
        type: 'date',
      },
    ],
  }
}

export function buildSelectedRecordSummary(
  record: ModuleRecord,
  parentModuleKey: string,
  displayFieldKey: string,
  formatValue: ParentSelectorFormatCellValue,
) {
  const primary = asString(record[displayFieldKey] || record.id)
  const meta = (
    getSelectedRecordSummaryFieldMap()[parentModuleKey] || []
  ).flatMap((field) => {
    const rawValue =
      field.type != null
        ? formatValue(record[field.key], field.type)
        : asString(record[field.key]).trim()
    const value = String(rawValue || '').trim()
    return value ? [`${field.label}：${value}`] : []
  })

  return {
    primary,
    meta,
    status: getDisplayStatus(record).trim(),
  }
}

export interface UseParentSelectorSelectionParams {
  state: ParentSelectorState
  setState: (patch: PatchStateUpdater<ParentSelectorState>) => void
  records: ModuleRecord[]
}

export function useParentSelectorSelection({
  state,
  setState,
  records,
}: UseParentSelectorSelectionParams) {
  const { selectedRowKeys, selectedRecordMap } = state

  const selectedRows = resolveSelectedParentRows(
    selectedRowKeys,
    selectedRecordMap,
    records,
  )

  const toggleRecordSelection = (record: ModuleRecord) => {
    const recordKey = String(record.id)
    const isSelected = selectedRowKeys.includes(recordKey)
    const nextSelectedRecordMap = { ...selectedRecordMap }
    if (isSelected) {
      delete nextSelectedRecordMap[recordKey]
    } else {
      nextSelectedRecordMap[recordKey] = record
    }
    setState({
      selectedRowKeys: isSelected
        ? selectedRowKeys.filter((key) => key !== recordKey)
        : [...selectedRowKeys, recordKey],
      selectedRecordMap: nextSelectedRecordMap,
    })
  }

  const removeSelectedRecord = (recordId: string) => {
    if (!selectedRecordMap[recordId]) {
      setState({
        selectedRowKeys: selectedRowKeys.filter((key) => key !== recordId),
      })
      return
    }
    const nextSelectedRecordMap = { ...selectedRecordMap }
    delete nextSelectedRecordMap[recordId]
    setState({
      selectedRowKeys: selectedRowKeys.filter((key) => key !== recordId),
      selectedRecordMap: nextSelectedRecordMap,
    })
  }

  const handleClearSelectedRecords = () => {
    setState({ selectedRowKeys: [], selectedRecordMap: {} })
  }

  const handleSelectedRowsChange = (keys: Key[], rows: ModuleRecord[]) => {
    const normalizedKeys = keys.map((key) => String(key))
    setState({
      selectedRowKeys: normalizedKeys,
      selectedRecordMap: Object.fromEntries(
        normalizedKeys.map((normalizedKey) => {
          const matchedRow = rows.find(
            (row) => String(row.id) === normalizedKey,
          )
          return [normalizedKey, matchedRow || selectedRecordMap[normalizedKey]]
        }),
      ),
    })
  }

  /** 单选模式：点行/单选钮仅选中该行，导入需经底部确认栏。 */
  const selectSingleRecord = (record: ModuleRecord) => {
    const recordKey = String(record.id)
    setState({
      selectedRowKeys: [recordKey],
      selectedRecordMap: { [recordKey]: record },
    })
  }

  return {
    selectedRowKeys,
    selectedRows,
    toggleRecordSelection,
    removeSelectedRecord,
    handleClearSelectedRecords,
    handleSelectedRowsChange,
    selectSingleRecord,
  }
}
