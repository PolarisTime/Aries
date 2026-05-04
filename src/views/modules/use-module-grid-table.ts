import { computed, ref, watch, type Ref } from 'vue'
import { getBusinessModuleDetail } from '@/api/business'
import { useDataTable } from '@/composables/use-data-table'
import type { StatusMeta } from '@/composables/use-module-display-support'
import type { ModuleColumnDefinition, ModuleLineItem, ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { inferColumnAlign } from '@/utils/column-utils'
import { useGridColumns } from './use-grid-columns'

type SettingItem = {
  key: string
  title: string
  visible: boolean
}

interface UseModuleGridTableOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  listRows: Ref<ModuleRecord[]>
  canViewRecords: Ref<boolean>
  canEditItemColumns: Ref<boolean>
  isReadOnly: Ref<boolean>
  visibleConfigColumns: Ref<ModuleColumnDefinition[]>
  columnMetaMap: Ref<Record<string, ModuleColumnDefinition>>
  editorColumnSettingItems: Ref<SettingItem[]>
  formatCellValue: (column: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
  canSelectRecord?: (record: ModuleRecord) => boolean
  customExpandedRowKeys?: Ref<string[]>
  isCustomExpandableRow?: (record: ModuleRecord) => boolean
  handleCustomRowExpand?: (expanded: boolean, record: ModuleRecord) => unknown
  isSuccessCode: (code: unknown) => boolean
  showRequestError: (error: unknown, fallbackMessage: string) => void
}

function sumColumnWidths(columns: ModuleColumnDefinition[]) {
  return columns.reduce((sum, column) => sum + (column.width || 120), 0)
}

export function useModuleGridTable(options: UseModuleGridTableOptions) {
  const selectedRowKeys = ref<string[]>([])
  const selectedRowMap = ref<Record<string, ModuleRecord>>({})
  const selectedRowCount = computed(() => selectedRowKeys.value.length)
  const expandedDetailRecordMap = ref<Record<string, ModuleRecord>>({})
  const expandedDetailLoadingKeys = ref<string[]>([])

  const {
    tanstackColumns,
    materialSelectorColumns,
    freightSummaryColumns,
  } = useGridColumns({
    isReadOnly: options.isReadOnly,
    visibleConfigColumns: options.visibleConfigColumns,
    columnMetaMap: options.columnMetaMap,
    formatCellValue: options.formatCellValue,
    getStatusMeta: options.getStatusMeta,
  })

  const rawEditorColumnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
    Object.fromEntries((options.config.value.itemColumns || []).map((column) => [column.dataIndex, column])),
  )

  const visibleEditorColumns = computed(() => {
    if (!options.canEditItemColumns.value) {
      return options.config.value.itemColumns || []
    }

    return options.editorColumnSettingItems.value
      .filter((item) => item.visible)
      .map((item) => rawEditorColumnMetaMap.value[item.key])
      .filter(Boolean)
  })

  const detailTableColumns = computed(() =>
    visibleEditorColumns.value.map((column) => ({
      title: column.title,
      dataIndex: column.dataIndex,
      key: column.dataIndex,
      width: column.width || 120,
      align: inferColumnAlign(column),
      ellipsis: true,
    })),
  )

  const editorDetailTableColumns = computed(() =>
    [
      { title: '序号', dataIndex: '_index', key: '_index', width: 56, align: 'center' as const, fixed: 'left' as const },
      ...visibleEditorColumns.value.map((column) => ({
        title: column.title,
        dataIndex: column.dataIndex,
        key: column.dataIndex,
        width: column.width || 120,
        align: inferColumnAlign(column),
        ellipsis: true,
      })),
    ],
  )

  const detailTableScroll = computed(() => ({
    x: sumColumnWidths(visibleEditorColumns.value),
  }))

  const editorDetailTableScroll = computed(() => ({
    x: sumColumnWidths(visibleEditorColumns.value) + 56,
  }))

  function getRecordKey(record: ModuleRecord) {
    return String(record.id || '')
  }

  function isExpandedDetailLoading(record: ModuleRecord) {
    return expandedDetailLoadingKeys.value.includes(getRecordKey(record))
  }

  function getExpandedDetailRecord(record: ModuleRecord) {
    return expandedDetailRecordMap.value[getRecordKey(record)] || record
  }

  function getExpandedDetailItems(record: ModuleRecord) {
    const detailRecord = getExpandedDetailRecord(record)
    return Array.isArray(detailRecord.items) ? detailRecord.items as ModuleLineItem[] : []
  }

  async function loadExpandedDetailRecord(record: ModuleRecord) {
    const recordKey = getRecordKey(record)
    if (!recordKey || expandedDetailRecordMap.value[recordKey] || isExpandedDetailLoading(record)) {
      return
    }

    expandedDetailLoadingKeys.value = [...expandedDetailLoadingKeys.value, recordKey]
    try {
      const response = await getBusinessModuleDetail(options.moduleKey.value, recordKey)
      if (!options.isSuccessCode(response.code) || !response.data) {
        throw new Error(response.message || '获取明细失败')
      }
      expandedDetailRecordMap.value = {
        ...expandedDetailRecordMap.value,
        [recordKey]: response.data,
      }
    } catch (error) {
      options.showRequestError(error, '获取明细失败')
    } finally {
      expandedDetailLoadingKeys.value = expandedDetailLoadingKeys.value.filter((key) => key !== recordKey)
    }
  }

  const expandable = computed(() => {
    const hasDetailRows = Boolean(options.config.value.itemColumns?.length)
    const hasCustomRows = Boolean(options.isCustomExpandableRow && options.handleCustomRowExpand)
    if (!hasDetailRows && !hasCustomRows) {
      return undefined
    }

    const isCustomExpandable = (record: ModuleRecord) =>
      options.canViewRecords.value && Boolean(options.isCustomExpandableRow?.(record))

    return {
      expandedRowKeys: options.customExpandedRowKeys?.value || [],
      rowExpandable: (record: ModuleRecord) =>
        isCustomExpandable(record) || (hasDetailRows && !options.isCustomExpandableRow?.(record)),
      onExpand: (expanded: boolean, record: ModuleRecord) => {
        if (isCustomExpandable(record)) {
          void options.handleCustomRowExpand?.(expanded, record)
          return
        }
        if (expanded) {
          void loadExpandedDetailRecord(record)
        }
      },
    }
  })

  const gridRowSelection = computed(() => {
    const result: Record<string, boolean> = {}
    for (const key of selectedRowKeys.value) result[key] = true
    return result
  })

  function handleGridSelectionChange(updater: unknown) {
    const nextSelection = typeof updater === 'function'
      ? (updater as (s: Record<string, boolean>) => Record<string, boolean>)(gridRowSelection.value)
      : (updater as Record<string, boolean>)
    const selectedKeys = Object.keys(nextSelection).filter((key) => nextSelection[key])
    const currentRowMap = new Map(
      options.listRows.value.map((record) => [getRecordKey(record), record] as const),
    )
    const nextKeys: string[] = []
    const nextMap: Record<string, ModuleRecord> = {}
    for (const key of selectedKeys) {
      nextKeys.push(key)
      const currentRecord = currentRowMap.get(key)
      if (currentRecord) {
        nextMap[key] = currentRecord
      }
      else if (selectedRowMap.value[key]) {
        nextMap[key] = selectedRowMap.value[key]
      }
    }
    selectedRowKeys.value = nextKeys
    selectedRowMap.value = nextMap
  }

  const { table: mainTable, syncRowSelection } = useDataTable({
    data: options.listRows,
    columns: tanstackColumns,
    getRowId: (row) => String(row.id ?? ''),
    manualPagination: true,
    enableSorting: true,
    enableRowSelection: (row) => options.canSelectRecord?.(row.original) ?? true,
    rowSelection: gridRowSelection,
    onRowSelectionChange: handleGridSelectionChange,
    enableExpanding: computed(() => expandable.value != null),
    expanded: computed(() => {
      const state: Record<string, boolean> = {}
      for (const key of Object.keys(expandedDetailRecordMap.value)) state[key] = true
      for (const key of options.customExpandedRowKeys?.value || []) {
        state[key] = true
      }
      return state
    }),
    onExpandedChange: (updater: unknown) => {
      const next = typeof updater === 'function'
        ? (updater as (s: Record<string, boolean>) => Record<string, boolean>)({})
        : (updater as Record<string, boolean>)
      for (const [recordId, expanded] of Object.entries(next)) {
        if (expanded) {
          const record = options.listRows.value.find((r) => String(r.id ?? '') === recordId)
          if (record && expandable.value?.rowExpandable?.(record)) {
            if (options.isCustomExpandableRow?.(record)) {
              void options.handleCustomRowExpand?.(expanded, record)
            } else {
              void loadExpandedDetailRecord(record)
            }
          }
        }
      }
    },
    getRowCanExpand: (row) => {
      if (!expandable.value) return false
      return expandable.value.rowExpandable?.(row.original) ?? false
    },
  })

  watch(
    options.listRows,
    () => {
      syncRowSelection(new Set(selectedRowKeys.value))
    },
  )

  function resetGridTableState() {
    selectedRowKeys.value = []
    selectedRowMap.value = {}
    expandedDetailRecordMap.value = {}
    expandedDetailLoadingKeys.value = []
  }

  return {
    detailTableColumns,
    detailTableScroll,
    editorDetailTableColumns,
    editorDetailTableScroll,
    expandable,
    expandedDetailRecordMap,
    getExpandedDetailItems,
    isExpandedDetailLoading,
    freightSummaryColumns,
    mainTable,
    materialSelectorColumns,
    resetGridTableState,
    selectedRowCount,
    selectedRowKeys,
    selectedRowMap,
  }
}
