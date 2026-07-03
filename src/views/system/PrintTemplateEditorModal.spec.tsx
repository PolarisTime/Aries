import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd', () => {
  const Form = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Form.Item = ({
    children,
    label,
  }: {
    children: React.ReactNode
    label: string
  }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  )
  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  )
  Input.TextArea = (
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  ) => <textarea {...props} />

  const Space = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )

  return {
    Alert: ({
      message,
      title,
      description,
    }: {
      message?: string
      title?: string
      description?: React.ReactNode
    }) => (
      <div>
        <div>{title ?? message}</div>
        {description && <div>{description}</div>}
      </div>
    ),
    Button: ({
      children,
      onClick,
      loading,
      type,
    }: {
      children: React.ReactNode
      onClick?: () => void
      loading?: boolean
      type?: string
    }) => (
      <button
        aria-busy={loading ? 'true' : undefined}
        data-button-type={type}
        onClick={onClick}
      >
        {children}
      </button>
    ),
    Card: ({
      children,
      extra,
      title,
    }: {
      children: React.ReactNode
      extra?: React.ReactNode
      title?: React.ReactNode
    }) => (
      <section>
        {title}
        {extra}
        {children}
      </section>
    ),
    Col: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Divider: () => <hr />,
    Form,
    Input,
    Row: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Select: ({
      allowClear,
      onChange,
      options = [],
    }: {
      allowClear?: boolean
      onChange?: (value: unknown) => void
      options?: Array<{ label: string; value: string | number }>
    }) => (
      <div>
        <span>Select</span>
        {allowClear && (
          <button type="button" onClick={() => onChange?.(undefined)}>
            clear
          </button>
        )}
        {onChange && (
          <button type="button" onClick={() => onChange('UNKNOWN')}>
            unknown option
          </button>
        )}
        {options.map((option) => (
          <span key={String(option.value)}>
            <button type="button" onClick={() => onChange?.(option.value)}>
              {option.label}
            </button>
            {Number.isFinite(Number(option.value)) && (
              <button
                data-testid={`select-numeric-${option.label}`}
                type="button"
                onClick={() => onChange?.(Number(option.value))}
              >
                {`${option.label} numeric`}
              </button>
            )}
          </span>
        ))}
      </div>
    ),
    Space,
    Tag: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    Typography: {
      Paragraph: ({ children }: { children: React.ReactNode }) => (
        <p>{children}</p>
      ),
      Text: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    },
  }
})

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetOptions: [{ label: '采购订单', value: 'purchase-order' }],
}))

vi.mock('@/utils/form-control-a11y', () => ({
  buildLabeledFormItemProps: (opts: Record<string, unknown>) => opts,
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (...parts: string[]) => parts.join('-'),
}))

const formInstance = {
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  setFieldsValue: vi.fn(),
  setFieldValue: vi.fn(),
  resetFields: vi.fn(),
  validateFields: vi.fn(),
}

import { PrintTemplateEditorModal } from '@/views/system/PrintTemplateEditorModal'

