import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  resolveMasterOptionRequirements: vi.fn().mockReturnValue([]),
  useMasterOptions: vi.fn(),
}))

vi.mock('@/hooks/useModuleEditorCapabilities', () => ({
  useModuleEditorCapabilities: vi.fn().mockReturnValue({
    canAddManualEditorItems: true,
    canManageEditorItems: true,
    canSaveAndAuditCurrentEditor: true,
    editorAuditTarget: 'audit',
  }),
}))

vi.mock('@/views/modules/use-module-editor-items', () => ({
  useModuleEditorItems: vi.fn().mockReturnValue({
    clearSelectedItems: vi.fn(),
    handleDragOver: vi.fn(),
    itemColumns: [],
    itemColumnOrder: [],
    onItemColumnOrderChange: vi.fn(),
    removeSelectedItems: vi.fn(),
    selectedItemIds: [],
    toggleItemColumn: vi.fn(),
    visibleItemColumnKeys: [],
  }),
}))

const mockUseModuleEditorWorkspace = vi.fn().mockReturnValue({
  addItem: vi.fn(),
  clearSaveResult: vi.fn(),
  closeParentSelector: vi.fn(),
  handleImportParentRecord: vi.fn(),
  handleSave: vi.fn(),
  handleFormValuesChange: vi.fn(),
  isEdit: false,
  items: [],
  openParentSelector: vi.fn(),
  parentImporting: false,
  parentSelectorFilters: {},
  parentSelectorOpen: false,
  primaryNoLoading: false,
  saveResult: null,
  saving: false,
  setItems: vi.fn(),
})

vi.mock('@/views/modules/use-module-editor-workspace', () => ({
  useModuleEditorWorkspace: (...args: any[]) => mockUseModuleEditorWorkspace(...args),
}))

vi.mock('./ModuleEditorFormSection', () => ({
  ModuleEditorFormSection: ({ ...props }: any) => (
    <div data-testid="form-section" {...props}>FormSection</div>
  ),
}))

vi.mock('./ModuleEditorItemsSection', () => ({
  ModuleEditorItemsSection: ({ ...props }: any) => (
    <div data-testid="items-section" {...props}>ItemsSection</div>
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

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/form', () => {
  const Form = ({ children, ...props }: any) => <form {...props}>{children}</form>
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
  default: ({ ...props }: any) => <table {...props} />,
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

  it('renders workspace overlay when open', () => {
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('workspace-overlay')).toBeTruthy()
  })

  it('renders form section', () => {
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('form-section')).toBeTruthy()
  })

  it('renders items section', () => {
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByTestId('items-section')).toBeTruthy()
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
            { id: 'i1', brand: 'Brand A', material: 'Steel', spec: '10mm', length: '6m', quantity: 5, weightTon: 2.5 },
          ],
        },
      },
    })
    render(<ModuleEditorWorkspace {...defaultProps} />)
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
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
    render(<ModuleEditorWorkspace {...defaultProps} config={configWithFields} />)
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })

  it('renders save result for freight-bill module', () => {
    mockUseModuleEditorWorkspace.mockReturnValueOnce({
      ...mockUseModuleEditorWorkspace(),
      saveResult: {
        status: 'success',
        message: 'Saved',
        record: { id: '1', items: [{ id: 'i1', quantity: 5 }] },
      },
    })
    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        moduleKey="freight-bill"
      />,
    )
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
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
      <ModuleEditorWorkspace
        {...defaultProps}
        moduleKey="purchase-order"
      />,
    )
    expect(screen.getByText('modules.saveResult.close')).toBeTruthy()
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
    render(
      <ModuleEditorWorkspace
        {...defaultProps}
        moduleKey="sales-order"
      />,
    )
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
      <ModuleEditorWorkspace
        {...defaultProps}
        moduleKey="sales-outbound"
      />,
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
    render(<ModuleEditorWorkspace {...defaultProps} config={configWithParent} />)
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
    render(<ModuleEditorWorkspace {...defaultProps} config={configWithFields} />)
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
    render(<ModuleEditorWorkspace {...defaultProps} config={configWithFields} />)
    expect(screen.getByText(/modules\.saveResult\.pageSuccess/)).toBeTruthy()
  })
})
