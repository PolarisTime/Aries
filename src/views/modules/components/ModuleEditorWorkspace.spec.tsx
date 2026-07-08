import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.hoisted(() => vi.fn())
const moduleEditorCapabilityMocks = vi.hoisted(() => ({
  useModuleEditorCapabilities: vi.fn(),
}))
const moduleEditorItemsMocks = vi.hoisted(() => ({
  clearSelectedItems: vi.fn(),
  handleDragOver: vi.fn(),
  onItemColumnOrderChange: vi.fn(),
  removeSelectedItems: vi.fn(),
  toggleItemColumn: vi.fn(),
  useModuleEditorItems: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  resolveMasterOptionRequirements: vi.fn().mockReturnValue([]),
  useMasterOptions: vi.fn(),
}))

vi.mock('@/hooks/useModuleEditorCapabilities', () => ({
  useModuleEditorCapabilities: (...args: unknown[]) =>
    moduleEditorCapabilityMocks.useModuleEditorCapabilities(...args),
}))

vi.mock('@/views/modules/use-module-editor-items', () => ({
  useModuleEditorItems: (...args: unknown[]) =>
    moduleEditorItemsMocks.useModuleEditorItems(...args),
}))

const mockUseModuleEditorWorkspace = vi.fn().mockReturnValue({
  addItem: vi.fn(),
  addChargeItem: vi.fn(),
  clearSaveResult: vi.fn(),
  closeParentSelector: vi.fn(),
  handleImportParentRecord: vi.fn(),
  handleSave: vi.fn(),
  handleFormValuesChange: vi.fn(),
  isEdit: false,
  items: [],
  chargeItems: [],
  openParentSelector: vi.fn(),
  parentImporting: false,
  parentSelectorFilters: {},
  parentSelectorOpen: false,
  primaryNoLoading: false,
  authoritativePrimaryNo: '',
  saveResult: null,
  saving: false,
  setItems: vi.fn(),
  setChargeItems: vi.fn(),
})

vi.mock('@/views/modules/use-module-editor-workspace', () => ({
  useModuleEditorWorkspace: (...args: any[]) =>
    mockUseModuleEditorWorkspace(...args),
}))

vi.mock('./ModuleEditorFormSection', () => ({
  ModuleEditorFormSection: ({ onCancel, onSave, ...props }: any) => (
    <div data-testid="form-section" {...props}>
      FormSection
      <button type="button" onClick={() => onSave(false)}>
        form-save
      </button>
      <button type="button" onClick={() => onSave(true)}>
        form-save-audit
      </button>
      <button type="button" onClick={onCancel}>
        form-cancel
      </button>
    </div>
  ),
}))

vi.mock('./ModuleEditorItemsSection', () => ({
  ModuleEditorItemsSection: ({
    onAddItem,
    onCancel,
    onCloseParentSelector,
    onImportParentRecord,
    onItemColumnOrderChange,
    onOpenParentSelector,
    onRemoveSelectedItems,
    onRowDragOver,
    onSave,
    onToggleItemColumn,
    permissions,
    ...props
  }: any) => (
    <div
      data-testid="items-section"
      data-add-manual-items={String(permissions.addManualItems)}
      data-import-parent-items={String(permissions.importParentItems)}
      data-save={String(permissions.save)}
      data-audit={String(permissions.audit)}
      {...props}
    >
      ItemsSection
      <button type="button" onClick={onAddItem}>
        add-item
      </button>
      <button type="button" onClick={() => onSave(true)}>
        items-save-audit
      </button>
      <button type="button" onClick={onCancel}>
        items-cancel
      </button>
      <button type="button" onClick={onOpenParentSelector}>
        open-parent-selector
      </button>
      <button type="button" onClick={onCloseParentSelector}>
        close-parent-selector
      </button>
      <button type="button" onClick={onRemoveSelectedItems}>
        remove-selected-items
      </button>
      <button
        type="button"
        onClick={() => onImportParentRecord([{ id: 'parent-1' }])}
      >
        import-parent-record
      </button>
      <button type="button" onClick={() => onItemColumnOrderChange(['brand'])}>
        reorder-item-column
      </button>
      <button type="button" onClick={() => onToggleItemColumn('brand')}>
        toggle-item-column
      </button>
      <button type="button" onDragOver={(event) => onRowDragOver(event)}>
        drag-over-item-row
      </button>
    </div>
  ),
}))

