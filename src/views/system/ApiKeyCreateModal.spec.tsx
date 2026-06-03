import { fireEvent, render, screen } from '@testing-library/react'
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
  Form.useForm = () => [{}]
  return { default: Form }
})

vi.mock('antd/es/select', () => ({
  default: () => <div>Select</div>,
}))

vi.mock('antd/es/input', () => {
  const Input = () => <input />
  Input.TextArea = () => <textarea />
  return { default: Input }
})

vi.mock('antd/es/input-number', () => ({
  default: () => <input type="number" />,
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

vi.mock('antd/es/space', () => {
  const Space = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Space.Compact = Space
  return { default: Space }
})

vi.mock('antd/es/typography', () => ({
  default: {
    Paragraph: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
}))

vi.mock('antd/es/alert', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}))

const formInstance = {
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  setFieldsValue: vi.fn(),
  setFieldValue: vi.fn(),
  resetFields: vi.fn(),
  validateFields: vi.fn(),
}

import { ApiKeyCreateModal } from '@/views/system/ApiKeyCreateModal'

describe('ApiKeyCreateModal', () => {
  const defaultProps = {
    open: true,
    generatedKey: null,
    generating: false,
    totpDisabled: false,
    form: formInstance as never,
    userOptions: [
      { id: '1', userName: 'Admin', loginName: 'admin', mobile: '13800138000' },
    ],
    resourceOptions: [
      { code: 'order', title: '订单管理', group: '业务' },
    ],
    actionOptions: [
      { code: 'read', title: '读取' },
    ],
    onGenerate: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(ApiKeyCreateModal).toBeDefined()
    expect(typeof ApiKeyCreateModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(<ApiKeyCreateModal {...defaultProps} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ApiKeyCreateModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders generate title', () => {
    render(<ApiKeyCreateModal {...defaultProps} />)
    expect(screen.getByText('system.apiKey.generateTitle')).toBeInTheDocument()
  })

  it('renders form field labels', () => {
    render(<ApiKeyCreateModal {...defaultProps} />)
    expect(screen.getByText('system.apiKey.userId')).toBeInTheDocument()
    expect(screen.getByText('system.apiKey.keyName')).toBeInTheDocument()
    expect(screen.getByText('system.apiKey.usageScope')).toBeInTheDocument()
  })

  it('renders generated key view when key is set', () => {
    render(
      <ApiKeyCreateModal {...defaultProps} generatedKey="sk-abc123" />,
    )
    expect(screen.getByText('system.apiKey.copyKeyHint')).toBeInTheDocument()
    expect(screen.getByText('sk-abc123')).toBeInTheDocument()
  })

  it('renders close button when key is generated', () => {
    render(
      <ApiKeyCreateModal {...defaultProps} generatedKey="sk-abc123" />,
    )
    expect(screen.getByText('common.close')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(
      <ApiKeyCreateModal {...defaultProps} generatedKey="sk-abc123" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('common.close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
