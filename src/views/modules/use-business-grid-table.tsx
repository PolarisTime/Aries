import { flexRender } from '@tanstack/react-table'
import type { TableColumnsType, TableProps } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { useCallback, useMemo } from 'react'
import type { ActionItem } from '@/components/TableActions'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@/hooks/useDataTable'
import { useDataTable } from '@/hooks/useDataTable'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
interface Props {
  moduleKey: string
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  pageSize: number
  total: number
  canUpdateRecord: boolean
  selectedRowKeys: string[]
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRowMap: (
    updater: (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>,
  ) => void
  buildActions: (record: ModuleRecord) => ActionItem[]
  onPaginationChange: (page: number, pageSize: number) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
}
function mergeColumnOrder(allIds: string[], savedOrder: string[]): string[] {
  const ordered = new Set(savedOrder)
  const merged = [...savedOrder]
  for (const id of allIds) {
    if (!ordered.has(id)) merged.push(id)
  }
  return merged
}
export function useBusinessGridTable({
  moduleKey,
  config,
  records,
  pageSize,
  total,
  canUpdateRecord,
  selectedRowKeys,
  setSelectedRowKeys,
  setSelectedRowMap,
  buildActions,
  onPaginationChange,
  sorting,
  onSortingChange,
}: Props) {
  const {
    columnOrder: savedOrder,
    columnVisibility,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  } = useColumnSettingsSupport(moduleKey, config?.defaultHiddenColumnKeys)
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
  const handlePaginationChange = (p: PaginationState) => {
    onPaginationChange(p.pageIndex + 1, p.pageSize)
  }
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
    pageCount: Math.ceil(total / pageSize),
    total,
    manualPagination: true,
    manualSorting: true,
    enableSorting: true,
    enableRowSelection: canUpdateRecord,
    initialPageSize: pageSize,
    onPaginationChange: handlePaginationChange,
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
  const antdColumns: TableColumnsType<ModuleRecord> = headerGroup
    ? headerGroup.headers.map((header) => ({
        title: flexRender(header.column.columnDef.header, header.getContext()),
        dataIndex: header.column.id,
        key: header.column.id,
        width: (
          header.column.columnDef.meta
        )?.width,
        align: ((
          header.column.columnDef.meta
        )?.align ?? 'center') as ColumnType<ModuleRecord>['align'],
        ellipsis: true,
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
    : []
  const rowSelection: TableProps<ModuleRecord>['rowSelection'] | undefined =
    canUpdateRecord
      ? {
          selectedRowKeys,
          onChange: (keys, rows) => {
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
      : undefined
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
