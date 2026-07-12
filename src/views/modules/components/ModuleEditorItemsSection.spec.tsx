import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ColumnSettingsPopover: vi.fn(
    ({
      onOpenChange,
      onOrderChange,
      onToggle,
    }: {
      onOpenChange: (open: boolean) => void
      onOrderChange: (order: string[]) => void
      onToggle: (key: string) => void
    }) => (
      <div data-testid="column-settings">
        <button type="button" onClick={() => onOpenChange(true)}>
          open columns
        </button>
        <button type="button" onClick={() => onToggle('quantity')}>
          toggle column
        </button>
        <button type="button" onClick={() => onOrderChange(['name'])}>
          order column
        </button>
      </div>
    ),
  ),
  EditorFooterActions: vi.fn(
    ({
      onCancel,
      onSave,
    }: {
      onCancel: () => void
      onSave: (audit: boolean) => void
    }) => (
      <div data-testid="footer-actions">
        <button type="button" onClick={onCancel}>
          cancel
        </button>
        <button type="button" onClick={() => onSave(false)}>
          save
        </button>
        <button type="button" onClick={() => onSave(true)}>
          audit
        </button>
      </div>
    ),
  ),
  ModuleItemsPanel: vi.fn(
    ({
      actions,
      children,
    }: {
      actions: React.ReactNode
      children: React.ReactNode
    }) => (
      <div data-testid="items-panel">
        <div>{actions}</div>
        {children}
      </div>
    ),
  ),
  ModuleItemsTable: vi.fn(({ emptyText }: { emptyText: React.ReactNode }) => (
    <div data-testid="items-table">{emptyText}</div>
  )),
  ModuleParentSelectorOverlay: vi.fn(() => (
    <div data-testid="parent-selector" />
  )),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { label?: string }) =>
      options?.label ? `${key}:${options.label}` : key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span>DeleteOutlined</span>,
  ImportOutlined: () => <span>ImportOutlined</span>,
  PlusOutlined: () => <span>PlusOutlined</span>,
}))

