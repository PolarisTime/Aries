import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
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
  /*
   * `defaultPageSize` 来自 runtime config 查询：首次渲染时通常还没到（`parentSelectorInitialState`
   * 里是编译期常量 DEFAULT_PAGE_SIZE），配置到达后才变成真实值。它一变就把浮层的 pageSize 跟上，
   * 并把页码重置回第 1 页（否则会停在一个按新条数已不存在的页码上）。
   *
   * 为什么放在**渲染期**而不是 useEffect：这是「由外部值派生本地 state」，
   * 用 effect 会先按旧 pageSize 提交一帧、再补一帧，列表条数/页码会肉眼可见地跳一下，并且多一次
   * 提交与一次多余查询。依据 react.dev《You Might Not Need an Effect》→
   * 「Adjusting some state when a prop changes」：用「记住上一次的值 + 渲染期 setState」代替 effect，
   * React 会在提交前丢弃这一帧重算。
   *
   * 用 `null` 作哨兵而不是直接以 `defaultPageSize` 初始化，是为了保留原有「挂载后一定会把
   * pageSize 对齐到 defaultPageSize」的语义（初始常量与运行时配置经常不同）。
   */
  const [appliedDefaultPageSize, setAppliedDefaultPageSize] = useState<
    number | null
  >(null)
  if (appliedDefaultPageSize !== defaultPageSize) {
    setAppliedDefaultPageSize(defaultPageSize)
    setState({ page: 1, pageSize: defaultPageSize })
  }
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