describe('PrintTemplateEditorModal', () => {
  const defaultProps = {
    open: true,
    editing: false,
    form: formInstance as never,
    templateHtml: '',
    settlementCompanyOptions: [],
    saving: false,
    onTemplateHtmlChange: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(PrintTemplateEditorModal).toBeDefined()
    expect(typeof PrintTemplateEditorModal).toBe('function')
  })

  it('renders editor workspace when open', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(screen.getByText('common.back')).toBeInTheDocument()
    expect(screen.getByText('common.save')).toBeInTheDocument()
  })

  it('invokes close and save actions from the header buttons', () => {
    render(<PrintTemplateEditorModal {...defaultProps} saving={true} />)

    fireEvent.click(screen.getByText('common.back'))
    fireEvent.click(screen.getByText('common.cancel'))
    fireEvent.click(screen.getByText('common.save'))

    expect(defaultProps.onClose).toHaveBeenCalledTimes(2)
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByText('common.save')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders create title when not editing', () => {
    render(<PrintTemplateEditorModal {...defaultProps} editing={false} />)
    expect(
      screen.getByText('system.printTemplateEditor.createTitle'),
    ).toBeInTheDocument()
  })

  it('renders edit title when editing', () => {
    render(<PrintTemplateEditorModal {...defaultProps} editing={true} />)
    expect(
      screen.getByText('system.printTemplateEditor.editTitle'),
    ).toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.printTemplateEditor.billType'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.templateName'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.templateType'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.templateCode'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.engine'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.assetRef'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.settlementCompany'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.versionNo'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.status'),
    ).toBeInTheDocument()
  })

  it('renders template content field', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(
      screen.getAllByText('system.printTemplateEditor.templateContent'),
    ).not.toHaveLength(0)
  })

  it('renders basic info and available fields sections', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.printTemplateEditor.basicInfo'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.printTemplateEditor.availableFields'),
    ).toBeInTheDocument()
  })

  it('renders help alert', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain(
      'system.printTemplateEditor.helpTitle',
    )
    expect(
      screen.getByText('system.printTemplateEditor.unifiedPrintApi'),
    ).toBeInTheDocument()
  })

  it('renders common fields section', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain(
      'system.printTemplateEditor.commonFields',
    )
  })

  it('renders detail fields section', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain(
      'system.printTemplateEditor.detailFields',
    )
  })

  it('renders layout fields section', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain(
      'system.printTemplateEditor.layoutFields',
    )
  })

  it('does not render when closed', () => {
    render(<PrintTemplateEditorModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
    expect(screen.queryByText('common.back')).not.toBeInTheDocument()
  })

  it('updates engine when the template type changes', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)

    fireEvent.click(
      screen.getByText('system.printTemplateEditor.templateTypeCoord'),
    )
    fireEvent.click(
      screen.getByText('system.printTemplateEditor.templateTypePdfForm'),
    )
    fireEvent.click(screen.getAllByText('unknown option')[0])

    expect(formInstance.setFieldValue).toHaveBeenNthCalledWith(
      1,
      'engine',
      'LODOP',
    )
    expect(formInstance.setFieldValue).toHaveBeenNthCalledWith(
      2,
      'engine',
      'PDF_FORM',
    )
    expect(formInstance.setFieldValue).toHaveBeenNthCalledWith(
      3,
      'engine',
      'LODOP',
    )
  })

  it('emits template html changes from the textarea', () => {
    render(
      <PrintTemplateEditorModal
        {...defaultProps}
        templateHtml="<div>old</div>"
      />,
    )

    fireEvent.change(screen.getByDisplayValue('<div>old</div>'), {
      target: { value: '<div>new</div>' },
    })

    expect(defaultProps.onTemplateHtmlChange).toHaveBeenCalledWith(
      '<div>new</div>',
    )
  })

  it('resolves settlement company name when select emits string id', () => {
    render(
      <PrintTemplateEditorModal
        {...defaultProps}
        settlementCompanyOptions={[
          {
            id: '330050675528433664',
            value: '330050675528433664',
            label: 'TEST9',
            companyName: 'TEST9',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('TEST9'))

    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyName',
      'TEST9',
    )
  })

  it('resolves settlement company name when select emits numeric id', () => {
    render(
      <PrintTemplateEditorModal
        {...defaultProps}
        settlementCompanyOptions={[
          {
            id: '1001',
            value: '001',
            label: 'Numeric Company',
            companyName: 'Numeric Company',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByTestId('select-numeric-Numeric Company'))

    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyId',
      '001',
    )
    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyName',
      'Numeric Company',
    )
  })

  it('clears settlement company fields when no option matches', () => {
    render(
      <PrintTemplateEditorModal
        {...defaultProps}
        settlementCompanyOptions={[
          {
            id: '330050675528433664',
            value: '330050675528433664',
            label: 'TEST9',
            companyName: 'TEST9',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('clear'))

    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyId',
      undefined,
    )
    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyName',
      '',
    )
  })

  it('clears settlement company fields when a nonnumeric value has no match', () => {
    render(
      <PrintTemplateEditorModal
        {...defaultProps}
        settlementCompanyOptions={[
          {
            id: '330050675528433664',
            value: '330050675528433664',
            label: 'TEST9',
            companyName: 'TEST9',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getAllByText('unknown option')[1])

    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyId',
      undefined,
    )
    expect(formInstance.setFieldValue).toHaveBeenCalledWith(
      'settlementCompanyName',
      '',
    )
  })
})
