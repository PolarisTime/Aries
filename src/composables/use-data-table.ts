import {
  useVueTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  type ColumnDef,
  type RowSelectionState,
  type PaginationState,
  type SortingState,
  type ExpandedState,
  type VisibilityState,
  type ColumnOrderState,
  type Updater,
  type Row,
} from '@tanstack/vue-table'
import { type Ref, computed, ref, type WritableComputedRef } from 'vue'

interface UseDataTableOptions<TData> {
  data: Ref<TData[]>
  columns: Ref<ColumnDef<TData, unknown>[]> | ColumnDef<TData, unknown>[]
  getRowId: (row: TData) => string
  /** Enable server-side pagination (default: true). When false, TanStack handles pagination client-side. */
  manualPagination?: boolean
  /** Total page count for server-side pagination */
  pageCount?: Ref<number>
  /** Initial page size */
  initialPageSize?: number
  /** Enable row selection */
  enableRowSelection?: Ref<boolean> | boolean | ((row: Row<TData>) => boolean)
  /** External row selection state (for cross-page tracking in server-side mode) */
  rowSelection?: Ref<RowSelectionState>
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void
  /** Enable row expansion */
  enableExpanding?: Ref<boolean> | boolean
  /** Determine if a row can be expanded */
  getRowCanExpand?: (row: Row<TData>) => boolean
  /** External expanded state */
  expanded?: Ref<ExpandedState>
  onExpandedChange?: (updater: Updater<ExpandedState>) => void
  /** Enable sorting (default: true) */
  enableSorting?: boolean
  /** External sorting state for server-side sorting */
  sorting?: Ref<SortingState>
  onSortingChange?: (updater: Updater<SortingState>) => void
  /** Column visibility state */
  columnVisibility?: Ref<VisibilityState>
  onColumnVisibilityChange?: (updater: Updater<VisibilityState>) => void
  /** Column order state */
  columnOrder?: Ref<ColumnOrderState>
  onColumnOrderChange?: (updater: Updater<ColumnOrderState>) => void
}

export function useDataTable<TData>(options: UseDataTableOptions<TData>) {
  const {
    data,
    columns,
    getRowId,
    manualPagination = true,
    pageCount,
    enableRowSelection,
    rowSelection,
    onRowSelectionChange,
    enableExpanding = false,
    getRowCanExpand,
    expanded,
    onExpandedChange,
    enableSorting = true,
    sorting,
    onSortingChange,
    columnVisibility,
    onColumnVisibilityChange,
    columnOrder,
    onColumnOrderChange,
    initialPageSize = 20,
  } = options

  const resolvedColumns = computed(() =>
    Array.isArray(columns) ? columns : columns.value,
  )

  const pagination = ref<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const paginationUpdater = (updater: Updater<PaginationState>) => {
    pagination.value = typeof updater === 'function'
      ? updater(pagination.value)
      : updater
  }

  const table = useVueTable({
    get data() { return data.value },
    get columns() { return resolvedColumns.value },
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: !manualPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    manualPagination,
    manualSorting: enableSorting,
    pageCount: pageCount?.value,
    state: {
      get pagination() { return pagination.value },
      get rowSelection() { return rowSelection?.value ?? {} },
      get sorting() { return sorting?.value ?? [] },
      get expanded() { return expanded?.value ?? {} },
      get columnVisibility() { return columnVisibility?.value ?? {} },
      get columnOrder() { return columnOrder?.value ?? [] },
    },
    onPaginationChange: paginationUpdater,
    onRowSelectionChange: onRowSelectionChange ?? noop,
    onSortingChange: onSortingChange ?? noop,
    onExpandedChange: onExpandedChange ?? noop,
    onColumnVisibilityChange: onColumnVisibilityChange ?? noop,
    onColumnOrderChange: onColumnOrderChange ?? noop,
    enableRowSelection: typeof enableRowSelection === 'function'
      ? enableRowSelection
      : computed(() => typeof enableRowSelection === 'boolean' ? enableRowSelection : enableRowSelection?.value ?? false).value,
    enableExpanding: computed(() =>
      typeof enableExpanding === 'boolean' ? enableExpanding : enableExpanding?.value ?? false,
    ).value,
    enableSorting,
    getRowCanExpand,
  })

  const currentPage: WritableComputedRef<number> = computed({
    get: () => pagination.value.pageIndex + 1,
    set: (page: number) => {
      pagination.value = { ...pagination.value, pageIndex: Math.max(0, page - 1) }
    },
  })

  const pageSize: WritableComputedRef<number> = computed({
    get: () => pagination.value.pageSize,
    set: (size: number) => {
      pagination.value = { pageIndex: 0, pageSize: size }
    },
  })

  /** Sync external selection map keys into TanStack rowSelection for current page rows */
  function syncRowSelection(keys: Set<string>) {
    const next: RowSelectionState = {}
    for (const row of table.getRowModel().rows) {
      if (keys.has(row.id)) {
        next[row.id] = true
      }
    }
    onRowSelectionChange?.(next)
  }

  return { table, pagination, currentPage, pageSize, syncRowSelection }
}

function noop() {}
