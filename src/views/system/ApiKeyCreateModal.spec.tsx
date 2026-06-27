import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({
    children,
    title,
    open,
    width,
  }: {
    children: React.ReactNode
    title: string
    open: boolean
    width?: number
  }) =>
    open ? (
      <div data-testid="form-modal" data-width={width}>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
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
  Form.useForm = () => [{}]

  const Select = ({
    placeholder,
    options,
  }: {
    placeholder?: string
    options?: Array<{ label: string; value: string }>
  }) => (
    <div data-options={options?.map((item) => item.label).join('|') || ''}>
      {placeholder || 'Select'}
    </div>
  )

  const Input = () => <input />
  Input.TextArea = () => <textarea />

  const Space = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Space.Compact = Space
  Space.Addon = Space

  return {
    Alert: ({ title }: { title: string }) => <div>{title}</div>,
    Button: ({ children, ...props }: Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
    Checkbox: Object.assign(
      ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
      {
        Group: ({ children }: { children: React.ReactNode }) => (
          <div>{children}</div>
        ),
      },
    ),
    Form,
    Input,
    InputNumber: () => <input type="number" />,
    Radio: Object.assign(
      ({
        children,
        value,
        onClick,
      }: {
        children?: React.ReactNode
        value?: string
        onClick?: () => void
      }) => (
        <button data-value={value} onClick={onClick}>
          {children}
        </button>
      ),
      {
        Button: ({
          children,
          onClick,
          value,
        }: {
          children: React.ReactNode
          value?: string
          onClick?: () => void
        }) => (
          <button data-value={value} onClick={onClick}>
            {children}
          </button>
        ),
        Group: ({
          children,
          onChange,
        }: {
          children: React.ReactNode
          onChange?: (event: { target: { value: string } }) => void
        }) => (
          <div
            onClick={(event) => {
              const target = event.target as HTMLElement
              const value = target.closest('button')?.dataset.value
              if (value) onChange?.({ target: { value } })
            }}
          >
            {children}
          </div>
        ),
      },
    ),
    Select,
    Space,
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
      { code: 'purchase-order', title: '采购订单', group: '采购' },
      { code: 'purchase-inbound', title: '采购入库', group: '采购' },
      { code: 'sales-order', title: '销售订单', group: '销售' },
      { code: 'sales-outbound', title: '销售出库', group: '销售' },
      { code: 'freight-bill', title: '物流单', group: '物流' },
      { code: 'receipt', title: '收款单', group: '财务' },
      { code: 'operation-log', title: '操作日志', group: '系统' },
      { code: 'database', title: '数据库管理', group: '系统' },
      { code: 'session', title: '会话管理', group: '系统' },
      { code: 'api-key', title: 'API Key 管理', group: '系统' },
    ],
    actionOptions: [
      { code: 'read', title: '读取' },
      { code: 'create', title: '新增' },
      { code: 'update', title: '编辑' },
      { code: 'delete', title: '删除' },
      { code: 'audit', title: '审核' },
      { code: 'export', title: '导出' },
      { code: 'print', title: '打印' },
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
    expect(screen.getByTestId('form-modal')).toHaveAttribute(
      'data-width',
      '920',
    )
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

  it('renders preset templates and grouped permission editor', () => {
    render(<ApiKeyCreateModal {...defaultProps} />)
    expect(screen.getByText('system.apiKey.presetTemplate')).toBeInTheDocument()
    expect(
      screen.getByText('system.apiKeyPresets.businessWrite'),
    ).toBeInTheDocument()
    expect(screen.getByText('采购')).toBeInTheDocument()
    expect(screen.getByText('采购订单')).toBeInTheDocument()
    expect(screen.getByText('读取')).toBeInTheDocument()
  })

  it('applies preset values to the form', () => {
    render(<ApiKeyCreateModal {...defaultProps} />)
    fireEvent.click(screen.getByText('system.apiKeyPresets.businessWrite'))
    expect(formInstance.setFieldsValue).toHaveBeenCalledWith({
      presetKey: 'businessWrite',
      usageScope: '业务接口',
      allowedResources: [
        'purchase-order',
        'purchase-inbound',
        'sales-order',
        'sales-outbound',
        'freight-bill',
      ],
      allowedActions: ['read', 'create', 'update', 'audit', 'delete'],
    })
  })

  it('renders generated key view when key is set', () => {
    render(<ApiKeyCreateModal {...defaultProps} generatedKey="sk-abc123" />)
    expect(screen.getByText('system.apiKey.copyKeyHint')).toBeInTheDocument()
    expect(screen.getByText('sk-abc123')).toBeInTheDocument()
  })

  it('renders close button when key is generated', () => {
    render(<ApiKeyCreateModal {...defaultProps} generatedKey="sk-abc123" />)
    expect(screen.getByText('common.close')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(
      <ApiKeyCreateModal
        {...defaultProps}
        generatedKey="sk-abc123"
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByText('common.close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
