import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: () => ({
    formatCellValue: (v: any, type?: string) => {
      if (type === 'weight') return `${v} 吨`
      if (type === 'amount') return `¥${v}`
      if (type === 'date') return String(v ?? '')
      return String(v ?? '')
    },
  }),
}))

vi.mock('@/hooks/useModuleRecordHelpers', () => ({
  useModuleRecordHelpers: () => ({
    getPrimaryNo: (r: any) => String(r.billNo || r.orderNo || ''),
  }),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: any) => String(v ?? ''),
}))

vi.mock('@/utils/label-utils', () => ({
  padLabel: (label: string) => `${label}：`,
}))

vi.mock('@/module-system/module-action-icons', () => ({
  resolveModuleActionIcon: (label: string) => `icon-${label}`,
}))

vi.mock('./ModuleItemsPanel', () => ({
  ModuleItemsPanel: ({ children, actions, ...props }: any) => (
    <div data-testid="items-panel">
      {actions}
      {children}
    </div>
  ),
}))

vi.mock('./ModuleItemsTable', () => ({
  ModuleItemsTable: ({ columns, dataSource, emptyText }: any) => (
    <div data-testid="items-table">
      {dataSource?.length === 0 ? emptyText : `${dataSource?.length} items`}
    </div>
  ),
}))

vi.mock('./PieceWeightPopover', () => ({
  PieceWeightPopover: ({ weightTon }: any) => <span>{weightTon}</span>,
}))

vi.mock('./piece-weight-source', () => ({
  resolvePieceWeightLookupSource: () => ({}),
}))

vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({ children, title, open, ...props }: any) =>
    open ? (
      <div data-testid="workspace-overlay">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('antd/es/col', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/empty', () => ({
  default: ({ description, ...props }: any) => <div {...props}>{description}</div>,
}))

vi.mock('antd/es/flex', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/row', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: (props: any) => <div data-testid="spin" {...props}>Loading</div>,
}))

import { ModuleRecordDetailOverlay } from '@/views/modules/components/ModuleRecordDetailOverlay'

