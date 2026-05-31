import type { TableColumnsType, TableProps } from 'antd'
import type { ColumnType } from 'antd/es/table'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { ActionItem } from '@/components/TableActions'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type { ColumnDef, RowSelectionState } from '@/hooks/useDataTable'
import { ACTION_COLUMN_WIDTH } from '@/hooks/useGridColumns'
import { useDataTable } from '@/hooks/useDataTable'
import { useGridColumns } from '@/hooks/useGridColumns'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  canUpdateRecord: boolean
  selectedRowKeys: string[]
  setSelectedRowKeys: Dispatch<SetStateAction<string[]>>
  setSelectedRowMap: (
    updater: (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>,
  ) => void
  buildActions: (record: ModuleRecord) => ActionItem[]
  showActions?: boolean
}

function mergeColumnOrder(allIds: string[], savedOrder: string[]): string[] {
  const ordered = new Set(savedOrder)
  const merged = [...savedOrder]
  for (const id of allIds) {
    if (!ordered.has(id)) merged.push(id)
  }
  // 强制操作列始终排在数据列第一位（勾选框之后）
  const idx = merged.indexOf('actions')
  if (idx > 0) {
    merged.splice(idx, 1)
    merged.unshift('actions')
  }
  return merged
}

function buildAntdColumns({
  columnDefs,
  columnOrder,
  columnVisibility,
}: {
  columnDefs: ColumnDef<ModuleRecord, unknown>[]
  columnOrder: string[]
  columnVisibility: Record<string, boolean>
}): TableColumnsType<ModuleRecord> {
  const columnMap = new Map(
    columnDefs.map((column) => [
      (column as ColumnDef<ModuleRecord, unknown> & { id: string }).id,
      column,
    ]),
  )
  return columnOrder.flatMap((columnId) => {
    if (columnVisibility[columnId] === false) {
      return []
    }
    const columnDef = columnMap.get(columnId)
    if (!columnDef) {
      return []
    }
    const title: ReactNode =
      typeof columnDef.header === 'function' ? '' : columnDef.header
    return [
      {
        title,
        dataIndex: columnId,
        key: columnId,
        fixed: columnDef.meta?.fixed as ColumnType<ModuleRecord>['fixed'],
        className: columnId === 'actions' ? 'sticky-actions-col' : undefined,
        onCell:
          columnId === 'actions'
            ? () => ({ className: 'sticky-actions-col' })
            : undefined,
        onHeaderCell:
          columnId === 'actions'
            ? () => ({ className: 'sticky-actions-col' })
            : undefined,
        width:
          columnId === 'actions'
            ? ACTION_COLUMN_WIDTH
            : columnDef.meta?.width,
        align: (columnDef.meta?.align ??
          'center') as ColumnType<ModuleRecord>['align'],
        ellipsis: true,
        render: (_: unknown, record: ModuleRecord) => {
          return columnDef.meta?.renderCell?.(record) ?? null
        },
      },
    ]
  })
}

export function useBusinessGridTable({
  moduleKey,
  config,
  records,
  canUpdateRecord,
  selectedRowKeys,
  setSelectedRowKeys,
  setSelectedRowMap,
  buildActions,
  showActions,
}: Props) {
  const totalColumnCount = config?.columns?.length ?? 0
  const {
    columnOrder: savedOrder,
    columnVisibility,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  } = useColumnSettingsSupport(
    moduleKey,
    config?.defaultHiddenColumnKeys,
    totalColumnCount,
  )
  const rowSelectionState: RowSelectionState = (() => {
    const state: RowSelectionState = {}
    for (const id of selectedRowKeys) {
      state[id] = true
    }
    return state
  })()
  const fallbackConfig: ModulePageConfig = {
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
  const { columns: columnDefs } = useGridColumns({
    config: config ?? fallbackConfig,
    rowActions: buildActions,
    canUpdate: Boolean(config) && (canUpdateRecord || Boolean(showActions)),
    showActions: Boolean(config) && showActions,
  })
  const allColumnIds = columnDefs.map(
    (c) => (c as ColumnDef<ModuleRecord, unknown> & { id: string }).id || '',
  )
  const columnOrder = mergeColumnOrder(allColumnIds, savedOrder)
  const { table } = useDataTable<ModuleRecord>({
    data: records,
    columns: columnDefs,
    manualSorting: true,
    enableSorting: false,
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
    rowSelection: rowSelectionState,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(rowSelectionState) : updater
      setSelectedRowKeys(Object.keys(next).filter((k) => next[k]))
    },
    columnVisibility,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    columnOrder,
    onColumnOrderChange: handleColumnOrderChange,
  })
  const computedColumns = buildAntdColumns({
    columnDefs,
    columnOrder,
    columnVisibility,
  })
  const antdColumns = computedColumns
  const rowSelection: TableProps<ModuleRecord>['rowSelection'] | undefined = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: ModuleRecord[]) => {
      const normalizedKeys = keys.map(String)
      const normalizedKeysSet = new Set(normalizedKeys)
      setSelectedRowKeys(normalizedKeys)
      setSelectedRowMap((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (!normalizedKeysSet.has(key)) {
            delete next[key]
          }
        }
        for (const row of rows) {
          next[String(row.id)] = row
        }
        return next
      })
    },
    preserveSelectedRowKeys: true,
  }
  const columnVisibleKeys = allColumnIds.filter(
    (id) => columnVisibility[id] !== false,
  )
  const toggleColumn = (key: string) => {
    const next = { ...columnVisibility }
    if (next[key] === false) {
      delete next[key]
    } else {
      next[key] = false
    }
    handleColumnVisibilityChange(next)
  }
  return {
    table,
    antdColumns,
    columnOrder,
    columnVisibleKeys,
    toggleColumn,
    rowSelection,
    onColumnOrderChange: handleColumnOrderChange,
  }
}
