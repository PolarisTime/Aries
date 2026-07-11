import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isEditorFieldDisabledForModule } from '@/module-system/module-adapter-editor'
import { groupFieldsByRow } from '@/module-system/module-field-layout'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'

const mocks = vi.hoisted(() => ({
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
      </div>
    ),
  ),
  FormFieldRenderer: vi.fn(
    ({
      field,
      disabled,
    }: {
      field: ModuleFormFieldDefinition
      disabled: boolean
    }) => (
      <div data-disabled={disabled ? 'true' : 'false'} data-testid="form-field">
        {field.label}
      </div>
    ),
  ),
  groupFieldsByRow: vi.fn(() => [] as ModuleFormFieldDefinition[][]),
  isEditorFieldDisabledForModule: vi.fn(() => false),
  useFormInstance: vi.fn(() => ({
    getFieldValue: vi.fn(),
    getFieldsValue: vi.fn().mockReturnValue({}),
  })),
  useWatch: vi.fn(() => ({})),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  ImportOutlined: () => <span>ImportOutlined</span>,
}))

vi.mock('antd', () => ({
  Alert: ({ showIcon, title, type, ...props }: any) => (
    <div
      data-show-icon={showIcon ? 'true' : 'false'}
      data-type={type}
      {...props}
    >
      {title}
    </div>
  ),
  Col: ({ children, lg, ...props }: any) => (
    <div data-lg={String(lg)} {...props}>
      {children}
    </div>
  ),
  Button: ({ children, loading, ...props }: any) => (
    <button type="button" data-loading={loading ? 'true' : 'false'} {...props}>
      {children}
    </button>
  ),
  Form: {
    useFormInstance: mocks.useFormInstance,
    useWatch: mocks.useWatch,
    Item: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  Row: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: {
    Title: ({ children, ...props }: any) => <h5 {...props}>{children}</h5>,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@/module-system/module-adapter-editor', () => ({
  isEditorFieldDisabledForModule: mocks.isEditorFieldDisabledForModule,
}))

vi.mock('@/module-system/module-field-layout', () => ({
  groupFieldsByRow: mocks.groupFieldsByRow,
}))

vi.mock('./EditorFooterActions', () => ({
  EditorFooterActions: mocks.EditorFooterActions,
}))

vi.mock('./FormFieldRenderer', () => ({
  FormFieldRenderer: mocks.FormFieldRenderer,
}))

import { ModuleEditorFormSection } from '@/views/modules/components/ModuleEditorFormSection'

describe('ModuleEditorFormSection', () => {
  const defaultConfig: ModulePageConfig = {
    key: 'test',
    title: 'Test',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    formFields: [],
  }

  const createField = (
    overrides: Partial<ModuleFormFieldDefinition> = {},
  ): ModuleFormFieldDefinition => ({
    key: 'field',
    label: 'Field',
    type: 'text',
    required: false,
    ...overrides,
  })

  const defaultProps = {
    config: defaultConfig,
    moduleKey: 'test-module',
    canSave: true,
    canAudit: true,
    saving: false,
    showActions: false,
    lineItemsLocked: false,
    lockedLineItemsNotice: '',
    parentImporting: false,
    onCancel: vi.fn(),
    onOpenParentSelector: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(groupFieldsByRow).mockImplementation((fields) =>
      fields.length ? [fields] : [],
    )
    vi.mocked(isEditorFieldDisabledForModule).mockReturnValue(false)
    mocks.useFormInstance.mockReturnValue({
      getFieldValue: vi.fn(),
      getFieldsValue: vi.fn().mockReturnValue({}),
    })
    mocks.useWatch.mockReturnValue({})
  })

  it('renders nothing when no form fields', () => {
    const { container } = render(<ModuleEditorFormSection {...defaultProps} />)
    expect(container.textContent).toBe('')
  })

  it('uses an empty field list when formFields is omitted', () => {
    const { formFields: _formFields, ...config } = defaultConfig

    const { container } = render(
      <ModuleEditorFormSection {...defaultProps} config={config} />,
    )

    expect(container.textContent).toBe('')
    expect(groupFieldsByRow).toHaveBeenCalledWith([])
  })

  it('renders with form fields', () => {
    const config = {
      ...defaultProps.config,
      formFields: [createField({ key: 'field1', label: 'Field 1' })],
    }
    vi.mocked(groupFieldsByRow).mockReturnValue([
      [createField({ key: 'field1', label: 'Field 1' })],
    ])
    render(<ModuleEditorFormSection {...defaultProps} config={config} />)
    expect(screen.getByText('modules.editorForm.documentInfo')).toBeTruthy()
    expect(screen.getByLabelText('Preallocated ID')).toBeTruthy()
    expect(screen.getByTestId('form-field')).toHaveTextContent('Field 1')
  })

  it('filters form fields using current form values before grouping rows', () => {
    const formValues = { paymentPurpose: 'PURCHASE_PREPAYMENT' }
    mocks.useWatch.mockReturnValue(formValues)
    const statementField = createField({
      key: 'sourceStatementId',
      label: 'Statement',
      visibleWhen: (form) => form?.paymentPurpose === 'STATEMENT_SETTLEMENT',
    })
    const purchaseOrderField = createField({
      key: 'purchaseOrderNo',
      label: 'Purchase order',
      visibleWhen: (form) => form?.paymentPurpose === 'PURCHASE_PREPAYMENT',
    })

    render(
      <ModuleEditorFormSection
        {...defaultProps}
        config={{
          ...defaultProps.config,
          formFields: [statementField, purchaseOrderField],
        }}
      />,
    )

    expect(groupFieldsByRow).toHaveBeenCalledWith([purchaseOrderField])
    expect(screen.queryByText('Statement')).toBeNull()
    expect(screen.getByText('Purchase order')).toBeTruthy()
  })

  it('shows parent selector action for eligible modules without line items', () => {
    const onOpenParentSelector = vi.fn()
    mocks.useWatch.mockReturnValue({
      paymentPurpose: 'PURCHASE_PREPAYMENT',
    })

    render(
      <ModuleEditorFormSection
        {...defaultProps}
        showActions
        parentImporting
        onOpenParentSelector={onOpenParentSelector}
        config={{
          ...defaultProps.config,
          formFields: [createField({ key: 'paymentPurpose' })],
          parentImport: {
            parentModuleKey: 'purchase-order',
            parentFieldKey: 'purchaseOrderNo',
            parentDisplayFieldKey: 'orderNo',
            label: '采购订单',
            buttonText: '选择采购订单',
            visibleWhen: (form) =>
              form.paymentPurpose === 'PURCHASE_PREPAYMENT',
          },
        }}
      />,
    )

    const button = screen.getByRole('button', { name: '选择采购订单' })
    expect(button).toHaveAttribute('data-loading', 'true')
    fireEvent.click(button)
    expect(onOpenParentSelector).toHaveBeenCalledTimes(1)
  })

  it('passes authoritative primary number to disabled resolver', () => {
    const config = {
      ...defaultProps.config,
      primaryNoKey: 'orderNo',
      formFields: [createField({ key: 'orderNo', label: 'Order No' })],
    }
    vi.mocked(groupFieldsByRow).mockReturnValue([
      [createField({ key: 'orderNo', label: 'Order No' })],
    ])

    render(
      <ModuleEditorFormSection
        {...defaultProps}
        config={config}
        authoritativePrimaryNo="ORD-001"
      />,
    )

    expect(isEditorFieldDisabledForModule).toHaveBeenCalledWith(
      'test-module',
      'orderNo',
      false,
      true,
      false,
      'orderNo',
      undefined,
      {},
      'ORD-001',
    )
  })

  it('renders the locked notice and forwards footer action props when enabled', () => {
    render(
      <ModuleEditorFormSection
        {...defaultProps}
        canAudit={false}
        canSave={false}
        lockedLineItemsNotice="Line items are locked"
        saving
        showActions
        config={{
          ...defaultProps.config,
          formFields: [createField({ key: 'status', label: 'Status' })],
        }}
      />,
    )

    expect(screen.getByText('Line items are locked')).toHaveAttribute(
      'data-type',
      'warning',
    )
    expect(screen.getByText('Line items are locked')).toHaveAttribute(
      'data-show-icon',
      'true',
    )
    expect(screen.getByTestId('footer-actions')).toBeTruthy()
    expect(mocks.EditorFooterActions).toHaveBeenCalledWith(
      expect.objectContaining({
        canAudit: false,
        canSave: false,
        saving: true,
        onCancel: defaultProps.onCancel,
        onSave: defaultProps.onSave,
      }),
      undefined,
    )
  })

  it('clamps explicit column spans and expands full-row fields', () => {
    vi.mocked(groupFieldsByRow).mockReturnValue([
      [
        createField({ key: 'tooSmall', label: 'Too Small', colSpan: 3 }),
        createField({ key: 'fractional', label: 'Fractional', colSpan: 12.8 }),
        createField({ key: 'tooLarge', label: 'Too Large', colSpan: 30 }),
        createField({ key: 'fullRow', label: 'Full Row', fullRow: true }),
        createField({ key: 'notes', label: 'Notes', type: 'textarea' }),
        createField({
          key: 'infinite',
          label: 'Infinite',
          colSpan: Number.POSITIVE_INFINITY,
        }),
      ],
    ])

    render(
      <ModuleEditorFormSection
        {...defaultProps}
        config={{
          ...defaultProps.config,
          formFields: [
            createField({ key: 'tooSmall', colSpan: 3 }),
            createField({ key: 'fractional', colSpan: 12.8 }),
            createField({ key: 'tooLarge', colSpan: 30 }),
            createField({ key: 'fullRow', fullRow: true }),
            createField({ key: 'notes', type: 'textarea' }),
            createField({
              key: 'infinite',
              colSpan: Number.POSITIVE_INFINITY,
            }),
          ],
        }}
      />,
    )

    expect(screen.getAllByTestId('form-field')).toHaveLength(6)
    expect(
      screen.getAllByTestId('form-field').map((field) => field.parentElement),
    ).toEqual([
      expect.objectContaining({
        dataset: expect.objectContaining({ lg: '6' }),
      }),
      expect.objectContaining({
        dataset: expect.objectContaining({ lg: '12' }),
      }),
      expect.objectContaining({
        dataset: expect.objectContaining({ lg: '24' }),
      }),
      expect.objectContaining({
        dataset: expect.objectContaining({ lg: '24' }),
      }),
      expect.objectContaining({
        dataset: expect.objectContaining({ lg: '24' }),
      }),
      expect.objectContaining({
        dataset: expect.objectContaining({ lg: '6' }),
      }),
    ])
  })

  it('passes parent import, lock state, field disabled state, and watched values to disabled resolver', () => {
    const formValues = { parentNo: 'PO-001', status: 'draft' }
    mocks.useWatch.mockReturnValue(formValues)
    vi.mocked(isEditorFieldDisabledForModule).mockReturnValue(true)
    vi.mocked(groupFieldsByRow).mockReturnValue([
      [
        createField({
          key: 'parentNo',
          label: 'Parent No',
          disabled: true,
        }),
      ],
    ])

    render(
      <ModuleEditorFormSection
        {...defaultProps}
        canSave={false}
        lineItemsLocked
        authoritativePrimaryNo="BILL-001"
        config={{
          ...defaultProps.config,
          primaryNoKey: 'billNo',
          parentImport: {
            parentModuleKey: 'purchase-order',
            parentFieldKey: 'parentNo',
            parentDisplayFieldKey: 'orderNo',
            label: 'Purchase Order',
          },
          formFields: [
            createField({
              key: 'parentNo',
              disabled: true,
            }),
          ],
        }}
      />,
    )

    expect(screen.getByTestId('form-field')).toHaveAttribute(
      'data-disabled',
      'true',
    )
    expect(isEditorFieldDisabledForModule).toHaveBeenCalledWith(
      'test-module',
      'parentNo',
      true,
      false,
      true,
      'billNo',
      'parentNo',
      formValues,
      'BILL-001',
    )
  })

  it('falls back to an empty values object when no watched form values exist', () => {
    mocks.useWatch.mockReturnValue(undefined)
    vi.mocked(groupFieldsByRow).mockReturnValue([
      [createField({ key: 'fallback', label: 'Fallback' })],
    ])

    render(
      <ModuleEditorFormSection
        {...defaultProps}
        config={{
          ...defaultProps.config,
          formFields: [createField({ key: 'fallback' })],
        }}
      />,
    )

    expect(isEditorFieldDisabledForModule).toHaveBeenCalledWith(
      'test-module',
      'fallback',
      false,
      true,
      false,
      undefined,
      undefined,
      {},
      undefined,
    )
  })
})
