import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd/es/alert', () => ({
  default: ({ title, ...props }: any) => <div {...props}>{title}</div>,
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('./ColumnSettingsPopover', () => ({
  ColumnSettingsPopover: () => <div data-testid="column-settings" />,
}))

vi.mock('./ModuleFilterToolbar', () => ({
  ModuleFilterToolbar: () => <div data-testid="filter-toolbar" />,
}))

vi.mock('./ModuleTableToolbar', () => ({
  ModuleTableToolbar: () => <div data-testid="table-toolbar" />,
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
    loading: false,
    exporting: false,
    records: [],
    total: 0,
    currentPage: 1,
    pageSize: 20,
    warningMessage: '',
    columnVisibleKeys: [],
    columnOrder: [],
    columns: [],
    rowClassName: () => '',
    onUpdateFilter: vi.fn(),
    onSearch: vi.fn(),
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
    render(<BusinessGridContent {...defaultProps} warningMessage="Test warning" />)
    expect(screen.getByText('Test warning')).toBeTruthy()
  })
})