vi.mock('antd', () => ({
  Button: ({
    children,
    icon,
    loading,
    ...props
  }: {
    children: React.ReactNode
    icon?: React.ReactNode
    loading?: boolean
    [key: string]: unknown
  }) => (
    <button type="button" data-loading={loading ? 'true' : 'false'} {...props}>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('./ColumnSettingsPopover', () => ({
  ColumnSettingsPopover: mocks.ColumnSettingsPopover,
}))

vi.mock('./EditorFooterActions', () => ({
  EditorFooterActions: mocks.EditorFooterActions,
}))

vi.mock('./ModuleItemsPanel', () => ({
  ModuleItemsPanel: mocks.ModuleItemsPanel,
}))

vi.mock('./ModuleItemsTable', () => ({
  ModuleItemsTable: mocks.ModuleItemsTable,
}))

vi.mock('./ModuleParentSelectorOverlay', () => ({
  ModuleParentSelectorOverlay: mocks.ModuleParentSelectorOverlay,
}))

import { ModuleEditorItemsSection } from '@/views/modules/components/ModuleEditorItemsSection'

describe('ModuleEditorItemsSection', () => {
  const defaultProps = {
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
      itemColumns: [{ title: 'Item', dataIndex: 'name', key: 'name' }],
    },
    items: [
      { id: 'item-1', name: 'Item 1' },
      { id: 'item-2', name: 'Item 2' },
    ],
    selectedItemIds: [],
    parentImporting: false,
    parentSelectorFilters: { status: 'open' },
    parentSelectorOpen: false,
    itemColumns: [{ title: 'Name', dataIndex: 'name', key: 'name' }],
    itemColumnOrder: ['name'],
    visibleItemColumnKeys: ['name'],
    permissions: {
      addManualItems: true,
      importParentItems: false,
      save: true,
      audit: false,
    },
    saving: false,
    onAddItem: vi.fn(),
    onCancel: vi.fn(),
    onSave: vi.fn(),
    onOpenParentSelector: vi.fn(),
    onCloseParentSelector: vi.fn(),
    onRemoveSelectedItems: vi.fn(),
    onImportParentRecord: vi.fn(),
    onItemColumnOrderChange: vi.fn(),
    onToggleItemColumn: vi.fn(),
    onRowDragOver: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the items panel and forwards table props for the default empty state', () => {
    render(<ModuleEditorItemsSection {...defaultProps} />)

    expect(screen.getByTestId('items-panel')).toBeTruthy()
    expect(screen.getByTestId('items-table')).toHaveTextContent(
      'modules.itemsSection.emptyText',
    )
    expect(mocks.ModuleItemsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: defaultProps.itemColumns,
        dataSource: defaultProps.items,
        emptyText: 'modules.itemsSection.emptyText',
      }),
      undefined,
    )
  })

  it('wires add, column settings, and footer actions', () => {
    render(<ModuleEditorItemsSection {...defaultProps} />)

    fireEvent.click(screen.getByText('modules.itemsSection.addItem'))
    fireEvent.click(screen.getByText('open columns'))
    fireEvent.click(screen.getByText('toggle column'))
    fireEvent.click(screen.getByText('order column'))
    fireEvent.click(screen.getByText('cancel'))
    fireEvent.click(screen.getByText('save'))
    fireEvent.click(screen.getByText('audit'))

    expect(defaultProps.onAddItem).toHaveBeenCalledTimes(1)
    expect(defaultProps.onToggleItemColumn).toHaveBeenCalledWith('quantity')
    expect(defaultProps.onItemColumnOrderChange).toHaveBeenCalledWith(['name'])
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    expect(defaultProps.onSave).toHaveBeenCalledWith(false)
    expect(defaultProps.onSave).toHaveBeenCalledWith(true)
    expect(mocks.ColumnSettingsPopover).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true }),
      undefined,
    )
    expect(mocks.EditorFooterActions).toHaveBeenCalledWith(
      expect.objectContaining({
        canAudit: false,
        canSave: true,
        saving: false,
      }),
      undefined,
    )
  })

  it('keeps item tools but moves submit actions out when requested', () => {
    render(
      <ModuleEditorItemsSection {...defaultProps} showFooterActions={false} />,
    )

    expect(screen.getByText('modules.itemsSection.addItem')).toBeInTheDocument()
    expect(screen.getByTestId('column-settings')).toBeInTheDocument()
    expect(screen.queryByTestId('footer-actions')).not.toBeInTheDocument()
  })

  it('hides add button when addManualItems is false', () => {
    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        permissions={{ ...defaultProps.permissions, addManualItems: false }}
      />,
    )

    expect(screen.queryByText('modules.itemsSection.addItem')).toBeNull()
  })

  it('keeps the parent selector mounted for modules without line items', () => {
    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        config={{
          ...defaultProps.config,
          itemColumns: undefined,
          parentImport: {
            parentModuleKey: 'purchase-order',
            parentFieldKey: 'purchaseOrderNo',
            parentDisplayFieldKey: 'orderNo',
            label: '采购订单',
          },
        }}
      />,
    )

    expect(screen.getByTestId('parent-selector')).toBeTruthy()
    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        open: false,
        parentModuleKey: 'purchase-order',
        parentDisplayFieldKey: 'orderNo',
      }),
      undefined,
    )
    expect(screen.queryByTestId('items-panel')).toBeNull()
  })

  it('renders delete selected action and selected row class only when rows are selected', () => {
    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        selectedItemIds={['item-1', 'item-3']}
      />,
    )

    fireEvent.click(screen.getByText(/modules\.itemsSection\.deleteSelected/))

    const tableProps = mocks.ModuleItemsTable.mock.calls.at(-1)?.[0]
    expect(defaultProps.onRemoveSelectedItems).toHaveBeenCalledTimes(1)
    expect(tableProps.rowClassName({ id: 'item-1' })).toBe(
      'ant-table-row-selected',
    )
    expect(tableProps.rowClassName({ id: 'item-2' })).toBe('')
  })

  it('passes row drag events with the row id', () => {
    render(<ModuleEditorItemsSection {...defaultProps} />)

    const tableProps = mocks.ModuleItemsTable.mock.calls.at(-1)?.[0]
    const dragEvent = { preventDefault: vi.fn() } as unknown as React.DragEvent
    tableProps.onRow({ id: 'item-2' }).onDragOver(dragEvent)

    expect(defaultProps.onRowDragOver).toHaveBeenCalledWith('item-2', dragEvent)
  })

  it('renders null when no itemColumns in config', () => {
    const config = { ...defaultProps.config, itemColumns: [] }
    const { container } = render(
      <ModuleEditorItemsSection {...defaultProps} config={config} />,
    )

    expect(container.textContent).toBe('')
  })

  it('renders null when itemColumns is omitted in config', () => {
    const { itemColumns: _itemColumns, ...config } = defaultProps.config
    const { container } = render(
      <ModuleEditorItemsSection {...defaultProps} config={config} />,
    )

    expect(container.textContent).toBe('')
  })

  it('renders import action with configured button text and parent selector props', () => {
    const config = {
      ...defaultProps.config,
      parentImport: {
        parentModuleKey: 'purchase-order',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        label: '采购订单',
        buttonText: '导入采购订单',
        allowMultipleSelection: true,
        candidateStatementModuleKey: 'purchase-statement',
        candidateQueryType: 'purchase-order-import' as const,
        candidateUsage: 'purchase-inbound' as const,
        hiddenSelectorColumnKeys: ['status'],
      },
    }

    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        config={config}
        parentImporting
        parentSelectorOpen
        permissions={{
          ...defaultProps.permissions,
          audit: true,
          importParentItems: true,
        }}
      />,
    )

    fireEvent.click(screen.getByText('导入采购订单'))

    expect(defaultProps.onOpenParentSelector).toHaveBeenCalledTimes(1)
    expect(screen.getByText('导入采购订单')).toHaveAttribute(
      'data-loading',
      'true',
    )
    expect(screen.getByTestId('items-table')).toHaveTextContent(
      'modules.itemsSection.emptyTextWithImport',
    )
    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        allowMultipleSelection: true,
        candidateQueryType: 'purchase-order-import',
        candidateStatementModuleKey: 'purchase-statement',
        candidateUsage: 'purchase-inbound',
        fixedFilters: { status: 'open' },
        hiddenSelectorColumnKeys: ['status'],
        onClose: defaultProps.onCloseParentSelector,
        onSelect: defaultProps.onImportParentRecord,
        open: true,
        parentDisplayFieldKey: 'orderNo',
        parentModuleKey: 'purchase-order',
        title: 'modules.itemsSection.selectParent:采购订单',
      }),
      undefined,
    )
    expect(mocks.EditorFooterActions).toHaveBeenCalledWith(
      expect.objectContaining({ canAudit: true }),
      undefined,
    )
  })

  it('renders import action with configured label when button text is absent', () => {
    const config = {
      ...defaultProps.config,
      parentImport: {
        parentModuleKey: 'sales-outbound',
        parentFieldKey: 'outboundNo',
        parentDisplayFieldKey: 'outboundNo',
        label: '销售出库单',
        candidateQueryType: 'freight-bill-import' as const,
      },
    }

    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        config={config}
        permissions={{
          ...defaultProps.permissions,
          importParentItems: true,
        }}
      />,
    )

    expect(
      screen.getByText('modules.itemsSection.importItems:销售出库单'),
    ).toBeTruthy()
    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateQueryType: 'freight-bill-import',
        parentModuleKey: 'sales-outbound',
        title: 'modules.itemsSection.selectParent:销售出库单',
      }),
      undefined,
    )
  })

  it('renders import action with default parent label when label is absent', () => {
    const config = {
      ...defaultProps.config,
      parentImport: {
        parentModuleKey: 'sales-order',
        parentFieldKey: 'salesOrderNo',
        parentDisplayFieldKey: 'orderNo',
        candidateQueryType: 'sales-order-outbound-import' as const,
      },
    }

    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        config={config}
        permissions={{
          ...defaultProps.permissions,
          importParentItems: true,
        }}
      />,
    )

    expect(
      screen.getByText(
        'modules.itemsSection.importItems:modules.itemsSection.parentDoc',
      ),
    ).toBeTruthy()
    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateQueryType: 'sales-order-outbound-import',
        parentModuleKey: 'sales-order',
        title:
          'modules.itemsSection.selectParent:modules.itemsSection.parentDoc',
      }),
      undefined,
    )
  })
})
