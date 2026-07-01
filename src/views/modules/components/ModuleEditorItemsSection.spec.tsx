import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ModuleParentSelectorOverlay: vi.fn(() => (
    <div data-testid="parent-selector" />
  )),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span>DeleteOutlined</span>,
  ImportOutlined: () => <span>ImportOutlined</span>,
  PlusOutlined: () => <span>PlusOutlined</span>,
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('./ColumnSettingsPopover', () => ({
  ColumnSettingsPopover: () => <div data-testid="column-settings" />,
}))

vi.mock('./EditorFooterActions', () => ({
  EditorFooterActions: () => <div data-testid="footer-actions" />,
}))

vi.mock('./ModuleItemsPanel', () => ({
  ModuleItemsPanel: ({ children, actions }: any) => (
    <div data-testid="items-panel">
      <div>{actions}</div>
      {children}
    </div>
  ),
}))

vi.mock('./ModuleItemsTable', () => ({
  ModuleItemsTable: () => <div data-testid="items-table" />,
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
      itemColumns: [{ title: 'Item', dataIndex: 'name' }],
    },
    items: [],
    selectedItemIds: [],
    parentImporting: false,
    parentSelectorFilters: {},
    parentSelectorOpen: false,
    itemColumns: [],
    itemColumnOrder: [],
    visibleItemColumnKeys: [],
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

  it('renders items panel', () => {
    render(<ModuleEditorItemsSection {...defaultProps} />)
    expect(screen.getByTestId('items-panel')).toBeTruthy()
  })

  it('renders add button when addManualItems is true', () => {
    render(<ModuleEditorItemsSection {...defaultProps} />)
    expect(screen.getByText('modules.itemsSection.addItem')).toBeTruthy()
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

  it('renders null when no itemColumns in config', () => {
    const config = { ...defaultProps.config, itemColumns: [] }
    const { container } = render(
      <ModuleEditorItemsSection {...defaultProps} config={config} />,
    )
    expect(container.textContent).toBe('')
  })

  it('passes purchase order candidate settings to parent selector', () => {
    const config = {
      ...defaultProps.config,
      parentImport: {
        parentModuleKey: 'purchase-order',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        label: '采购订单',
        candidateQueryType: 'purchase-order-import' as const,
        candidateUsage: 'purchase-inbound' as const,
        hiddenSelectorColumnKeys: ['status'],
      },
    }

    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        config={config}
        parentSelectorOpen
        permissions={{
          ...defaultProps.permissions,
          importParentItems: true,
        }}
      />,
    )

    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateQueryType: 'purchase-order-import',
        candidateUsage: 'purchase-inbound',
        hiddenSelectorColumnKeys: ['status'],
        parentModuleKey: 'purchase-order',
      }),
      undefined,
    )
  })

  it('passes freight bill candidate settings to parent selector', () => {
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
        parentSelectorOpen
        permissions={{
          ...defaultProps.permissions,
          importParentItems: true,
        }}
      />,
    )

    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateQueryType: 'freight-bill-import',
        parentModuleKey: 'sales-outbound',
      }),
      undefined,
    )
  })

  it('passes sales order outbound candidate settings to parent selector', () => {
    const config = {
      ...defaultProps.config,
      parentImport: {
        parentModuleKey: 'sales-order',
        parentFieldKey: 'salesOrderNo',
        parentDisplayFieldKey: 'orderNo',
        label: '销售订单',
        candidateQueryType: 'sales-order-outbound-import' as const,
      },
    }

    render(
      <ModuleEditorItemsSection
        {...defaultProps}
        config={config}
        parentSelectorOpen
        permissions={{
          ...defaultProps.permissions,
          importParentItems: true,
        }}
      />,
    )

    expect(mocks.ModuleParentSelectorOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateQueryType: 'sales-order-outbound-import',
        parentModuleKey: 'sales-order',
      }),
      undefined,
    )
  })
})
