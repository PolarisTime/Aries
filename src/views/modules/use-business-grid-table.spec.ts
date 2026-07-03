import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { useBusinessGridTable } from './use-business-grid-table'

const mocks = vi.hoisted(() => ({
  handleColumnOrderChange: vi.fn(),
  handleColumnVisibilityChange: vi.fn(),
  setSelectedRowKeys: vi.fn(),
  setSelectedRowMap: vi.fn(),
  useColumnSettingsSupport: vi.fn(),
  useDataTable: vi.fn(),
  useGridColumns: vi.fn(),
}))

vi.mock('@/hooks/useColumnSettingsSupport', () => ({
  useColumnSettingsSupport: mocks.useColumnSettingsSupport,
}))

vi.mock('@/hooks/useDataTable', () => ({
  useDataTable: mocks.useDataTable,
}))

vi.mock('@/hooks/useGridColumns', () => ({
  ACTION_COLUMN_WIDTH: 50,
  useGridColumns: mocks.useGridColumns,
}))

const config = {
  key: 'sales-order',
  title: '销售订单',
  kicker: '',
  description: '',
  filters: [],
  columns: [
    { title: '订单号', dataIndex: 'orderNo', width: 160 },
    { title: '客户', dataIndex: 'customerName', width: 180 },
  ],
  detailFields: [],
  data: [],
  buildOverview: () => [],
} satisfies ModulePageConfig

const configWithStatus = {
  ...config,
  columns: [
    { title: '订单号', dataIndex: 'orderNo', width: 160 },
    { title: '客户', dataIndex: 'customerName', width: 180 },
    { title: '状态', dataIndex: 'status', type: 'status' },
  ],
  statusMap: {
    草稿: { text: '草稿', color: 'warning' },
  },
} satisfies ModulePageConfig

function mockColumnSettings({
  columnOrder = [],
  columnVisibility = {},
}: {
  columnOrder?: string[]
  columnVisibility?: Record<string, boolean>
} = {}) {
  mocks.useColumnSettingsSupport.mockReturnValue({
    columnOrder,
    columnVisibility,
    handleColumnOrderChange: mocks.handleColumnOrderChange,
    handleColumnVisibilityChange: mocks.handleColumnVisibilityChange,
  })
}

function mockGridColumns() {
  mocks.useGridColumns.mockImplementation(
    ({
      config: currentConfig,
      rowActions,
      canUpdate,
      showActions,
    }: {
      config: ModulePageConfig
      rowActions: (record: ModuleRecord) => unknown
      canUpdate: boolean
      showActions: boolean
    }) => {
      const columns = []

      if (canUpdate || showActions) {
        columns.push({
          id: 'actions',
          header: '操作',
          meta: {
            width: 50,
            align: 'center',
            fixed: 'left',
            renderCell: rowActions,
          },
        })
      }

      for (const column of currentConfig.columns) {
        columns.push({
          id: column.dataIndex,
          header: column.title,
          meta: {
            width: column.width ? `${column.width}px` : '120px',
            align: column.align || 'center',
            renderCell: (record: ModuleRecord) =>
              column.render
                ? column.render(record[column.dataIndex], record)
                : record[column.dataIndex],
          },
        })
      }

      return { columns }
    },
  )
}

function useTestBusinessGridTable(
  currentConfig: ModulePageConfig | undefined,
  overrides: Partial<{
    records: ModuleRecord[]
    canUpdateRecord: boolean
    selectedRowKeys: string[]
    setSelectedRowKeys: (keys: string[]) => void
    setSelectedRowMap: (
      updater: (
        prev: Record<string, ModuleRecord>,
      ) => Record<string, ModuleRecord>,
    ) => void
    buildActions: (record: ModuleRecord) => unknown[]
    showActions: boolean
  }> = {},
) {
  const hasShowActions = Object.hasOwn(overrides, 'showActions')
  return useBusinessGridTable({
    moduleKey: 'sales-order',
    config: currentConfig,
    records: overrides.records ?? [],
    canUpdateRecord: overrides.canUpdateRecord ?? true,
    selectedRowKeys: overrides.selectedRowKeys ?? [],
    setSelectedRowKeys:
      overrides.setSelectedRowKeys ?? mocks.setSelectedRowKeys,
    setSelectedRowMap: overrides.setSelectedRowMap ?? mocks.setSelectedRowMap,
    buildActions: overrides.buildActions ?? (() => []),
    ...(hasShowActions ? { showActions: overrides.showActions } : {}),
  })
}