describe('ModuleRecordDetailOverlay', () => {
  const defaultProps = {
    open: true,
    config: {
      key: 'test',
      title: 'Test Module',
      kicker: '',
      description: '',
      filters: [],
      columns: [
        { dataIndex: 'orderNo', title: 'Order No', width: 100 },
        { dataIndex: 'totalWeight', title: 'Weight', type: 'weight' as const, width: 100 },
        { dataIndex: 'totalAmount', title: 'Amount', type: 'amount' as const, width: 100 },
        { dataIndex: 'status', title: 'Status', type: 'status' as const, width: 100 },
      ],
      detailFields: [],
      detailItemColumns: [],
      data: [],
      buildOverview: () => [],
    },
    record: null,
    loading: false,
    onClose: vi.fn(),
  }

  it('renders overlay when open', () => {
    render(<ModuleRecordDetailOverlay {...defaultProps} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<ModuleRecordDetailOverlay {...defaultProps} open={false} />)
    expect(screen.queryByTestId('workspace-overlay')).toBeNull()
  })

  it('renders loading spinner when loading', () => {
    render(<ModuleRecordDetailOverlay {...defaultProps} loading={true} />)
    expect(screen.getByTestId('spin')).toBeTruthy()
  })

  it('renders empty state when no record', () => {
    render(<ModuleRecordDetailOverlay {...defaultProps} />)
    expect(screen.getByText('modules.detail.noData')).toBeTruthy()
  })

  it('renders record with primary number in title', () => {
    const record = { id: '1', billNo: 'BILL-001', items: [] }
    render(<ModuleRecordDetailOverlay {...defaultProps} record={record} />)
    expect(screen.getByText(/BILL-001/)).toBeTruthy()
  })

  it('renders record with detail fields', () => {
    const configWithFields = {
      ...defaultProps.config,
      detailFields: [
        { key: 'orderNo', label: 'Order No' },
        { key: 'supplierName', label: 'Supplier' },
      ],
    }
    const record = {
      id: '1',
      billNo: 'BILL-001',
      orderNo: 'ORD-001',
      supplierName: 'Supplier A',
      items: [],
    }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithFields}
        record={record}
      />,
    )
    expect(screen.getByText(/ORD-001/)).toBeTruthy()
  })

  it('renders record with detail item columns', () => {
    const configWithItemColumns = {
      ...defaultProps.config,
      detailItemColumns: [
        { dataIndex: 'brand', title: 'Brand', width: 100 },
        { dataIndex: 'quantity', title: 'Qty', width: 80 },
      ],
    }
    const record = {
      id: '1',
      billNo: 'BILL-001',
      items: [
        { id: 'i1', brand: 'Brand A', quantity: 5 },
      ],
    }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithItemColumns}
        record={record}
      />,
    )
    expect(screen.getByText('1 items')).toBeTruthy()
  })

  it('renders record with empty items', () => {
    const configWithItemColumns = {
      ...defaultProps.config,
      detailItemColumns: [
        { dataIndex: 'brand', title: 'Brand', width: 100 },
      ],
    }
    const record = { id: '1', billNo: 'BILL-001', items: [] }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithItemColumns}
        record={record}
      />,
    )
    expect(screen.getByText('modules.detail.noDetailItems')).toBeTruthy()
  })

  it('renders with canPrint', () => {
    const configWithItemColumns = {
      ...defaultProps.config,
      detailItemColumns: [{ dataIndex: 'brand', title: 'Brand', width: 100 }],
    }
    const record = {
      id: '1',
      billNo: 'BILL-001',
      items: [{ id: 'i1', brand: 'Brand A' }],
    }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithItemColumns}
        record={record}
        canPrint={true}
      />,
    )
    expect(screen.getByText('modules.detail.print')).toBeTruthy()
  })

  it('renders close button', () => {
    const record = { id: '1', billNo: 'BILL-001', items: [] }
    render(<ModuleRecordDetailOverlay {...defaultProps} record={record} />)
    expect(screen.getByText('modules.detail.close')).toBeTruthy()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    const record = { id: '1', billNo: 'BILL-001', items: [] }
    render(<ModuleRecordDetailOverlay {...defaultProps} record={record} onClose={onClose} />)
    fireEvent.click(screen.getByText('modules.detail.close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders record with weightTon column', () => {
    const configWithWeight = {
      ...defaultProps.config,
      detailItemColumns: [
        { dataIndex: 'weightTon', title: 'Weight', width: 100 },
      ],
    }
    const record = {
      id: '1',
      billNo: 'BILL-001',
      items: [{ id: 'i1', weightTon: 2.5, category: 'Steel' }],
    }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithWeight}
        record={record}
      />,
    )
    expect(screen.getByText('1 items')).toBeTruthy()
  })

  it('renders record with fullRow detail fields', () => {
    const configWithFullRow = {
      ...defaultProps.config,
      detailFields: [
        { key: 'notes', label: 'Notes', fullRow: true },
      ],
    }
    const record = {
      id: '1',
      billNo: 'BILL-001',
      notes: 'Some notes',
      items: [],
    }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithFullRow}
        record={record}
      />,
    )
    expect(screen.getByText(/Some notes/)).toBeTruthy()
  })

  it('renders with items from config.itemColumns fallback', () => {
    const configWithFallback = {
      ...defaultProps.config,
      detailItemColumns: undefined,
      itemColumns: [
        { dataIndex: 'brand', title: 'Brand', width: 100 },
      ],
    }
    const record = {
      id: '1',
      billNo: 'BILL-001',
      items: [{ id: 'i1', brand: 'Brand A' }],
    }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        config={configWithFallback}
        record={record}
      />,
    )
    expect(screen.getByText('1 items')).toBeTruthy()
  })

  it('renders with no items and no print', () => {
    const record = { id: '1', billNo: 'BILL-001', items: [] }
    render(<ModuleRecordDetailOverlay {...defaultProps} record={record} />)
    expect(screen.getByText('modules.detail.close')).toBeTruthy()
  })

  it('renders with items and no detailItemColumns', () => {
    const record = { id: '1', billNo: 'BILL-001', items: [{ id: 'i1' }] }
    render(<ModuleRecordDetailOverlay {...defaultProps} record={record} />)
    expect(screen.getByText('modules.detail.close')).toBeTruthy()
  })

  it('renders print button without items', () => {
    const record = { id: '1', billNo: 'BILL-001', items: [] }
    render(
      <ModuleRecordDetailOverlay
        {...defaultProps}
        record={record}
        canPrint={true}
      />,
    )
    expect(screen.getByText('modules.detail.print')).toBeTruthy()
  })
})
