import { useState, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  type Table,
  type Row,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type RowSelectionState,
  type ExpandedState,
  type VisibilityState,
  type ColumnOrderState,
  type OnChangeFn,
  type Updater,
} from '@tanstack/react-table'

interface UseDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  pageCount?: number
  total?: number
  manualPagination?: boolean
  manualSorting?: boolean
  enableSorting?: boolean
  enableRowSelection?: boolean
  enableExpanding?: boolean
  enableColumnVisibility?: boolean
  getRowCanExpand?: (row: TData) => boolean
  initialPageSize?: number
  onPaginationChange?: (pagination: PaginationState) => void
  onSortingChange?: (sorting: SortingState) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  expanded?: ExpandedState
  onExpandedChange?: OnChangeFn<ExpandedState>
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  columnOrder?: ColumnOrderState
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>
}

export function useDataTable<TData>(options: UseDataTableOptions<TData>) {
  const {
    data,
    columns,
    pageCount = -1,
    total = 0,
    manualPagination = true,
    manualSorting = true,
    enableSorting = true,
    enableRowSelection = false,
    enableExpanding = false,
    getRowCanExpand = undefined,
    initialPageSize = 20,
    onPaginationChange,
    onSortingChange,
    rowSelection,
    onRowSelectionChange,
    expanded,
    onExpandedChange,
    columnVisibility,
    onColumnVisibilityChange,
    columnOrder,
    onColumnOrderChange,
  } = options

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const [sorting, setSorting] = useState<SortingState>([])

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater: Updater<PaginationState>) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setPagination(next)
      onPaginationChange?.(next)
    },
    [pagination, onPaginationChange],
  )

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      onSortingChange?.(next)
    },
    [sorting, onSortingChange],
  )

  const table = useReactTable<TData>({
    data,
    columns,
    pageCount,
    manualPagination,
    manualSorting,
    enableSorting,
    enableRowSelection,
    enableExpanding,
    getRowCanExpand: getRowCanExpand as unknown as ((row: Row<TData>) => boolean) | undefined,
    state: {
      pagination,
      sorting,
      ...(rowSelection !== undefined && { rowSelection }),
      ...(expanded !== undefined && { expanded }),
      ...(columnVisibility !== undefined && { columnVisibility }),
      ...(columnOrder !== undefined && { columnOrder }),
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    onRowSelectionChange,
    onExpandedChange,
    onColumnVisibilityChange,
    onColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
  })

  const currentPage = useMemo(() => pagination.pageIndex + 1, [pagination.pageIndex])
  const pageSize = pagination.pageSize

  const setCurrentPage = useCallback(
    (page: number) => {
      const index = Math.max(0, page - 1)
      handlePaginationChange({ pageIndex: index, pageSize: pagination.pageSize })
    },
    [pagination.pageSize, handlePaginationChange],
  )

  return {
    table,
    currentPage,
    pageSize,
    total,
    setCurrentPage,
    pagination,
    sorting,
  } as const
}

export type { UseDataTableOptions }
export type { Table, ColumnDef, PaginationState, SortingState, RowSelectionState, ExpandedState }
