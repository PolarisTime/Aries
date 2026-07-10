import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Key, ReactNode } from 'react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModuleRecord } from '@/types/module-page'
import { ModuleParentSelectorOverlay } from './ModuleParentSelectorOverlay'
import {
  filterImportableParentRecords,
  hasImportableQuantity,
  resolveSelectedParentRows,
  resolveVisibleParentSelectorColumns,
} from './module-parent-selector-utils'
import { getOverlayStatusMap } from './useModuleParentSelectorOverlay'

const parentSelectorMocks = vi.hoisted(() => ({
  parentRows: [{ id: 'parent-1', name: '父单据 1', items: [{ id: 'item-1' }] }],
  getBusinessModuleDetail: vi.fn(),
  getModuleConfig: vi.fn(),
  listBusinessModule: vi.fn(),
  listFreightBillImportCandidatePage: vi.fn(),
  listPurchaseOrderImportCandidatePage: vi.fn(),
  listSalesOrderOutboundImportCandidatePage: vi.fn(),
  listStatementCandidatePage: vi.fn(),
  loadBusinessPageConfig: vi.fn(),
  messageError: vi.fn(),
  useQuery: vi.fn(),
}))

const parentRows = parentSelectorMocks.parentRows as ModuleRecord[]

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: 'keepPreviousData',
  useQuery: (...args: unknown[]) => parentSelectorMocks.useQuery(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.count == null ? key : `${key}:${options.count}`,
  }),
}))

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: (...args: unknown[]) =>
    parentSelectorMocks.getBusinessModuleDetail(...args),
  listBusinessModule: (...args: unknown[]) =>
    parentSelectorMocks.listBusinessModule(...args),
}))

vi.mock('@/api/business-listing-filtering', () => ({
  buildFilterParams: (_moduleKey: string, filters: Record<string, unknown>) =>
    filters,
}))

vi.mock('@/api/freight-bill-candidates', () => ({
  listFreightBillImportCandidatePage: (...args: unknown[]) =>
    parentSelectorMocks.listFreightBillImportCandidatePage(...args),
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: (...args: unknown[]) =>
    parentSelectorMocks.getModuleConfig(...args),
}))

vi.mock('@/api/purchase-order-candidates', () => ({
  listPurchaseOrderImportCandidatePage: (...args: unknown[]) =>
    parentSelectorMocks.listPurchaseOrderImportCandidatePage(...args),
}))

vi.mock('@/api/sales-order-candidates', () => ({
  listSalesOrderOutboundImportCandidatePage: (...args: unknown[]) =>
    parentSelectorMocks.listSalesOrderOutboundImportCandidatePage(...args),
}))

vi.mock('@/api/statements', () => ({
  listStatementCandidatePage: (...args: unknown[]) =>
    parentSelectorMocks.listStatementCandidatePage(...args),
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) =>
    createElement('span', null, status),
}))

vi.mock('@/config/business-page-loader', () => ({
  loadBusinessPageConfig: (...args: unknown[]) =>
    parentSelectorMocks.loadBusinessPageConfig(...args),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: () => ({
    formatCellValue: (value: unknown) => String(value ?? ''),
  }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    error: (...args: unknown[]) => parentSelectorMocks.messageError(...args),
  },
}))

vi.mock('./ModuleFilterToolbar', () => ({
  ModuleFilterToolbar: ({
    config,
    filters,
    onApplyFilters,
    onReset,
    onUpdateFilter,
    submittedFilters,
  }: {
    config: { filters: Array<{ key: string }> }
    filters: Record<string, unknown>
    onApplyFilters: (filters: Record<string, unknown>) => void
    onReset: () => void
    onUpdateFilter: (key: string, value: unknown) => void
    submittedFilters: Record<string, unknown>
  }) =>
    createElement(
      'div',
      {
        'data-testid': 'filter-toolbar',
        'data-filter-keys': config.filters
          .map((filter) => filter.key)
          .join(','),
        'data-draft-keyword': String(filters.keyword ?? ''),
        'data-submitted-keyword': String(submittedFilters.keyword ?? ''),
      },
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => onUpdateFilter('keyword', 'draft-keyword'),
        },
        '更新筛选',
      ),
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => onApplyFilters({ keyword: 'applied-keyword' }),
        },
        '应用筛选',
      ),
      createElement(
        'button',
        {
          type: 'button',
          onClick: onReset,
        },
        '重置筛选',
      ),
    ),
}))

vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({
    children,
    footer,
    title,
  }: {
    children: ReactNode
    footer?: ReactNode
    title: ReactNode
  }) =>
    createElement(
      'div',
      { role: 'dialog', 'aria-label': String(title) },
      children,
      footer,
    ),
}))

vi.mock('antd', () => ({
  Button: ({ children, icon, ...props }: any) =>
    createElement('button', props, icon, children),
  Table: ({
    columns,
    dataSource,
    onRow,
    pagination,
    rowSelection,
  }: {
    columns: Array<{
      dataIndex: string
      render?: (value: unknown, record: ModuleRecord) => ReactNode
    }>
    dataSource: ModuleRecord[]
    onRow: (record: ModuleRecord) => Record<string, unknown>
    pagination?: {
      onChange: (page: number, pageSize: number) => void
      pageSize: number
      showTotal: (count: number) => ReactNode
      total: number
    }
    rowSelection?: unknown
  }) =>
    createElement(
      'div',
      null,
      createElement(
        'div',
        { 'data-testid': 'pagination-total' },
        pagination?.showTotal(pagination.total),
      ),
      pagination
        ? createElement(
            'button',
            {
              type: 'button',
              onClick: () => pagination.onChange(2, pagination.pageSize),
            },
            '翻页',
          )
        : null,
      pagination
        ? createElement(
            'button',
            {
              type: 'button',
              onClick: () => pagination.onChange(3, 30),
            },
            '改变页大小',
          )
        : null,
      rowSelection
        ? createElement(
            'button',
            {
              type: 'button',
              onClick: () =>
                (
                  rowSelection as {
                    onChange: (keys: Key[], rows: ModuleRecord[]) => void
                  }
                ).onChange([String(dataSource[0]?.id)], [dataSource[0]]),
            },
            '表格选择当前行',
          )
        : null,
      rowSelection
        ? createElement(
            'button',
            {
              type: 'button',
              onClick: () =>
                (
                  rowSelection as {
                    onChange: (keys: Key[], rows: ModuleRecord[]) => void
                  }
                ).onChange([String(dataSource[0]?.id)], []),
            },
            '表格选择缺失缓存行',
          )
        : null,
      createElement(
        'table',
        null,
        createElement(
          'tbody',
          null,
          dataSource.map((record) => {
            const rowProps = onRow(record)
            return createElement(
              'tr',
              {
                key: record.id,
                'data-testid': `parent-row-${record.id}`,
                ...rowProps,
              },
              rowSelection
                ? createElement(
                    'td',
                    { className: 'ant-table-selection-column' },
                    createElement('button', { type: 'button' }, '选择列'),
                  )
                : null,
              columns.map((column) =>
                createElement(
                  'td',
                  { key: column.dataIndex },
                  column.render
                    ? column.render(record[column.dataIndex], record)
                    : (record[column.dataIndex] as ReactNode),
                ),
              ),
            )
          }),
        ),
      ),
    ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  parentSelectorMocks.parentRows.splice(
    0,
    parentSelectorMocks.parentRows.length,
    {
      id: 'parent-1',
      name: '父单据 1',
      status: '已审核',
      items: [{ id: 'item-1' }],
    },
  )
  parentSelectorMocks.getBusinessModuleDetail.mockResolvedValue({
    data: {
      id: 'parent-1',
      name: '明细父单据',
      items: [{ id: 'detail-item' }],
    },
  })
  parentSelectorMocks.getModuleConfig.mockReturnValue({
    nativeFilterKeys: [],
    dateRangeMapping: {},
  })
  parentSelectorMocks.listBusinessModule.mockResolvedValue({
    data: {
      rows: parentSelectorMocks.parentRows,
      total: parentSelectorMocks.parentRows.length,
    },
  })
  parentSelectorMocks.listFreightBillImportCandidatePage.mockResolvedValue({
    data: {
      rows: parentSelectorMocks.parentRows,
      total: parentSelectorMocks.parentRows.length,
    },
  })
  parentSelectorMocks.listPurchaseOrderImportCandidatePage.mockResolvedValue({
    data: {
      rows: parentSelectorMocks.parentRows,
      total: parentSelectorMocks.parentRows.length,
    },
  })
  parentSelectorMocks.listSalesOrderOutboundImportCandidatePage.mockResolvedValue(
    {
      data: {
        rows: parentSelectorMocks.parentRows,
        total: parentSelectorMocks.parentRows.length,
      },
    },
  )
  parentSelectorMocks.listStatementCandidatePage.mockResolvedValue({
    data: {
      rows: parentSelectorMocks.parentRows,
      total: parentSelectorMocks.parentRows.length,
    },
  })
  parentSelectorMocks.loadBusinessPageConfig.mockReturnValue(undefined)
  parentSelectorMocks.useQuery.mockImplementation(
    ({ queryKey, queryFn }: { queryKey: readonly unknown[]; queryFn: any }) => {
      if (queryKey[0] === 'parent-selector-config') {
        return {
          data: queryFn(),
          isLoading: false,
          isFetching: false,
        }
      }
      if (queryKey[0] === 'parent-selector-list') {
        void queryFn({ signal: undefined })
        return {
          data: {
            data: {
              rows: parentSelectorMocks.parentRows,
              total: parentSelectorMocks.parentRows.length,
            },
          },
          isLoading: false,
          isFetching: false,
        }
      }
      return { data: undefined, isLoading: false, isFetching: false }
    },
  )
})

describe('getOverlayStatusMap', () => {
  it('maps pre outbound status for parent selector rows', () => {
    expect(getOverlayStatusMap()).toMatchObject({
      预出库: {
        color: 'warning',
        text: '预出库',
      },
    })
  })
})

describe('ModuleParentSelectorOverlay importable record filtering', () => {
  it('keeps purchase orders with audited status and positive sales remaining quantity', () => {
    const records = [
      {
        id: 'po-1',
        status: '已审核',
        items: [
          {
            id: 'poi-1',
            quantity: 5,
            remainingQuantity: 5,
            salesRemainingQuantity: 2,
          },
        ],
      },
      {
        id: 'po-2',
        status: '已审核',
        items: [
          {
            id: 'poi-2',
            quantity: 5,
            remainingQuantity: 5,
            salesRemainingQuantity: 0,
          },
        ],
      },
      {
        id: 'po-3',
        status: '草稿',
        items: [
          {
            id: 'poi-3',
            quantity: 5,
            remainingQuantity: 5,
            salesRemainingQuantity: 2,
          },
        ],
      },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('purchase-order', records).map((r) => r.id),
    ).toEqual(['po-1'])
  })

  it('keeps sales orders with audited status and positive remaining quantity', () => {
    const records = [
      {
        id: 'so-1',
        status: '已审核',
        items: [{ id: 'soi-1', quantity: 5, remainingQuantity: 1 }],
      },
      {
        id: 'so-2',
        status: '已审核',
        items: [{ id: 'soi-2', quantity: 5, remainingQuantity: 0 }],
      },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('sales-order', records).map((r) => r.id),
    ).toEqual(['so-1'])
  })

  it('falls back to quantity when remaining quantity is missing', () => {
    expect(
      hasImportableQuantity('sales-order', {
        id: 'so-1',
        items: [{ id: 'soi-1', quantity: 1 }],
      }),
    ).toBe(true)
  })

  it('keeps audited sales order list rows without items because detail is loaded before import', () => {
    const records = [
      { id: 'so-1', status: '已审核' },
      { id: 'so-2', status: '草稿' },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('sales-order', records).map((r) => r.id),
    ).toEqual(['so-1'])
  })

  it('keeps only audited freight bills', () => {
    const records = [
      { id: 'fb-1', status: '已审核' },
      { id: 'fb-2', status: '未审核' },
      { id: 'fb-3', status: '草稿' },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('freight-bill', records).map((r) => r.id),
    ).toEqual(['fb-1'])
  })

  it('leaves backend-filtered sales outbound candidates untouched', () => {
    const records = [
      { id: 'outbound-pre', status: '预出库' },
      { id: 'outbound-audited', status: '已审核' },
      { id: 'outbound-draft', status: '草稿' },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('sales-outbound', records).map((r) => r.id),
    ).toEqual(['outbound-pre', 'outbound-audited', 'outbound-draft'])
  })

  it('keeps completed sales orders for customer statement candidates', () => {
    const records = [
      { id: 'so-1', status: '完成销售' },
      { id: 'so-2', status: '已审核' },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords(
        'sales-order',
        records,
        'customer-statement',
      ).map((r) => r.id),
    ).toEqual(['so-1'])
  })
})

describe('resolveSelectedParentRows', () => {
  it('uses current page records before cached selected records', () => {
    const cached = { id: '1', orderNo: 'old' } as ModuleRecord
    const current = { id: '1', orderNo: 'new' } as ModuleRecord

    expect(
      resolveSelectedParentRows(['1'], { '1': cached }, [current]),
    ).toEqual([current])
  })

  it('keeps cross-page selected records from cache', () => {
    const cached = { id: '2', orderNo: 'cached' } as ModuleRecord

    expect(resolveSelectedParentRows(['2'], { '2': cached }, [])).toEqual([
      cached,
    ])
  })
})

describe('resolveVisibleParentSelectorColumns', () => {
  it('removes hidden selector columns', () => {
    const columns = resolveVisibleParentSelectorColumns(
      [
        { dataIndex: 'orderNo', title: '单号' },
        { dataIndex: 'status', title: '单据状态' },
      ],
      ['status'],
    )

    expect(columns.map((column) => column.dataIndex)).toEqual(['orderNo'])
  })
})

describe('ModuleParentSelectorOverlay keyboard row interactions', () => {
  const renderOverlay = (props: { allowMultipleSelection?: boolean } = {}) => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        allowMultipleSelection: props.allowMultipleSelection,
        onSelect,
        onClose,
      }),
    )

    return {
      row: screen.getByTestId('parent-row-parent-1'),
      onSelect,
      onClose,
    }
  }

  it('focuses candidate rows and imports a single row with Enter', async () => {
    const { row, onSelect, onClose } = renderOverlay()

    expect(row).toHaveAttribute('tabIndex', '0')
    fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith([parentRows[0]])
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles multi-select rows with Space and Enter', async () => {
    const { row, onSelect } = renderOverlay({ allowMultipleSelection: true })

    expect(row).toHaveAttribute('tabIndex', '0')
    fireEvent.keyDown(row, { key: ' ', code: 'Space' })

    await waitFor(() => {
      expect(screen.getByTestId('parent-row-parent-1')).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    fireEvent.keyDown(screen.getByTestId('parent-row-parent-1'), {
      key: 'Enter',
      code: 'Enter',
    })

    await waitFor(() => {
      expect(screen.getByTestId('parent-row-parent-1')).toHaveAttribute(
        'aria-selected',
        'false',
      )
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not toggle multi-select rows from the selection column', () => {
    renderOverlay({ allowMultipleSelection: true })

    fireEvent.keyDown(screen.getByText('选择列'), {
      key: ' ',
      code: 'Space',
    })

    expect(screen.getByTestId('parent-row-parent-1')).not.toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      createElement(ModuleParentSelectorOverlay, {
        open: false,
        parentModuleKey: 'customer',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(container.textContent).toBe('')
  })

  it('loads missing parent detail before importing a single record on click', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
      },
    )
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        onSelect,
        onClose,
      }),
    )
    fireEvent.click(screen.getByTestId('parent-row-parent-1'))

    await waitFor(() => {
      expect(parentSelectorMocks.getBusinessModuleDetail).toHaveBeenCalledWith(
        'customer',
        'parent-1',
      )
      expect(onSelect).toHaveBeenCalledWith([
        { id: 'parent-1', name: '明细父单据', items: [{ id: 'detail-item' }] },
      ])
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps rows inert for single-select Space key presses', () => {
    const { row, onSelect } = renderOverlay()

    fireEvent.keyDown(row, { key: ' ', code: 'Space' })
    fireEvent.keyDown(row, { key: 'Escape', code: 'Escape' })

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignores single-select row clicks from the selection column', () => {
    renderOverlay({ allowMultipleSelection: true })

    fireEvent.click(screen.getByText('选择列'))

    expect(screen.getByTestId('parent-row-parent-1')).not.toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('uses fallback display fields and configured module columns', () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'po-1',
        orderNo: 'PO-001',
        supplierName: '供应商 A',
        status: '已审核',
        items: [{ id: 'item-1', salesRemainingQuantity: 1 }],
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-order',
        hiddenSelectorColumnKeys: ['buyerName'],
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.getByText('PO-001')).toBeTruthy()
    expect(screen.getByText('供应商 A')).toBeTruthy()
    expect(screen.getByText('已审核')).toBeTruthy()
  })

  it('uses id as the display fallback for unknown modules', () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'unknown-1',
        status: '可用',
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'unknown-module',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.getByText('unknown-1')).toBeTruthy()
  })

  it('renders configured filters and updates filter state', async () => {
    parentSelectorMocks.getModuleConfig.mockReturnValue({
      nativeFilterKeys: ['customerName', 'keyword'],
      dateRangeMapping: { orderDate: ['startDate', 'endDate'] },
    })
    parentSelectorMocks.loadBusinessPageConfig.mockReturnValue({
      key: 'customer',
      title: 'Customer',
      filters: [
        { key: 'customerName', type: 'input' },
        { key: 'orderDate', type: 'dateRange' },
        { key: 'status', type: 'select' },
        { key: 'fixedName', type: 'input' },
      ],
    })

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        fixedFilters: {
          fixedName: 'fixed',
          ignoredEmpty: ' ',
          ignoredNull: null,
          ignoredUndefined: undefined,
        },
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.getByTestId('filter-toolbar')).toHaveAttribute(
      'data-filter-keys',
      'keyword,customerName,orderDate',
    )

    fireEvent.click(screen.getByText('更新筛选'))
    expect(screen.getByTestId('filter-toolbar')).toHaveAttribute(
      'data-draft-keyword',
      'draft-keyword',
    )

    fireEvent.click(screen.getByText('应用筛选'))
    await waitFor(() => {
      expect(screen.getByTestId('filter-toolbar')).toHaveAttribute(
        'data-submitted-keyword',
        'applied-keyword',
      )
    })

    fireEvent.click(screen.getByText('重置筛选'))
    await waitFor(() => {
      expect(screen.getByTestId('filter-toolbar')).toHaveAttribute(
        'data-submitted-keyword',
        '',
      )
    })
  })

  it('keeps existing keyword filters and tolerates missing endpoint filter config', () => {
    parentSelectorMocks.getModuleConfig.mockReturnValue({})
    parentSelectorMocks.loadBusinessPageConfig.mockReturnValue({
      key: 'customer',
      title: 'Customer',
      filters: [
        { key: 'keyword', type: 'input' },
        { key: 'unsupported', type: 'input' },
      ],
    })

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        fixedFilters: { ignoredEmpty: '', ignoredNull: null },
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.getByTestId('filter-toolbar')).toHaveAttribute(
      'data-filter-keys',
      'keyword',
    )
  })

  it('does not insert another keyword filter when the endpoint supports one', () => {
    parentSelectorMocks.getModuleConfig.mockReturnValue({
      nativeFilterKeys: ['keyword'],
      dateRangeMapping: {},
    })
    parentSelectorMocks.loadBusinessPageConfig.mockReturnValue({
      key: 'customer',
      title: 'Customer',
      filters: [{ key: 'keyword', type: 'input' }],
    })

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.getByTestId('filter-toolbar')).toHaveAttribute(
      'data-filter-keys',
      'keyword',
    )
  })

  it('updates pagination page and page size', async () => {
    renderOverlay()

    expect(screen.getByTestId('pagination-total')).toHaveTextContent(
      'modules.parentSelector.paginationTotal:1',
    )

    fireEvent.click(screen.getByText('翻页'))
    await waitFor(() => {
      expect(parentSelectorMocks.useQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining([2, 15]),
        }),
      )
    })

    fireEvent.click(screen.getByText('改变页大小'))
    await waitFor(() => {
      expect(parentSelectorMocks.useQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining([3, 30]),
        }),
      )
    })
  })

  it('uses candidate query APIs for statement and import candidate modes', () => {
    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-inbound',
        candidateStatementModuleKey: 'supplier-statement',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    expect(parentSelectorMocks.listStatementCandidatePage).toHaveBeenCalledWith(
      'supplier-statement',
      {},
      0,
      15,
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-order',
        candidateQueryType: 'purchase-order-import',
        candidateUsage: 'sales-order',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    expect(
      parentSelectorMocks.listPurchaseOrderImportCandidatePage,
    ).toHaveBeenCalledWith('sales-order', {}, 0, 15)

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-order',
        candidateQueryType: 'purchase-order-import',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    expect(
      parentSelectorMocks.listPurchaseOrderImportCandidatePage,
    ).toHaveBeenCalledWith('purchase-inbound', {}, 0, 15)

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'freight-bill',
        candidateQueryType: 'freight-bill-import',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    expect(
      parentSelectorMocks.listFreightBillImportCandidatePage,
    ).toHaveBeenCalledWith({}, 0, 15)

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'sales-order',
        candidateQueryType: 'sales-order-outbound-import',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    expect(
      parentSelectorMocks.listSalesOrderOutboundImportCandidatePage,
    ).toHaveBeenCalledWith({}, 0, 15)
  })

  it('imports candidate rows without loading detail', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
        status: DOCUMENT_STATUS.INBOUND_COMPLETED,
      },
    )
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-inbound',
        candidateStatementModuleKey: 'supplier-statement',
        onSelect,
        onClose,
      }),
    )
    fireEvent.click(screen.getByTestId('parent-row-parent-1'))

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith([parentRows[0]])
    })
    expect(parentSelectorMocks.getBusinessModuleDetail).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('handles non-Error import failures with translated fallback', async () => {
    parentSelectorMocks.getBusinessModuleDetail.mockRejectedValue('failed')
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    fireEvent.click(screen.getByTestId('parent-row-parent-1'))

    await waitFor(() => {
      expect(parentSelectorMocks.messageError).toHaveBeenCalledWith(
        'modules.importParentFailed',
      )
    })
  })

  it('handles Error import failures with the error message', async () => {
    parentSelectorMocks.getBusinessModuleDetail.mockRejectedValue(
      new Error('detail failed'),
    )
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    fireEvent.click(screen.getByTestId('parent-row-parent-1'))

    await waitFor(() => {
      expect(parentSelectorMocks.messageError).toHaveBeenCalledWith(
        'detail failed',
      )
    })
  })

  it('renders and manages multi-select summaries with meta fields', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'po-1',
        orderNo: 'PO-001',
        supplierName: '供应商 A',
        buyerName: '',
        orderDate: '2026-01-01',
        status: '已审核',
        items: [{ id: 'item-1', salesRemainingQuantity: 1 }],
      },
    )
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-order',
        allowMultipleSelection: true,
        onSelect,
        onClose,
      }),
    )

    expect(
      screen.getByText('modules.parentSelector.noSelectionHint'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('表格选择当前行'))
    await waitFor(() => {
      expect(screen.getAllByText('PO-001').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('供应商 A').length).toBeGreaterThanOrEqual(1)
      expect(
        screen.getByText('modules.parentSelector.selectedDocumentsCount:1'),
      ).toBeTruthy()
    })
    expect(screen.getByText('供应商：供应商 A')).toBeTruthy()
    expect(screen.getByText('订单日期：2026-01-01')).toBeTruthy()

    fireEvent.click(
      screen.getByLabelText('modules.parentSelector.removeAriaLabel'),
    )
    await waitFor(() => {
      expect(
        screen.getByText('modules.parentSelector.noSelectionHint'),
      ).toBeTruthy()
    })

    fireEvent.click(screen.getByText('表格选择当前行'))
    fireEvent.click(screen.getByText('modules.parentSelector.clearSelected'))
    await waitFor(() => {
      expect(
        screen.getByText('modules.parentSelector.noSelectionHint'),
      ).toBeTruthy()
    })

    fireEvent.click(screen.getByText('表格选择当前行'))
    fireEvent.click(screen.getByText('modules.parentSelector.confirmImport'))
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith([parentSelectorMocks.parentRows[0]])
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('excludes soft-deleted records from parent selector candidates', () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'po-deleted',
        orderNo: 'PO-DELETED',
        supplierName: '供应商 A',
        orderDate: '2026-01-01',
        status: '已审核',
        deletedFlag: true,
        items: [{ id: 'item-1', salesRemainingQuantity: 1 }],
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-order',
        allowMultipleSelection: true,
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.queryByTestId('parent-row-po-deleted')).toBeNull()
    expect(screen.queryByText('已删除')).toBeNull()
    expect(parentSelectorMocks.parentRows[0].status).toBe('已审核')
  })

  it('rejects a record whose loaded detail is soft-deleted', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
      },
    )
    parentSelectorMocks.getBusinessModuleDetail.mockResolvedValue({
      data: {
        id: 'parent-1',
        name: '已删除父单据',
        deletedFlag: true,
        items: [{ id: 'detail-item' }],
      },
    })
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        onSelect,
        onClose,
      }),
    )
    fireEvent.click(screen.getByTestId('parent-row-parent-1'))

    await waitFor(() => {
      expect(parentSelectorMocks.messageError).toHaveBeenCalledWith(
        'modules.importParentFailed',
      )
    })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('revalidates cached candidate records immediately before onSelect', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
        status: DOCUMENT_STATUS.INBOUND_COMPLETED,
      },
    )
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'purchase-inbound',
        candidateStatementModuleKey: 'supplier-statement',
        onSelect,
        onClose,
      }),
    )
    parentSelectorMocks.parentRows[0].deletedFlag = true
    fireEvent.click(screen.getByTestId('parent-row-parent-1'))

    await waitFor(() => {
      expect(parentSelectorMocks.messageError).toHaveBeenCalledWith(
        'modules.importParentFailed',
      )
    })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps selected keys when removing a record missing from the cache', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'parent-1',
        name: '父单据 1',
        items: [{ id: 'item-1' }],
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        allowMultipleSelection: true,
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    fireEvent.click(screen.getByText('表格选择缺失缓存行'))
    await waitFor(() => {
      expect(screen.getByTestId('parent-row-parent-1')).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
    fireEvent.click(
      screen.getByLabelText('modules.parentSelector.removeAriaLabel'),
    )

    await waitFor(() => {
      expect(screen.getByTestId('parent-row-parent-1')).toHaveAttribute(
        'aria-selected',
        'false',
      )
    })
  })

  it('renders selected summary fallback text when display and meta fields are empty', async () => {
    parentSelectorMocks.parentRows.splice(
      0,
      parentSelectorMocks.parentRows.length,
      {
        id: 'po-empty',
        status: '',
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'unknown-module',
        parentDisplayFieldKey: 'missingName',
        allowMultipleSelection: true,
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )
    fireEvent.click(screen.getByText('表格选择当前行'))

    await waitFor(() => {
      expect(screen.getByText('po-empty')).toBeTruthy()
      expect(
        screen.getAllByText('modules.parentSelector.selectedDocuments').length,
      ).toBeGreaterThanOrEqual(2)
    })
  })

  it('falls back to empty rows and zero total when list data is unavailable', () => {
    parentSelectorMocks.useQuery.mockImplementation(
      ({
        queryKey,
        queryFn,
      }: {
        queryKey: readonly unknown[]
        queryFn: any
      }) => {
        if (queryKey[0] === 'parent-selector-config') {
          return { data: queryFn(), isLoading: false, isFetching: false }
        }
        if (queryKey[0] === 'parent-selector-list') {
          void queryFn({ signal: undefined })
          return { data: undefined, isLoading: false, isFetching: false }
        }
        return { data: undefined, isLoading: false, isFetching: false }
      },
    )

    render(
      createElement(ModuleParentSelectorOverlay, {
        open: true,
        parentModuleKey: 'customer',
        parentDisplayFieldKey: 'name',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(screen.getByTestId('pagination-total')).toHaveTextContent(
      'modules.parentSelector.paginationTotal:0',
    )
    expect(screen.queryByTestId(/parent-row-/)).toBeNull()
  })
})
