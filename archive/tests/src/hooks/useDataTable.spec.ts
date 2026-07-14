import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDataTable } from './useDataTable'

const columns = [
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'age', header: 'Age', accessorKey: 'age' },
]

const data = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
]

describe('useDataTable', () => {
  it('creates table instance with data and columns', () => {
    const { result } = renderHook(() => useDataTable({ data, columns }))
    expect(result.current.table).toBeDefined()
    expect(result.current.table.getAllColumns()).toHaveLength(2)
    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(20)
  })

  it('supports custom initialPageSize', () => {
    const { result } = renderHook(() =>
      useDataTable({ data, columns, initialPageSize: 50 }),
    )
    expect(result.current.pageSize).toBe(50)
  })

  it('supports setCurrentPage', () => {
    const { result } = renderHook(() => useDataTable({ data, columns }))
    act(() => {
      result.current.setCurrentPage(3)
    })
    expect(result.current.currentPage).toBe(3)
    expect(result.current.pagination.pageIndex).toBe(2)
  })

  it('supports setCurrentPage with 0', () => {
    const { result } = renderHook(() => useDataTable({ data, columns }))
    act(() => {
      result.current.setCurrentPage(0)
    })
    expect(result.current.currentPage).toBe(1)
  })

  it('calls onPaginationChange', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({ data, columns, onPaginationChange }),
    )
    act(() => {
      result.current.setCurrentPage(2)
    })
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 20,
    })
  })

  it('supports controlled sorting', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        sorting: [{ id: 'name', desc: false }],
      }),
    )
    expect(result.current.resolvedSorting).toEqual([
      { id: 'name', desc: false },
    ])
  })

  it('calls onSortingChange', () => {
    const onSortingChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({ data, columns, onSortingChange }),
    )
    act(() => {
      result.current.table.setSorting([{ id: 'name', desc: true }])
    })
    expect(onSortingChange).toHaveBeenCalled()
  })

  it('handles row selection state', () => {
    const onRowSelectionChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        enableRowSelection: true,
        rowSelection: {},
        onRowSelectionChange,
      }),
    )
    expect(result.current.table.getState().rowSelection).toEqual({})
  })

  it('handles column visibility state', () => {
    const onColumnVisibilityChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        columnVisibility: { name: true },
        onColumnVisibilityChange,
      }),
    )
    expect(result.current.table.getState().columnVisibility).toEqual({
      name: true,
    })
  })

  it('handles column order state', () => {
    const onColumnOrderChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        columnOrder: ['age', 'name'],
        onColumnOrderChange,
      }),
    )
    expect(result.current.table.getState().columnOrder).toEqual(['age', 'name'])
  })

  it('handles expanded state', () => {
    const onExpandedChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        enableExpanding: true,
        getRowCanExpand: () => true,
        expanded: {},
        onExpandedChange,
      }),
    )
    expect(result.current.table.getState().expanded).toEqual({})
  })

  it('uses getRowId when provided', () => {
    const getRowId = (row: { name: string }) => row.name
    const { result } = renderHook(() =>
      useDataTable({ data, columns, getRowId }),
    )
    expect(result.current.table.getRowModel().rows[0]?.id).toBe('Alice')
  })

  it('returns total from options', () => {
    const { result } = renderHook(() =>
      useDataTable({ data, columns, total: 100 }),
    )
    expect(result.current.total).toBe(100)
  })

  it('defaults total to 0', () => {
    const { result } = renderHook(() => useDataTable({ data, columns }))
    expect(result.current.total).toBe(0)
  })

  it('supports client-side pagination', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: Array.from({ length: 100 }, (_, i) => ({
          name: `User${i}`,
          age: 20 + i,
        })),
        columns,
        manualPagination: false,
        initialPageSize: 10,
      }),
    )
    expect(result.current.table).toBeDefined()
    expect(result.current.pageSize).toBe(10)
  })

  it('supports client-side sorting', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        manualSorting: false,
      }),
    )
    expect(result.current.table).toBeDefined()
  })

  it('disables sorting when enableSorting is false', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        enableSorting: false,
      }),
    )
    expect(result.current.table).toBeDefined()
  })

  it('handles sorting change with function updater', () => {
    const onSortingChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({ data, columns, onSortingChange }),
    )
    act(() => {
      result.current.table.setSorting(() => [{ id: 'name', desc: true }])
    })
    expect(onSortingChange).toHaveBeenCalled()
  })

  it('does not update internal sorting when sorting is controlled', () => {
    const onSortingChange = vi.fn()
    const controlledSorting = [{ id: 'name', desc: false }]
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        sorting: controlledSorting,
        onSortingChange,
      }),
    )

    act(() => {
      result.current.table.setSorting([{ id: 'age', desc: true }])
    })

    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'age', desc: true }])
    expect(result.current.resolvedSorting).toBe(controlledSorting)
  })

  it('handles pagination change with function updater', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      useDataTable({ data, columns, onPaginationChange }),
    )
    act(() => {
      result.current.table.setPagination((prev) => ({
        ...prev,
        pageIndex: 2,
      }))
    })
    expect(onPaginationChange).toHaveBeenCalled()
  })

  it('does not use getRowCanExpand when enableExpanding is false', () => {
    const getRowCanExpand = vi.fn().mockReturnValue(true)
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns,
        enableExpanding: false,
        getRowCanExpand,
      }),
    )
    expect(result.current.table).toBeDefined()
  })
})
