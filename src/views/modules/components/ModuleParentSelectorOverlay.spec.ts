import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { ModuleParentSelectorOverlay } from './ModuleParentSelectorOverlay'
import {
  filterImportableParentRecords,
  hasImportableQuantity,
  resolveSelectedParentRows,
  resolveVisibleParentSelectorColumns,
} from './module-parent-selector-utils'

const parentRows = [
  { id: 'parent-1', name: '父单据 1', items: [{ id: 'item-1' }] },
] as ModuleRecord[]

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: 'keepPreviousData',
  useQuery: vi.fn(({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === 'parent-selector-list') {
      return {
        data: { data: { rows: parentRows, total: parentRows.length } },
        isLoading: false,
        isFetching: false,
      }
    }
    return { data: undefined, isLoading: false, isFetching: false }
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.count == null ? key : `${key}:${options.count}`,
  }),
}))

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: vi.fn(),
  listBusinessModule: vi.fn(),
}))

vi.mock('@/api/business-listing-filtering', () => ({
  buildFilterParams: (_moduleKey: string, filters: Record<string, unknown>) =>
    filters,
}))

vi.mock('@/api/freight-bill-candidates', () => ({
  listFreightBillImportCandidatePage: vi.fn(),
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: () => ({
    nativeFilterKeys: [],
    dateRangeMapping: {},
  }),
}))

vi.mock('@/api/purchase-order-candidates', () => ({
  listPurchaseOrderImportCandidatePage: vi.fn(),
}))

vi.mock('@/api/sales-order-candidates', () => ({
  listSalesOrderOutboundImportCandidatePage: vi.fn(),
}))

vi.mock('@/api/statements', () => ({
  listStatementCandidatePage: vi.fn(),
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) =>
    createElement('span', null, status),
}))

vi.mock('@/config/business-page-loader', () => ({
  loadBusinessPageConfig: vi.fn(),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: () => ({
    formatCellValue: (value: unknown) => String(value ?? ''),
  }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { error: vi.fn() },
}))

vi.mock('./ModuleFilterToolbar', () => ({
  ModuleFilterToolbar: () => null,
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
    rowSelection,
  }: {
    columns: Array<{
      dataIndex: string
      render?: (value: unknown, record: ModuleRecord) => ReactNode
    }>
    dataSource: ModuleRecord[]
    onRow: (record: ModuleRecord) => Record<string, unknown>
    rowSelection?: unknown
  }) =>
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
}))

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
})
