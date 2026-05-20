import { flexRender } from '@tanstack/react-table'
import type { TableColumnsType, TableProps } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { useCallback, useMemo, useRef } from 'react'
import type { ActionItem } from '@/components/TableActions'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type {
  ColumnDef,
  RowSelectionState,
  SortingState,
} from '@/hooks/useDataTable'
import { useDataTable } from '@/hooks/useDataTable'
import { useGridColumns } from '@/hooks/useGridColumns'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  canUpdateRecord: boolean
  selectedRowKeys: string[]
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRowMap: (
    updater: (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>,
  ) => void
  buildActions: (record: ModuleRecord) => ActionItem[]
  showActions?: boolean
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
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
  sorting,
  onSortingChange,
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
  const rowSelectionState: RowSelectionState = useMemo(() => {
    const state: RowSelectionState = {}
    for (const id of selectedRowKeys) {
      state[id] = true
    }
    return state
  }, [selectedRowKeys])
  const { columns: columnDefs } = useGridColumns({
    config: config ?? {
      key: '',
      title: '',
      kicker: '',
      description: '',
      filters: [],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    },
    rowActions: buildActions,
    canUpdate: Boolean(config) && canUpdateRecord,
    showActions,
  })
  const allColumnIds = useMemo(
    () =>
      columnDefs.map(
        (c) =>
          (c as ColumnDef<ModuleRecord, unknown> & { id: string }).id || '',
      ),
    [columnDefs],
  )
  const columnOrder = useMemo(
    () => mergeColumnOrder(allColumnIds, savedOrder),
    [allColumnIds, savedOrder],
  )
  const handleAntdSortingChange = useCallback(
    (columnKey?: string | number, order?: 'ascend' | 'descend' | null) => {
      if (!columnKey || !order) {
        onSortingChange([])
        return
      }
      onSortingChange([
        {
          id: String(columnKey),
          desc: order === 'descend',
        },
      ])
    },
    [onSortingChange],
  )
  const { table } = useDataTable<ModuleRecord>({
    data: records,
    columns: columnDefs,
    manualSorting: true,
    enableSorting: true,
    enableRowSelection: canUpdateRecord,
    onSortingChange,
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
    sorting,
  })
  const headerGroup = table.getHeaderGroups()[0]
  const computedColumns: TableColumnsType<ModuleRecord> = useMemo(
    () =>
      headerGroup
        ? headerGroup.headers.map((header) => ({
            title: flexRender(
              header.column.columnDef.header,
              header.getContext(),
            ),
            dataIndex: header.column.id,
            key: header.column.id,
            fixed: header.column.columnDef.meta?.fixed,
            className: header.column.id === 'actions'
              ? 'sticky-actions-col'
              : undefined,
            onCell:
              header.column.id === 'actions'
                ? () => ({ className: 'sticky-actions-col' })
                : undefined,
            onHeaderCell:
              header.column.id === 'actions'
                ? () => ({ className: 'sticky-actions-col' })
                : undefined,
            width: header.column.columnDef.meta?.width,
            align: (header.column.columnDef.meta?.align ??
              'center') as ColumnType<ModuleRecord>['align'],
            ellipsis: false,
            sorter: header.column.getCanSort(),
            sortOrder:
              header.column.getIsSorted() === 'asc'
                ? 'ascend'
                : header.column.getIsSorted() === 'desc'
                  ? 'descend'
                  : null,
            render: (_: unknown, record: ModuleRecord) => {
              const meta = header.column.columnDef.meta
              return meta?.renderCell?.(record) ?? null
            },
          }))
        : [],
    [headerGroup],
  )
  // 保留上一次有效的列定义，避免 config 短暂为 undefined 时表格只显示勾选框
  const prevColumnsRef = useRef<TableColumnsType<ModuleRecord>>([])
  const antdColumns = useMemo(() => {
    if (computedColumns.length > 0) {
      prevColumnsRef.current = computedColumns
      return computedColumns
    }
    return prevColumnsRef.current
  }, [computedColumns])
  const rowSelection: TableProps<ModuleRecord>['rowSelection'] | undefined =
    useMemo(
      () =>
        canUpdateRecord
          ? {
              selectedRowKeys,
              onChange: (keys: React.Key[], rows: ModuleRecord[]) => {
                const normalizedKeys = keys.map(String)
                setSelectedRowKeys(normalizedKeys)
                setSelectedRowMap((prev) => {
                  const next = { ...prev }
                  for (const key of Object.keys(next)) {
                    if (!normalizedKeys.includes(key)) {
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
          : undefined,
      [canUpdateRecord, selectedRowKeys, setSelectedRowKeys, setSelectedRowMap],
    )
  const columnVisibleKeys = useMemo(
    () => allColumnIds.filter((id) => columnVisibility[id] !== false),
    [allColumnIds, columnVisibility],
  )
  const toggleColumn = useCallback(
    (key: string) => {
      const next = { ...columnVisibility }
      if (next[key] === false) {
        delete next[key]
      } else {
        next[key] = false
      }
      handleColumnVisibilityChange(next)
    },
    [columnVisibility, handleColumnVisibilityChange],
  )
  return {
    table,
    antdColumns,
    columnOrder,
    columnVisibleKeys,
    toggleColumn,
    rowSelection,
    onColumnOrderChange: handleColumnOrderChange,
    onSortingChange: handleAntdSortingChange,
  }
}
