import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({ children, title, open }: { children: React.ReactNode; title: string; open: boolean }) =>
    open ? (
      <div data-testid="form-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/form', () => {
  const Form = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Form.Item = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  )
  return { default: Form }
})

vi.mock('antd/es/input', () => {
  const Input = () => <input />
  Input.TextArea = () => <textarea />
  return { default: Input }
})

vi.mock('antd/es/select', () => ({
  default: () => <div>Select</div>,
}))

vi.mock('antd/es/alert', () => ({
  default: ({ message, description }: { message: string; description?: React.ReactNode }) => (
    <div>
      <div>{message}</div>
      {description && <div>{description}</div>}
    </div>
  ),
}))

vi.mock('antd/es/row', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/col', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/tag', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Paragraph: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  },
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetOptions: [
    { label: '采购订单', value: 'purchase-order' },
  ],
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
    saving: false,
    onTemplateHtmlChange: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(PrintTemplateEditorModal).toBeDefined()
    expect(typeof PrintTemplateEditorModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('renders create title when not editing', () => {
    render(<PrintTemplateEditorModal {...defaultProps} editing={false} />)
    expect(screen.getByText('system.printTemplateEditor.createTitle')).toBeInTheDocument()
  })

  it('renders edit title when editing', () => {
    render(<PrintTemplateEditorModal {...defaultProps} editing={true} />)
    expect(screen.getByText('system.printTemplateEditor.editTitle')).toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(screen.getByText('system.printTemplateEditor.billType')).toBeInTheDocument()
    expect(screen.getByText('system.printTemplateEditor.templateName')).toBeInTheDocument()
    expect(screen.getByText('system.printTemplateEditor.templateType')).toBeInTheDocument()
  })

  it('renders template content field', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(screen.getByText('system.printTemplateEditor.templateContent')).toBeInTheDocument()
  })

  it('renders help alert', () => {
    render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(screen.getByText('system.printTemplateEditor.helpTitle')).toBeInTheDocument()
  })

  it('renders common fields section', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain('system.printTemplateEditor.commonFields')
  })

  it('renders detail fields section', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain('system.printTemplateEditor.detailFields')
  })

  it('renders layout fields section', () => {
    const { container } = render(<PrintTemplateEditorModal {...defaultProps} />)
    expect(container.textContent).toContain('system.printTemplateEditor.layoutFields')
  })

  it('does not render when closed', () => {
    render(<PrintTemplateEditorModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })
})
