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
  const Input = (props: Record<string, unknown>) => <input {...props} />
  Input.Password = (props: Record<string, unknown>) => <input type="password" {...props} />
  Input.TextArea = (props: Record<string, unknown>) => <textarea {...props} />
  return { default: Input }
})

vi.mock('antd/es/select', () => ({
  default: () => <div>Select</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/tag', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
}))

vi.mock('antd/es/space', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/row', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/col', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [
    { label: '正常', value: '正常' },
    { label: '禁用', value: '禁用' },
  ],
  enabledStatusValues: ['正常', '禁用'],
}))

vi.mock('@/lib/antd-form', () => ({
  getFormString: () => '',
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

import { UserAccountEditorModal } from '@/views/system/UserAccountEditorModal'

describe('UserAccountEditorModal', () => {
  const defaultProps = {
    open: true,
    mode: 'create' as const,
    loading: false,
    saving: false,
    form: formInstance as never,
    editingId: null,
    loginNameValidationMessage: '',
    loginNameChecking: false,
    departmentOptions: [
      { id: '1', departmentName: '技术部' },
      { id: '2', departmentName: '销售部' },
    ],
    roleOptions: [
      { id: 1, roleName: '管理员', status: '正常' },
      { id: 2, roleName: '普通用户', status: '正常' },
    ],
    selectedRoleIds: [],
    selectedRoleDataScope: '本人',
    selectedRoleSummaries: [],
    onCheckLoginName: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(UserAccountEditorModal).toBeDefined()
    expect(typeof UserAccountEditorModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('renders create title in create mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="create" />)
    expect(screen.getByText('system.userAccountEditor.createTitle')).toBeInTheDocument()
  })

  it('renders edit title in edit mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="edit" />)
    expect(screen.getByText('system.userAccountEditor.editTitle')).toBeInTheDocument()
  })

  it('renders account info section', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.accountInfo')).toBeInTheDocument()
  })

  it('renders login name field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.loginName')).toBeInTheDocument()
  })

  it('renders user name field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.userName')).toBeInTheDocument()
  })

  it('renders mobile field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.mobile')).toBeInTheDocument()
  })

  it('renders permission config section', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.permConfig')).toBeInTheDocument()
  })

  it('renders roles field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.roles')).toBeInTheDocument()
  })

  it('renders supplement info section', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.supplementInfo')).toBeInTheDocument()
  })

  it('renders remark field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.remark')).toBeInTheDocument()
  })

  it('renders password field in create mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="create" />)
    expect(screen.getByText('system.userAccountEditor.initialPassword')).toBeInTheDocument()
  })

  it('does not render password field in edit mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="edit" />)
    expect(screen.queryByText('system.userAccountEditor.initialPassword')).not.toBeInTheDocument()
  })

  it('renders department options', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.department')).toBeInTheDocument()
  })

  it('renders data scope field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.roleDataScope')).toBeInTheDocument()
  })

  it('renders permission summary field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(screen.getByText('system.userAccountEditor.permSummary')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<UserAccountEditorModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders role summaries when present', () => {
    render(
      <UserAccountEditorModal
        {...defaultProps}
        selectedRoleSummaries={['全部权限', '部分权限']}
      />,
    )
    expect(screen.getByText('全部权限')).toBeInTheDocument()
    expect(screen.getByText('部分权限')).toBeInTheDocument()
  })
})