vi.mock('./ModuleEditorChargeSection', () => ({
  ModuleEditorChargeSection: ({
    moduleKey,
    onAddChargeItem,
    onChangeChargeItems,
    ...props
  }: any) => (
    <div data-testid="charge-section" data-module-key={moduleKey} {...props}>
      ChargeSection
      <button type="button" onClick={onAddChargeItem}>
        add-charge
      </button>
      <button
        type="button"
        onClick={() =>
          onChangeChargeItems([{ id: 'charge-1', chargeName: '卸货费' }])
        }
      >
        change-charge
      </button>
    </div>
  ),
}))

vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({ children, title, open, ...props }: any) => {
    if (!open) return null
    return (
      <div data-testid="workspace-overlay" {...props}>
        <div>{title}</div>
        {children}
      </div>
    )
  },
}))

vi.mock('antd', () => {
  const Form = ({ children, onValuesChange, ...props }: any) => (
    <form {...props} data-testid="editor-form">
      <input
        aria-label="editor-change-probe"
        onChange={() =>
          onValuesChange?.({ orderNo: 'ORD-002' }, { orderNo: 'ORD-002' })
        }
      />
      {children}
    </form>
  )
  Form.useForm = () => [{ getFieldsValue: () => ({}) }]
  Form.Item = ({ children, ...props }: any) => <div {...props}>{children}</div>
  Form.useFormInstance = () => ({})
  Form.useWatch = () => ({})

  return {
    Button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Form,
    Space: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Table: ({ columns, dataSource, rowKey, ...props }: any) => (
      <table data-testid="save-result-items-table" {...props}>
        <tbody>
          {dataSource.map((record: Record<string, unknown>, index: number) => (
            <tr key={rowKey(record, index)}>
              {columns.map((column: any) => (
                <td key={column.dataIndex}>
                  {column.render
                    ? column.render(record[column.dataIndex], record, index)
                    : String(record[column.dataIndex] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
    Typography: {
      Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
  }
})

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/form', () => {
  const Form = ({ children, ...props }: any) => (
    <form
      {...props}
      onChange={(event) => {
        props.onValuesChange?.({ orderNo: 'ORD-002' }, { orderNo: 'ORD-002' })
        props.onChange?.(event)
      }}
    >
      {children}
    </form>
  )
  Form.useForm = () => [{ getFieldsValue: () => ({}) }]
  Form.Item = ({ children, ...props }: any) => <div {...props}>{children}</div>
  Form.useFormInstance = () => ({})
  Form.useWatch = () => ({})
  return { default: Form }
})

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/table', () => ({
  default: ({ columns, dataSource, rowKey, ...props }: any) => (
    <table data-testid="save-result-items-table" {...props}>
      <tbody>
        {dataSource.map((record: Record<string, unknown>, index: number) => (
          <tr key={rowKey(record, index)}>
            {columns.map((column: any) => (
              <td key={column.dataIndex}>
                {column.render
                  ? column.render(record[column.dataIndex], record, index)
                  : String(record[column.dataIndex] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@ant-design/icons', () => ({
  ArrowRightOutlined: () => <span>ArrowRightOutlined</span>,
  CheckCircleFilled: () => <span>CheckCircleFilled</span>,
  CloseCircleFilled: () => <span>CloseCircleFilled</span>,
  WarningFilled: () => <span>WarningFilled</span>,
}))

import { ModuleEditorWorkspace } from '@/views/modules/components/ModuleEditorWorkspace'

describe('ModuleEditorWorkspace', () => {
  const defaultProps = {
    open: true,
    config: {
      key: 'test-module',
      title: 'Test Module',
      formFields: [],
      itemColumns: [],
      readOnly: false,
    },
    record: null,
    moduleKey: 'test-module',
    canSave: true,
    canAudit: true,
    lineItemsLocked: false,
    lockedLineItemsNotice: '',
    onClose: vi.fn(),
    onSaved: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockReset()
    moduleEditorCapabilityMocks.useModuleEditorCapabilities.mockReturnValue({
      canAddManualEditorItems: true,
      canManageEditorItems: true,
      canSaveAndAuditCurrentEditor: true,
      editorAuditTarget: 'audit',
    })
    moduleEditorItemsMocks.useModuleEditorItems.mockReturnValue({
      clearSelectedItems: moduleEditorItemsMocks.clearSelectedItems,
      handleDragOver: moduleEditorItemsMocks.handleDragOver,
      itemColumns: [],
      itemColumnOrder: [],
      onItemColumnOrderChange: moduleEditorItemsMocks.onItemColumnOrderChange,
      removeSelectedItems: moduleEditorItemsMocks.removeSelectedItems,
      selectedItemIds: [],
      toggleItemColumn: moduleEditorItemsMocks.toggleItemColumn,
      visibleItemColumnKeys: [],
    })
    mockUseModuleEditorWorkspace.mockReturnValue({
      addItem: vi.fn(),
      addChargeItem: vi.fn(),
      clearSaveResult: vi.fn(),
      closeParentSelector: vi.fn(),
      handleImportParentRecord: vi.fn(),
      handleSave: vi.fn(),
      handleFormValuesChange: vi.fn(),
      isEdit: false,
      items: [],
      chargeItems: [],
      openParentSelector: vi.fn(),
      parentImporting: false,
      parentSelectorFilters: {},
      parentSelectorOpen: false,
      primaryNoLoading: false,
      authoritativePrimaryNo: '',
      saveResult: null,
      saving: false,
      setItems: vi.fn(),
      setChargeItems: vi.fn(),
    })
  })

  it('renders workspace overlay when open', () => {
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders form section', () => {
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('form-section')).toBeTruthy()
  })

  it('falls back to empty form fields when config omits formFields', () => {
    const configWithoutFormFields = {
      key: 'test-module',
      title: 'Test Module',
      itemColumns: [],
      readOnly: false,
    }

    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        config={configWithoutFormFields}
      />,
    )

    const capabilityArgs =
      moduleEditorCapabilityMocks.useModuleEditorCapabilities.mock.calls[0][0]
    expect(capabilityArgs.formFields).toEqual([])
    expect(capabilityArgs.resolveModuleStatusOptions()).toEqual([])
  })

  it('passes normalized status options to editor capabilities', () => {
    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        config={{
          ...defaultProps.config,
          formFields: [
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [{ value: 'draft' }, { value: 2 }],
            },
          ],
        }}
      />,
    )

    const capabilityArgs =
      moduleEditorCapabilityMocks.useModuleEditorCapabilities.mock.calls[0][0]
    expect(capabilityArgs.resolveModuleStatusOptions()).toEqual(['draft', '2'])
  })

  it('binds form value changes to the editor workspace hook', () => {
    const handleFormValuesChange = vi.fn()
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      handleFormValuesChange,
    })

    render(<ModuleEditorWorkspace {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('editor-change-probe'), {
      target: { value: 'ORD-002' },
    })

    expect(handleFormValuesChange).toHaveBeenCalledWith({ orderNo: 'ORD-002' })
  })

  it('forwards form and item section actions to workspace handlers', () => {
    const handlers = {
      addItem: vi.fn(),
      clearSaveResult: vi.fn(),
      closeParentSelector: vi.fn(),
      handleImportParentRecord: vi.fn(),
      handleSave: vi.fn(),
      handleFormValuesChange: vi.fn(),
      openParentSelector: vi.fn(),
      setItems: vi.fn(),
    }
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      ...handlers,
    })

    render(<ModuleEditorWorkspace {...defaultProps} />)
    fireEvent.click(screen.getByText('form-save'))
    fireEvent.click(screen.getByText('form-save-audit'))
    fireEvent.click(screen.getByText('add-item'))
    fireEvent.click(screen.getByText('items-save-audit'))
    fireEvent.click(screen.getByText('open-parent-selector'))
    fireEvent.click(screen.getByText('close-parent-selector'))
    fireEvent.click(screen.getByText('remove-selected-items'))
    fireEvent.click(screen.getByText('import-parent-record'))
    fireEvent.click(screen.getByText('reorder-item-column'))
    fireEvent.click(screen.getByText('toggle-item-column'))
    fireEvent.dragOver(screen.getByText('drag-over-item-row'))

    expect(handlers.handleSave).toHaveBeenCalledWith(false)
    expect(handlers.handleSave).toHaveBeenCalledWith(true)
    expect(handlers.addItem).toHaveBeenCalledTimes(1)
    expect(handlers.openParentSelector).toHaveBeenCalledTimes(1)
    expect(handlers.closeParentSelector).toHaveBeenCalledTimes(1)
    expect(moduleEditorItemsMocks.removeSelectedItems).toHaveBeenCalledTimes(1)
    expect(moduleEditorItemsMocks.clearSelectedItems).toHaveBeenCalledTimes(1)
    expect(handlers.handleImportParentRecord).toHaveBeenCalledWith([
      { id: 'parent-1' },
    ])
    expect(moduleEditorItemsMocks.onItemColumnOrderChange).toHaveBeenCalledWith(
      ['brand'],
    )
    expect(moduleEditorItemsMocks.toggleItemColumn).toHaveBeenCalledWith(
      'brand',
    )
    expect(moduleEditorItemsMocks.handleDragOver).toHaveBeenCalledTimes(1)
  })

  it('renders items section', () => {
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('items-section')).toBeTruthy()
  })

  it('renders charge section for charge-enabled modules', () => {
    render(
      <ModuleEditorWorkspace {...defaultProps} moduleKey="purchase-order" />,
    )

    expect(screen.getByTestId('charge-section')).toHaveAttribute(
      'data-module-key',
      'purchase-order',
    )
  })

  it('does not render when closed', () => {
    render(<ModuleEditorWorkspace {...defaultProps} open={false} />)
    expect(screen.queryByTestId('workspace-overlay')).toBeNull()
  })

  it('renders with record (edit mode)', () => {
    const record = { id: '1', orderNo: 'ORD-001', items: [] }
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      isEdit: true,
    })
    render(<ModuleEditorWorkspace {...defaultProps} record={record} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders with saving state', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saving: true,
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('form-section')).toBeTruthy()
  })

  it('passes authoritative primary number to form section', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      authoritativePrimaryNo: 'ORD-001',
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('form-section')).toHaveAttribute(
      'authoritativePrimaryNo',
      'ORD-001',
    )
  })

  it('renders with lineItemsLocked', () => {
    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        lineItemsLocked={true}
        lockedLineItemsNotice="Items are locked"
      />,
    )
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders with parentSelectorOpen', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      parentSelectorOpen: true,
      parentSelectorFilters: { keyword: 'test' },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders with parentImporting', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      parentImporting: true,
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('items-section')).toBeTruthy()
  })

  it('renders save result success overlay', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Save successful',
        record: { id: '1', orderNo: 'ORD-001', items: [] },
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })

  it('renders save result error overlay', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'error',
        message: 'Save failed',
        traceId: 'trace-123',
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByText('modules.saveResult.error')).toBeTruthy()
    expect(screen.getByText(/Trace ID/)).toBeTruthy()
  })

  it('renders save result warning overlay', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'warning',
        message: 'ID was updated',
        record: { id: '1', items: [] },
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })

  it('renders save result with items table', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: {
          id: '1',
          items: [
            {
              id: 'i1',
              brand: 'Brand A',
              material: 'Steel',
              spec: '10mm',
              length: '6m',
              quantity: 5,
              weightTon: 2.5,
            },
          ],
        },
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
  })

  it('closes successful save result and clears the save state', () => {
    const clearSaveResult = vi.fn()
    const onClose = vi.fn()
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      clearSaveResult,
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', items: [] },
      },
    })

    render(<ModuleEditorWorkspace {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('modules.saveResult.close'))

    expect(clearSaveResult).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps editor open when clearing an error save result', () => {
    const clearSaveResult = vi.fn()
    const onClose = vi.fn()
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      clearSaveResult,
      saveResult: {
        status: 'error',
        message: 'Failed',
      },
    })

    render(<ModuleEditorWorkspace {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('modules.saveResult.backToEdit'))

    expect(clearSaveResult).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders save result with form fields', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: {
          id: '1',
          orderNo: 'ORD-001',
          totalWeight: 12.345,
          totalAmount: 99.5,
          items: [],
        },
      },
    })
    const configWithFields = {
      ...defaultProps.config,
      formFields: [
        { key: 'orderNo', label: 'Order No', type: 'input' },
        { key: 'totalWeight', label: 'Total Weight', type: 'weight' },
        { key: 'totalAmount', label: 'Total Amount', type: 'amount' },
      ],
    }
    render(
      <ModuleEditorWorkspace {...defaultProps} config={configWithFields} />,
    )
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
    expect(
      screen.getByText(/12\.345 modules\.itemColumns\.weightTon/),
    ).toBeTruthy()
    expect(screen.getByText(/99\.5 modules\.itemColumns\.amount/)).toBeTruthy()
  })

  it('renders save result record card when config omits formFields', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', orderNo: 'ORD-001', items: [] },
      },
    })

    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        config={{ key: 'test-module', title: 'Test Module', itemColumns: [] }}
      />,
    )

    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })

  it('renders save result for freight-bill module', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: {
          id: '1',
          items: [
            { id: 'i1', quantity: 5, weightTon: 2.3456 },
            { id: 'i2', quantity: 1 },
          ],
        },
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} moduleKey="freight-bill" />)
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
    expect(screen.getByText('2.346')).toBeTruthy()
  })

  it('renders finance item columns with numeric and empty values', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: {
          id: '1',
          items: [
            {
              id: 'i1',
              quantity: 5,
              weightTon: null,
              unitPrice: 10,
              amount: null,
            },
            {
              id: 'i2',
              quantity: 2,
              weightTon: 1,
              unitPrice: null,
              amount: 20,
            },
          ],
        },
      },
    })

    render(
      <ModuleEditorWorkspace {...defaultProps} moduleKey="purchase-order" />,
    )

    expect(screen.getByText('10.00')).toBeTruthy()
    expect(screen.getByText('20.00')).toBeTruthy()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2)
  })

  it('renders save result for purchase-order module with next module', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', items: [] },
      },
    })
    render(
      <ModuleEditorWorkspace {...defaultProps} moduleKey="purchase-order" />,
    )
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
  })

  it('creates the next module from a successful save result', () => {
    const clearSaveResult = vi.fn()
    const onClose = vi.fn()
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      clearSaveResult,
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: 'po-1', items: [] },
      },
    })

    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        moduleKey="purchase-order"
        onClose={onClose}
      />,
    )
    fireEvent.click(
      screen.getByText('modules.nextModule.createPurchaseInbound'),
    )

    expect(clearSaveResult).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/purchase-inbound',
      search: 'sourceModule=purchase-order&sourceRecordId=po-1',
    })
  })

  it('creates the next module with an empty source id when record is missing', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
      },
    })

    render(<ModuleEditorWorkspace {...defaultProps} moduleKey="sales-order" />)
    fireEvent.click(screen.getByText('modules.nextModule.createSalesOutbound'))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/sales-outbound',
      search: 'sourceModule=sales-order&sourceRecordId=',
    })
  })

  it('renders save result for sales-order module', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', items: [] },
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} moduleKey="sales-order" />)
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
  })

  it('renders save result for sales-outbound module', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', items: [] },
      },
    })
    render(
      <ModuleEditorWorkspace {...defaultProps} moduleKey="sales-outbound" />,
    )
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
  })

  it('renders error overlay with back to edit button', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'error',
        message: 'Failed',
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByText('modules.saveResult.backToEdit')).toBeTruthy()
  })

  it('renders with readOnly config', () => {
    const readOnlyConfig = { ...defaultProps.config, readOnly: true }
    render(<ModuleEditorWorkspace {...defaultProps} config={readOnlyConfig} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders with itemColumns', () => {
    const configWithItems = {
      ...defaultProps.config,
      itemColumns: [{ dataIndex: 'brand', title: 'Brand', width: 100 }],
    }
    render(<ModuleEditorWorkspace {...defaultProps} config={configWithItems} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders with parentImport config', () => {
    const configWithParent = {
      ...defaultProps.config,
      parentImport: {
        parentModuleKey: 'purchase-order',
        parentFieldKey: 'purchaseOrderNo',
        label: 'Purchase Order',
      },
    }
    render(
      <ModuleEditorWorkspace {...defaultProps} config={configWithParent} />,
    )
    expect(screen.getByTestId('items-section')).toBeTruthy()
  })

  it('renders save result with empty formField value', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', orderNo: '', items: [] },
      },
    })
    const configWithFields = {
      ...defaultProps.config,
      formFields: [{ key: 'orderNo', label: 'Order No', type: 'input' }],
    }
    render(
      <ModuleEditorWorkspace {...defaultProps} config={configWithFields} />,
    )
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })

  it('renders save result with null formField value', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', items: [] },
      },
    })
    const configWithFields = {
      ...defaultProps.config,
      formFields: [{ key: 'notes', label: 'Notes', type: 'input' }],
    }
    render(
      <ModuleEditorWorkspace {...defaultProps} config={configWithFields} />,
    )
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })
})
