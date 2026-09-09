import type { ColumnsType } from 'antd/es/table'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { usePatchState } from '@/hooks/usePatchState'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import {
  buildParentSelectorDataColumns,
  buildParentSelectorDetailToggleColumn,
} from './parent-selector/parent-selector-columns'
import { useParentSelectorConfirm } from './parent-selector/use-parent-selector-confirm'
import {
  EMPTY_FIXED_FILTERS,
  parentSelectorInitialState,
  useParentSelectorData,
} from './parent-selector/use-parent-selector-data'
import { useParentSelectorDetail } from './parent-selector/use-parent-selector-detail'
import { useParentSelectorSelection } from './parent-selector/use-parent-selector-selection'

export type {
  ParentSelectorFormatCellValue,
  ParentSelectorTranslator,
} from './parent-selector/parent-selector-mode'
export {
  DEFAULT_PAGE_SIZE,
  EMPTY_FIXED_FILTERS,
} from './parent-selector/use-parent-selector-data'
export { buildSelectedRecordSummary } from './parent-selector/use-parent-selector-selection'

export interface ModuleParentSelectorOverlayContentProps {
  parentModuleKey: string
  parentDisplayFieldKey?: string
  allowMultipleSelection?: boolean
  candidateStatementModuleKey?: 'customer-statement' | 'freight-statement'
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType']
  hiddenSelectorColumnKeys?: ModuleParentImportDefinition['hiddenSelectorColumnKeys']
  fixedFilters?: SearchParams
  title?: string
  onSelect: (records: ModuleRecord[]) => void
  onClose: () => void
}

const parentDisplayFieldFallbackMap: Record<string, string> = {
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'freight-bill': 'billNo',
}

export function useModuleParentSelectorOverlay({
  parentModuleKey,
  parentDisplayFieldKey,
  allowMultipleSelection = false,
  candidateStatementModuleKey,
  candidateQueryType,
  hiddenSelectorColumnKeys,
  fixedFilters = EMPTY_FIXED_FILTERS,
  title,
  onSelect,
  onClose,
}: ModuleParentSelectorOverlayContentProps) {
  const { t } = useTranslation()
  const effectiveTitle = title ?? t('modules.parentSelector.title')
  const { formatCellValue } = useModuleDisplaySupport()
  const defaultPageSize = useDefaultPageSize()
  const [state, setState] = usePatchState(parentSelectorInitialState)
  useEffect(() => {
    setState({ page: 1, pageSize: defaultPageSize })
  }, [defaultPageSize, setState])
  const displayFieldKey =
    parentDisplayFieldKey ||
    parentDisplayFieldFallbackMap[parentModuleKey] ||
    'id'

  const {
    draftFilters,
    submittedFilters,
    page,
    pageSize,
    records,
    total,
    parentPageConfig,
    overlayFilterConfig,
    isLoading,
    updateFilter,
    applyFilters,
    resetFilters,
    handlePageChange,
    detailRequestVersionsRef,
    loadDetailRecord,
  } = useParentSelectorData({
    parentModuleKey,
    candidateStatementModuleKey,
    candidateQueryType,
    fixedFilters,
    state,
    setState,
  })

  const {
    selectedRowKeys,
    selectedRows,
    toggleRecordSelection,
    removeSelectedRecord,
    handleClearSelectedRecords,
    handleSelectedRowsChange,
    selectSingleRecord,
  } = useParentSelectorSelection({
    state,
    setState,
    records,
  })

  const { detailExpandedRowKeys, toggleDetail, renderDetail } =
    useParentSelectorDetail({
      state,
      setState,
      parentPageConfig,
      displayFieldKey,
      t,
      detailRequestVersionsRef,
      loadDetailRecord,
    })

  const { selectedSummary, handleImportRecords } = useParentSelectorConfirm({
    parentModuleKey,
    candidateStatementModuleKey,
    candidateQueryType,
    selectedRows,
    displayFieldKey,
    allowMultipleSelection,
    t,
    onSelect,
    onClose,
  })

  const dataColumns: ColumnsType<ModuleRecord> = buildParentSelectorDataColumns(
    {
      parentModuleKey,
      displayFieldKey,
      hiddenSelectorColumnKeys,
      formatCellValue,
    },
  )
  const detailToggleColumn = buildParentSelectorDetailToggleColumn({
    detailExpandedRowKeys,
    toggleDetail,
    t,
  })
  const columns: ColumnsType<ModuleRecord> = [
    detailToggleColumn,
    ...dataColumns,
  ]

  return {
    allowMultipleSelection,
    applyFilters,
    columns,
    detailExpandedRowKeys,
    displayFieldKey,
    draftFilters,
    effectiveTitle,
    formatCellValue,
    handleClearSelectedRecords,
    handleImportRecords,
    handlePageChange,
    handleSelectedRowsChange,
    isLoading,
    onClose,
    overlayFilterConfig,
    page,
    pageSize,
    parentModuleKey,
    records,
    removeSelectedRecord,
    renderDetail,
    resetFilters,
    selectSingleRecord,
    selectedRows,
    selectedRowKeys,
    selectedSummary,
    submittedFilters,
    t,
    toggleDetail,
    toggleRecordSelection,
    total,
    updateFilter,
  }
}
