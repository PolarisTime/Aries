import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getFormStringMock = vi.hoisted(() => vi.fn((): string | undefined => ''))
const formItemEventResults = vi.hoisted(() => [] as unknown[])

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
  }: {
    children: React.ReactNode
    title: string
    open: boolean
  }) =>
    open ? (
      <div data-testid="form-modal">
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
    extra,
    getValueFromEvent,
    help,
    htmlFor,
    label,
    name,
    validateStatus,
  }: {
    children: React.ReactNode
    extra?: React.ReactNode
    getValueFromEvent?: (value?: Array<number | string>) => unknown
    help?: React.ReactNode
    htmlFor?: string
    label?: React.ReactNode
    name?: string
    validateStatus?: string
  }) => (
    <div
      data-testid={name ? `form-item-${name}` : undefined}
      data-validate-status={validateStatus ?? ''}
    >
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {help && <div data-testid={`form-item-${name}-help`}>{help}</div>}
      {extra && <div>{extra}</div>}
      {getValueFromEvent && (
        <>
          <button
            data-testid={`normalize-${name}`}
            onClick={() =>
              formItemEventResults.push(getValueFromEvent([1, '2']))
            }
            type="button"
          >
            normalize
          </button>
          <button
            data-testid={`normalize-${name}-empty`}
            onClick={() =>
              formItemEventResults.push(getValueFromEvent(undefined))
            }
            type="button"
          >
            normalize empty
          </button>
        </>
      )}
      {children}
    </div>
  )
  const Input = (props: Record<string, unknown>) => <input {...props} />
  Input.Password = (props: Record<string, unknown>) => (
    <input type="password" {...props} />
  )
  Input.TextArea = (props: Record<string, unknown>) => <textarea {...props} />

  return {
    Col: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Form,
    Input,
    Row: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Select: ({
      maxTagCount,
      mode,
      options = [],
      placeholder,
    }: {
      maxTagCount?: number
      mode?: string
      options?: Array<{
        disabled?: boolean
        label: React.ReactNode
        value: number | string
      }>
      placeholder?: string
    }) => (
      <select
        aria-label={placeholder}
        data-max-tag-count={maxTagCount ?? ''}
        data-mode={mode ?? ''}
        data-testid={`select-${placeholder ?? 'unknown'}`}
        multiple={mode === 'multiple'}
      >
        {options.map((option) => (
          <option
            disabled={option.disabled}
            key={String(option.value)}
            value={String(option.value)}
          >
            {option.label}
          </option>
        ))}
      </select>
    ),
    Space: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Spin: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Tag: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    Typography: {
      Text: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    },
  }
})

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [
    { label: '正常', value: '正常' },
    { label: '禁用', value: '禁用' },
  ],
  enabledStatusValues: ['正常', '禁用'],
}))