describe('useBusinessGridTable', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mockColumnSettings()
    mockGridColumns()
    mocks.useDataTable.mockImplementation((options) => ({
      table: { options },
    }))
  })

  it('does not cache an action-only column before config is ready', () => {
    const initialProps: { currentConfig: ModulePageConfig | undefined } = {
      currentConfig: undefined,
    }
    const { result, rerender } = renderHook(
      ({ currentConfig }: { currentConfig: ModulePageConfig | undefined }) =>
        useTestBusinessGridTable(currentConfig),
      { initialProps },
    )

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([])
    expect(mocks.useGridColumns).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ key: 'sales-order', columns: [] }),
        canUpdate: false,
        showActions: false,
      }),
    )
    expect(
      mocks.useGridColumns.mock.calls[0][0].config.buildOverview([]),
    ).toEqual([])

    rerender({ currentConfig: config })

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'orderNo',
      'customerName',
    ])
  })

  it('passes explicit showActions through when config is ready', () => {
    renderHook(() => useTestBusinessGridTable(config, { showActions: false }))

    expect(mocks.useGridColumns).toHaveBeenCalledWith(
      expect.objectContaining({
        canUpdate: true,
        showActions: false,
      }),
    )
  })

  it('derives action availability from update permission and showActions', () => {
    const { result, rerender } = renderHook(
      ({
        canUpdateRecord,
        showActions,
      }: {
        canUpdateRecord: boolean
        showActions: boolean
      }) =>
        useTestBusinessGridTable(config, {
          canUpdateRecord,
          showActions,
        }),
      {
        initialProps: {
          canUpdateRecord: false,
          showActions: true,
        },
      },
    )

    expect(mocks.useGridColumns).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canUpdate: true,
        showActions: true,
      }),
    )
    expect(result.current.antdColumns.map((column) => column.key)).toContain(
      'actions',
    )

    rerender({
      canUpdateRecord: false,
      showActions: false,
    })

    expect(mocks.useGridColumns).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canUpdate: false,
        showActions: false,
      }),
    )
    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'orderNo',
      'customerName',
    ])
  })

  it('moves the status column right after the action column', () => {
    const { result } = renderHook(() =>
      useTestBusinessGridTable(configWithStatus),
    )

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'status',
      'orderNo',
      'customerName',
    ])
  })

  it('keeps the action column first while applying saved column order', () => {
    mockColumnSettings({
      columnOrder: ['customerName', 'actions', 'orderNo'],
    })

    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'customerName',
      'orderNo',
    ])
  })

  it('keeps status after action while applying saved column order', () => {
    mockColumnSettings({
      columnOrder: ['customerName', 'actions', 'orderNo', 'status'],
    })

    const { result } = renderHook(() =>
      useTestBusinessGridTable(configWithStatus),
    )

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'status',
      'customerName',
      'orderNo',
    ])
  })

  it('does not expose clickable header sorting on business grid columns', () => {
    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(
      result.current.antdColumns.map((column) => ({
        key: column.key,
        sorter: 'sorter' in column ? column.sorter : undefined,
        sortOrder: 'sortOrder' in column ? column.sortOrder : undefined,
      })),
    ).toEqual([
      { key: 'actions', sorter: undefined, sortOrder: undefined },
      { key: 'orderNo', sorter: undefined, sortOrder: undefined },
      { key: 'customerName', sorter: undefined, sortOrder: undefined },
    ])
  })

  it('hides configured columns and toggles visibility', () => {
    mockColumnSettings({
      columnVisibility: { customerName: false },
    })

    const { result } = renderHook(() =>
      useTestBusinessGridTable({
        ...config,
        defaultHiddenColumnKeys: ['customerName'],
      }),
    )

    expect(mocks.useColumnSettingsSupport).toHaveBeenCalledWith(
      'sales-order',
      ['customerName'],
      2,
    )
    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'orderNo',
    ])
    expect(result.current.columnVisibleKeys).toEqual(['actions', 'orderNo'])

    act(() => result.current.toggleColumn('customerName'))
    expect(mocks.handleColumnVisibilityChange).toHaveBeenLastCalledWith({})

    act(() => result.current.toggleColumn('orderNo'))
    expect(mocks.handleColumnVisibilityChange).toHaveBeenLastCalledWith({
      customerName: false,
      orderNo: false,
    })
  })

  it('drops saved order entries that no longer have column definitions', () => {
    mockColumnSettings({
      columnOrder: ['ghost', 'customerName'],
    })

    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(result.current.columnOrder).toEqual([
      'actions',
      'ghost',
      'customerName',
      'orderNo',
    ])
    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'customerName',
      'orderNo',
    ])
  })

  it('normalizes function headers and default column alignment', () => {
    mocks.useGridColumns.mockReturnValue({
      columns: [
        {
          id: 'actions',
          header: () => '操作',
          meta: {
            fixed: 'left',
            renderCell: () => 'actions-cell',
          },
        },
        {
          id: 'computed',
          header: () => '计算列',
          meta: {
            renderCell: () => 'computed-cell',
          },
        },
        {
          id: 'plain',
          header: '普通列',
          meta: {
            align: 'right',
            renderCell: () => 'plain-cell',
          },
        },
      ],
    })

    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(
      result.current.antdColumns.map((column) => ({
        key: column.key,
        title: column.title,
        align: column.align,
        className: column.className,
      })),
    ).toEqual([
      {
        key: 'actions',
        title: '',
        align: 'center',
        className: 'sticky-actions-col',
      },
      {
        key: 'computed',
        title: '',
        align: 'center',
        className: undefined,
      },
      {
        key: 'plain',
        title: '普通列',
        align: 'right',
        className: undefined,
      },
    ])
  })

  it('renders action and data cells with the expected table column metadata', () => {
    const buildActions = vi.fn((record: ModuleRecord) => [
      { key: 'edit', label: record.orderNo },
    ])
    const { result } = renderHook(() =>
      useTestBusinessGridTable(config, { buildActions }),
    )
    const actionColumn = result.current.antdColumns[0]
    const orderNoColumn = result.current.antdColumns[1]
    const record = { id: '1', orderNo: 'SO-001', customerName: '上海客户' }

    expect(actionColumn).toEqual(
      expect.objectContaining({
        key: 'actions',
        dataIndex: 'actions',
        fixed: 'left',
        className: 'sticky-actions-col',
        width: 50,
        align: 'center',
        ellipsis: true,
      }),
    )
    expect(actionColumn.onCell?.(record)).toEqual({
      className: 'sticky-actions-col',
    })
    expect(actionColumn.onHeaderCell?.(actionColumn)).toEqual({
      className: 'sticky-actions-col',
    })
    expect(actionColumn.render?.(undefined, record, 0)).toEqual([
      { key: 'edit', label: 'SO-001' },
    ])
    expect(orderNoColumn).toEqual(
      expect.objectContaining({
        key: 'orderNo',
        dataIndex: 'orderNo',
        width: '160px',
        align: 'center',
        className: undefined,
        onCell: undefined,
        onHeaderCell: undefined,
      }),
    )
    expect(orderNoColumn.render?.(undefined, record, 0)).toBe('SO-001')
    expect(buildActions).toHaveBeenCalledWith(record)
  })

  it('returns null when a column has no render metadata', () => {
    mocks.useGridColumns.mockReturnValue({
      columns: [
        {
          id: 'plain',
          header: '普通列',
          meta: {},
        },
      ],
    })

    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(
      result.current.antdColumns[0].render?.(undefined, { id: '1' }, 0),
    ).toBeNull()
  })

  it('updates selected keys through table state and row selection changes', () => {
    let rowMap = {
      stale: { id: 'stale' },
      '1': { id: '1', orderNo: 'old' },
    }
    const setSelectedRowMap = vi.fn((updater) => {
      rowMap = updater(rowMap)
    })
    const records = [
      { id: '1', orderNo: 'SO-001' },
      { id: '2', orderNo: 'SO-002' },
    ]
    const { result } = renderHook(() =>
      useTestBusinessGridTable(config, {
        records,
        selectedRowKeys: ['1'],
        setSelectedRowKeys: mocks.setSelectedRowKeys,
        setSelectedRowMap,
      }),
    )
    const tableOptions = mocks.useDataTable.mock.calls[0][0]

    expect(tableOptions).toEqual(
      expect.objectContaining({
        data: records,
        manualSorting: true,
        enableSorting: false,
        enableRowSelection: true,
        rowSelection: { '1': true },
      }),
    )
    expect(tableOptions.getRowId({ id: '' })).toBe('')

    act(() => {
      tableOptions.onRowSelectionChange({ '1': true, '2': false })
    })
    expect(mocks.setSelectedRowKeys).toHaveBeenCalledWith(['1'])

    act(() => {
      tableOptions.onRowSelectionChange((current: Record<string, boolean>) => ({
        ...current,
        2: true,
      }))
    })
    expect(mocks.setSelectedRowKeys).toHaveBeenLastCalledWith(['1', '2'])

    act(() => {
      result.current.rowSelection?.onChange?.(['2'], [records[1]])
    })

    expect(mocks.setSelectedRowKeys).toHaveBeenLastCalledWith(['2'])
    expect(rowMap).toEqual({
      '2': { id: '2', orderNo: 'SO-002' },
    })
    expect(result.current.rowSelection?.preserveSelectedRowKeys).toBe(true)
  })

  it('keeps selected row map entries that remain selected', () => {
    let rowMap = {
      '1': { id: '1', orderNo: 'old' },
    }
    const setSelectedRowMap = vi.fn((updater) => {
      rowMap = updater(rowMap)
    })
    const record = { id: '1', orderNo: 'SO-001' }
    const { result } = renderHook(() =>
      useTestBusinessGridTable(config, {
        selectedRowKeys: ['1'],
        setSelectedRowMap,
      }),
    )

    act(() => {
      result.current.rowSelection?.onChange?.(['1'], [record])
    })

    expect(rowMap).toEqual({
      '1': { id: '1', orderNo: 'SO-001' },
    })
  })

  it('keeps empty ids from sparse column definitions visible to settings', () => {
    mocks.useGridColumns.mockReturnValue({
      columns: [
        {
          header: '缺失 id',
          meta: {
            renderCell: () => null,
          },
        },
      ],
    })

    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(result.current.columnOrder).toEqual([''])
    expect(result.current.columnVisibleKeys).toEqual([''])
    expect(result.current.antdColumns.map((column) => column.key)).toEqual([])
  })
})
