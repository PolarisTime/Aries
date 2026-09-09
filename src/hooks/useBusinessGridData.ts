import { useEffect, useMemo, useState } from 'react'
import { fetchAttachmentCounts } from '@/api/business/business-attachments'
import type { AppPageDefinition } from '@/config/page-registry'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useExcelExport } from '@/hooks/useExcelExport'
import { useInfiniteBusinessItems } from '@/hooks/useInfiniteBusinessItems'
import {
  buildDefaultModuleFilters,
  useModuleFilters,
} from '@/hooks/useModuleFilters'
import { useModulePageConfig } from '@/hooks/useModulePageConfig'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'

interface Props {
  moduleKey: ModuleKey
  pageDef: AppPageDefinition
  initialConfig?: ModulePageConfig
}

function createEmptyConfig(moduleKey: ModuleKey): ModulePageConfig {
  return {
    key: moduleKey,
    title: '',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
}

function isListExportAction(action: ModuleActionDefinition) {
  return (
    action.key === 'export' ||
    action.key === 'export_balance' ||
    action.label.includes('导出')
  )
}

function withoutListExportActions(config: ModulePageConfig) {
  if (!config.actions?.length) return config
  const actions = config.actions.filter((action) => !isListExportAction(action))
  return actions.length === config.actions.length
    ? config
    : { ...config, actions }
}

export function useBusinessGridData({
  moduleKey,
  pageDef,
  initialConfig,
}: Props) {
  const { config } = useModulePageConfig({ moduleKey, initialConfig })
  const emptyConfig = useMemo(() => createEmptyConfig(moduleKey), [moduleKey])
  const resolvedConfig = config || emptyConfig
  const canCreateRecord = !resolvedConfig.readOnly
  const canUpdateRecord = !resolvedConfig.readOnly
  const canDeleteRecord = !resolvedConfig.readOnly
  const canAuditRecord = !resolvedConfig.readOnly
  const canPrintRecord = true
  const canUseListExport = pageDef.menuParent === 'master'
  const toolbarConfig = canUseListExport
    ? resolvedConfig
    : withoutListExportActions(resolvedConfig)
  const defaultFilters = useMemo(
    () => buildDefaultModuleFilters(config),
    [config],
  )

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRowMap, setSelectedRowMap] = useState<
    Record<string, ModuleRecord>
  >({})
  const [attachmentCounts, setAttachmentCounts] = useState<
    Record<string, number>
  >({})
  const [currentPage, setCurrentPage] = useState(1)
  const defaultPageSize = useDefaultPageSize()
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const {
    filters,
    submittedFilters,
    applyFilters,
    handleSearch,
    handleReset,
    updateFilter,
    setFilters,
    setSubmittedFilters,
  } = useModuleFilters({
    defaultFilters,
    setCurrentPage: (page: number) => setCurrentPage(page),
  })
  const {
    records,
    total,
    isLoading,
    isFetching,
    errorMessage: listErrorMessage,
    hasError: listHasError,
    retry: retryList,
  } = useInfiniteBusinessItems({
    moduleKey,
    // react-doctor: intentional callback, not event handler
    filters: submittedFilters,
    // react-doctor: intentional callback, not event handler
    enabled: true,
    // react-doctor: intentional callback, not event handler
    currentPage,
    // react-doctor: intentional callback, not event handler
    pageSize,
  })
  const recordIdsKey = records.map((record) => record.id).join(',')

  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { exporting, handleExport: exportModuleRows } =
    useExcelExport(moduleKey)
  const handleExport = async () => {
    if (!canUseListExport) return
    await exportModuleRows(submittedFilters)
  }
  const { getRowClassName } = useModuleRecordHelpers({
    moduleKey,
    config: resolvedConfig,
  })

  useEffect(() => {
    if (resolvedConfig.readOnly) {
      setAttachmentCounts({})
      return
    }
    const recordIds = recordIdsKey.split(',').filter(Boolean)
    if (!recordIds.length) {
      setAttachmentCounts({})
      return
    }

    let cancelled = false
    void fetchAttachmentCounts(moduleKey, recordIds)
      .then((response) => {
        if (!cancelled) {
          setAttachmentCounts(response.counts)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttachmentCounts({})
        }
      })

    return () => {
      cancelled = true
    }
  }, [moduleKey, recordIdsKey, resolvedConfig.readOnly])

  const clearSelection = () => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
  }
  const applyGridFilters: typeof applyFilters = (nextFilters) => {
    clearSelection()
    applyFilters(nextFilters)
  }
  const searchGrid = () => {
    clearSelection()
    handleSearch()
  }
  const resetGridFilters = () => {
    clearSelection()
    handleReset()
  }

  return {
    config,
    resolvedConfig,
    canCreateRecord,
    canUpdateRecord,
    canDeleteRecord,
    canAuditRecord,
    canPrintRecord,
    canUseListExport,
    toolbarConfig,
    defaultFilters,
    selectedRowKeys,
    selectedRowMap,
    setSelectedRowKeys,
    setSelectedRowMap,
    selectedRecords: Object.values(selectedRowMap),
    attachmentCounts,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filters,
    submittedFilters,
    setFilters,
    setSubmittedFilters,
    updateFilter,
    clearSelection,
    applyGridFilters,
    searchGrid,
    resetGridFilters,
    records,
    total,
    isLoading,
    isFetching,
    listErrorMessage,
    listHasError,
    retryList,
    refreshModuleQueries,
    exporting,
    handleExport,
    getRowClassName,
  }
}