vi.mock('@/lib/antd-form', () => ({
  getFormString: getFormStringMock,
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
      { id: '700520000000000001', roleName: '管理员', status: '正常' },
      { id: '700520000000000002', roleName: '普通用户', status: '正常' },
    ],
    selectedRoleIds: [],
    selectedRoleDataScope: '本人',
    selectedRoleSummaries: [],
    onCheckLoginName: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getFormStringMock.mockReturnValue('')
    formItemEventResults.length = 0
  })

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
    expect(
      screen.getByText('system.userAccountEditor.createTitle'),
    ).toBeInTheDocument()
  })

  it('renders edit title in edit mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="edit" />)
    expect(
      screen.getByText('system.userAccountEditor.editTitle'),
    ).toBeInTheDocument()
  })

  it('renders account info section', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.accountInfo'),
    ).toBeInTheDocument()
  })

  it('renders login name field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.loginName'),
    ).toBeInTheDocument()
  })

  it('renders user name field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.userName'),
    ).toBeInTheDocument()
  })

  it('renders mobile field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.mobile'),
    ).toBeInTheDocument()
  })

  it('renders permission config section', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.permConfig'),
    ).toBeInTheDocument()
  })

  it('renders roles field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.roles'),
    ).toBeInTheDocument()
  })

  it('renders supplement info section', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.supplementInfo'),
    ).toBeInTheDocument()
  })

  it('renders remark field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.remark'),
    ).toBeInTheDocument()
  })

  it('renders password field in create mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="create" />)
    expect(
      screen.getByText('system.userAccountEditor.initialPassword'),
    ).toBeInTheDocument()
  })

  it('does not render password field in edit mode', () => {
    render(<UserAccountEditorModal {...defaultProps} mode="edit" />)
    expect(
      screen.queryByText('system.userAccountEditor.initialPassword'),
    ).not.toBeInTheDocument()
  })

  it('renders department options', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.department'),
    ).toBeInTheDocument()
  })

  it('renders data scope field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.roleDataScope'),
    ).toBeInTheDocument()
  })

  it('renders permission summary field', () => {
    render(<UserAccountEditorModal {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountEditor.permSummary'),
    ).toBeInTheDocument()
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

  it('shows login name checking state before validation errors', () => {
    render(
      <UserAccountEditorModal
        {...defaultProps}
        loginNameChecking={true}
        loginNameValidationMessage="登录名已存在"
      />,
    )

    expect(screen.getByTestId('form-item-loginName')).toHaveAttribute(
      'data-validate-status',
      'validating',
    )
    expect(
      screen.getByText('system.userAccountEditor.checkingLoginName'),
    ).toBeInTheDocument()
    expect(screen.queryByText('登录名已存在')).not.toBeInTheDocument()
  })

  it('shows login name validation errors after checking completes', () => {
    render(
      <UserAccountEditorModal
        {...defaultProps}
        loginNameValidationMessage="登录名已存在"
      />,
    )

    expect(screen.getByTestId('form-item-loginName')).toHaveAttribute(
      'data-validate-status',
      'error',
    )
    expect(screen.getByText('登录名已存在')).toBeInTheDocument()
  })

  it('checks login name on blur in create mode without an exclude id', () => {
    const onCheckLoginName = vi.fn()
    getFormStringMock.mockReturnValue('alice')

    render(
      <UserAccountEditorModal
        {...defaultProps}
        onCheckLoginName={onCheckLoginName}
      />,
    )
    fireEvent.blur(
      screen.getByPlaceholderText(
        'system.userAccountEditor.loginNamePlaceholder',
      ),
    )

    expect(getFormStringMock).toHaveBeenCalledWith(formInstance, 'loginName')
    expect(onCheckLoginName).toHaveBeenCalledWith('alice', undefined)
  })

  it('checks login name on blur in edit mode with the editing id', () => {
    const onCheckLoginName = vi.fn()
    getFormStringMock.mockReturnValue('bob')

    render(
      <UserAccountEditorModal
        {...defaultProps}
        editingId="user-1"
        mode="edit"
        onCheckLoginName={onCheckLoginName}
      />,
    )
    fireEvent.blur(
      screen.getByPlaceholderText(
        'system.userAccountEditor.loginNamePlaceholder',
      ),
    )

    expect(onCheckLoginName).toHaveBeenCalledWith('bob', 'user-1')
  })

  it('passes undefined exclude id in edit mode when editing id is absent', () => {
    const onCheckLoginName = vi.fn()
    getFormStringMock.mockReturnValue('carol')

    render(
      <UserAccountEditorModal
        {...defaultProps}
        editingId={null}
        mode="edit"
        onCheckLoginName={onCheckLoginName}
      />,
    )
    fireEvent.blur(
      screen.getByPlaceholderText(
        'system.userAccountEditor.loginNamePlaceholder',
      ),
    )

    expect(onCheckLoginName).toHaveBeenCalledWith('carol', undefined)
  })

  it('skips login name check when the field is blank or missing', () => {
    const onCheckLoginName = vi.fn()
    getFormStringMock.mockReturnValue('   ')
    const { unmount } = render(
      <UserAccountEditorModal
        {...defaultProps}
        onCheckLoginName={onCheckLoginName}
      />,
    )
    fireEvent.blur(
      screen.getByPlaceholderText(
        'system.userAccountEditor.loginNamePlaceholder',
      ),
    )
    unmount()

    getFormStringMock.mockReturnValue(undefined)
    render(
      <UserAccountEditorModal
        {...defaultProps}
        onCheckLoginName={onCheckLoginName}
      />,
    )
    fireEvent.blur(
      screen.getByPlaceholderText(
        'system.userAccountEditor.loginNamePlaceholder',
      ),
    )

    expect(onCheckLoginName).not.toHaveBeenCalled()
  })

  it('normalizes role ids from select values', () => {
    render(<UserAccountEditorModal {...defaultProps} />)

    fireEvent.click(screen.getByTestId('normalize-roleIds'))
    fireEvent.click(screen.getByTestId('normalize-roleIds-empty'))

    expect(formItemEventResults).toEqual([['1', '2'], undefined])
  })

  it('renders department ids with an empty value fallback', () => {
    render(
      <UserAccountEditorModal
        {...defaultProps}
        departmentOptions={[{ id: '', departmentName: '未分配部门' }]}
      />,
    )

    const departmentSelect = screen.getByTestId(
      'select-system.userAccountEditor.departmentPlaceholder',
    )
    expect(
      within(departmentSelect).getByRole('option', { name: '未分配部门' }),
    ).toHaveAttribute('value', '')
  })

  it('marks disabled and conflicting role options', () => {
    render(
      <UserAccountEditorModal
        {...defaultProps}
        roleConflicts={{ source: ['conflict'] }}
        roleOptions={[
          { id: 'selected-disabled', roleName: '已选禁用角色', status: '禁用' },
          { id: 'blocked', roleName: '禁用角色', status: '禁用' },
          { id: 'conflict', roleName: '互斥角色', status: '正常' },
          { id: 'normal', roleName: '普通角色', status: '正常' },
        ]}
        selectedRoleIds={['selected-disabled', 'source']}
      />,
    )

    const roleSelect = screen.getByTestId(
      'select-system.userAccountEditor.rolesPlaceholder',
    )
    expect(roleSelect).toHaveAttribute('data-mode', 'multiple')
    expect(roleSelect).toHaveAttribute('data-max-tag-count', '5')
    expect(
      within(roleSelect).getByRole('option', { name: '已选禁用角色' }),
    ).not.toBeDisabled()
    expect(
      within(roleSelect).getByRole('option', { name: '禁用角色' }),
    ).toBeDisabled()
    expect(
      within(roleSelect).getByRole('option', {
        name: '互斥角色 system.userAccountEditor.roleConflict',
      }),
    ).toBeDisabled()
    expect(
      within(roleSelect).getByRole('option', { name: '普通角色' }),
    ).not.toBeDisabled()
  })
})
