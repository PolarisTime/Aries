import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
  const Input = () => <input />
  Input.TextArea = () => <textarea />

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
    Button: ({ children }: { children: React.ReactNode }) => (
      <button>{children}</button>
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
      onChange,
      options = [],
    }: {
      onChange?: (value: unknown) => void
      options?: Array<{ label: string; value: string | number }>
    }) => (
      <div>
        <span>Select</span>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange?.(Number(option.value))}
          >
            {option.label}
          </button>
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

  it('renders without crashing', () => {
    expect(PrintTemplateEditorModal).toBeDefined()
    expect(typeof PrintTemplateEditorModal).toBe('function')
  })

  it('renders editor workspace when open', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(screen.getByText('common.back')).toBeInTheDocument()
    expect(screen.getByText('common.save')).toBeInTheDocument()
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
  })

  it('resolves settlement company name when select emits numeric id', () => {
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
})
