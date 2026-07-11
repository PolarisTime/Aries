import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}))

vi.mock('antd', () => ({
  Alert: ({ title, ...props }: any) => <div {...props}>{title}</div>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('./ColumnSettingsPopover', () => ({
  ColumnSettingsPopover: () => <div data-testid="column-settings" />,
}))

vi.mock('./ModuleFilterToolbar', () => ({
  ModuleFilterToolbar: () => <div data-testid="filter-toolbar" />,
}))

vi.mock('./ModuleTableToolbar', () => ({
  ModuleTableToolbar: (props: Record<string, unknown>) => (
    <div data-testid="table-toolbar" data-selected={props.selectedCount} />
  ),
}))

vi.mock('./ModuleTablePagination', () => ({
  ModuleTablePagination: (props: Record<string, unknown>) => (
    <div
      data-testid="table-pagination"
      data-current={props.currentPage}
      data-page-size={props.pageSize}
      data-total={props.total}
    />
  ),
}))

vi.mock('@/views/modules/components/BusinessGridTable', () => ({
  BusinessGridTable: () => <div data-testid="grid-table" />,
}))

import { BusinessGridContent } from '@/views/modules/components/BusinessGridContent'

describe('BusinessGridContent', () => {
  const defaultProps = {
    moduleKey: 'test-module',
    config: {
      key: 'test',
      title: 'Test',
      kicker: '',
      description: '',
      filters: [],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    },
    filters: {},
    defaultFilters: {},
    submittedFilters: {},
    loading: false,
    exporting: false,
    records: [
      { id: '21', amount: 120 },
      { id: '22', amount: 80 },
    ],
    total: 95,
    currentPage: 2,
    pageSize: 20,
    warningMessage: '',
    columnVisibleKeys: [],
    columnOrder: [],
    columns: [],
    rowClassName: () => '',
    onUpdateFilter: vi.fn(),
    onApplyFilters: vi.fn(),
    onReset: vi.fn(),
    onCreate: vi.fn(),
    onExport: vi.fn(),
    onRefresh: vi.fn(),
    onToggleColumn: vi.fn(),
    onColumnOrderChange: vi.fn(),
    onRowClick: vi.fn(),
    onRowDoubleClick: vi.fn(),
    canCreate: true,
    canExport: true,
    toolbarActions: [],
    onAction: vi.fn(),
    onPageChange: vi.fn(),
    selectedCount: 0,
  }

  it('renders filter toolbar', () => {
    render(<BusinessGridContent {...defaultProps} />)
    expect(screen.getByTestId('filter-toolbar')).toBeTruthy()
  })

  it('renders table toolbar', () => {
    render(<BusinessGridContent {...defaultProps} />)
    expect(screen.getByTestId('table-toolbar')).toBeTruthy()
  })

  it('renders grid table', () => {
    render(<BusinessGridContent {...defaultProps} />)
    expect(screen.getByTestId('grid-table')).toBeTruthy()
  })

  it('renders warning message when present', () => {
    render(
      <BusinessGridContent {...defaultProps} warningMessage="Test warning" />,
    )
    expect(screen.getByText('Test warning')).toBeTruthy()
  })

  it('does not render the workspace header', () => {
    render(
      <BusinessGridContent
        {...defaultProps}
        config={{
          ...defaultProps.config,
          kicker: 'Finance',
          title: '付款管理',
          description: '登记并核对企业付款流水。',
        }}
      />,
    )

    expect(screen.queryByText('Finance')).toBeNull()
    expect(screen.queryByRole('heading', { name: '付款管理' })).toBeNull()
    expect(screen.queryByText('登记并核对企业付款流水。')).toBeNull()
  })

  it('does not build or render the workspace overview', () => {
    const buildOverview = vi.fn(() => [
      { label: '付款笔数', value: '2' },
      { label: '付款金额', value: '200.00' },
    ])

    render(
      <BusinessGridContent
        {...defaultProps}
        config={{ ...defaultProps.config, buildOverview }}
      />,
    )

    expect(buildOverview).not.toHaveBeenCalled()
    expect(
      screen.queryByText('modules.workspace.currentPageSummary'),
    ).toBeNull()
    expect(screen.queryByText('付款笔数')).toBeNull()
    expect(screen.queryByText('200.00')).toBeNull()
  })

  it('keeps pagination below the table with page-size and selection context', () => {
    render(<BusinessGridContent {...defaultProps} selectedCount={3} />)

    const table = screen.getByTestId('grid-table')
    const toolbar = screen.getByTestId('table-toolbar')
    const pagination = screen.getByTestId('table-pagination')
    expect(table.compareDocumentPosition(pagination)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(pagination).toHaveAttribute('data-current', '2')
    expect(pagination).toHaveAttribute('data-page-size', '20')
    expect(pagination).toHaveAttribute('data-total', '95')
    expect(toolbar).toHaveAttribute('data-selected', '3')
  })
})
