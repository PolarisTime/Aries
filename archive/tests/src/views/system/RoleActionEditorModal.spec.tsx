import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryOptions = {
  queryKey: unknown[]
  queryFn: () => Promise<unknown>
  enabled: boolean
  staleTime: number
}

type SelectOption = {
  label: string
  value: string
}

const mockUseQuery = vi.fn()
const mockHttpGet = vi.fn()
const mockAsString = vi.fn((value: unknown) => String(value ?? ''))
const latestQueryOptions = () =>
  mockUseQuery.mock.calls.at(-1)?.[0] as QueryOptions

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({
    children,
    title,
    open,
    onClose,
    onSave,
    confirmLoading,
    okText,
    cancelText,
  }: {
    children: React.ReactNode
    title: string
    open: boolean
    onClose: () => void
    onSave: () => void
    confirmLoading: boolean
    okText: string
    cancelText: string
  }) =>
    open ? (
      <section
        data-testid="form-modal"
        data-confirm-loading={String(confirmLoading)}
      >
        <h1>{title}</h1>
        <button type="button" onClick={onSave}>
          {okText}
        </button>
        <button type="button" onClick={onClose}>
          {cancelText}
        </button>
        {children}
      </section>
    ) : null,
}))

vi.mock('antd', () => {
  const Form = ({
    children,
    form,
    layout,
  }: {
    children: React.ReactNode
    form: unknown
    layout: string
  }) => (
    <form
      data-testid="role-form"
      data-has-form={String(Boolean(form))}
      data-layout={layout}
    >
      {children}
    </form>
  )

  Form.Item = ({
    children,
    label,
    name,
    required,
  }: {
    children: React.ReactNode
    label?: string
    name?: string
    required?: boolean
  }) => (
    <div data-testid={`form-item-${name ?? 'template'}`}>
      {label ? <span>{label}</span> : null}
      {required ? <span data-testid={`required-${name}`}>*</span> : null}
      {children}
    </div>
  )

  const Input = ({
    placeholder,
    maxLength,
    disabled,
  }: {
    placeholder?: string
    maxLength?: number
    disabled?: boolean
  }) => (
    <input
      aria-label={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      placeholder={placeholder}
    />
  )

  Input.TextArea = ({
    placeholder,
    rows,
  }: {
    placeholder?: string
    rows?: number
  }) => (
    <textarea aria-label={placeholder} placeholder={placeholder} rows={rows} />
  )

  const Select = ({
    placeholder,
    allowClear,
    options = [],
    onChange,
  }: {
    placeholder?: string
    allowClear?: boolean
    options?: SelectOption[]
    onChange?: (value: string | undefined) => void
  }) => (
    <div
      data-testid={`select-${placeholder ?? options.map((option) => option.value).join('-')}`}
      data-allow-clear={String(Boolean(allowClear))}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
      <button type="button" onClick={() => onChange?.(undefined)}>
        clear
      </button>
    </div>
  )

  return {
    Form,
    Input,
    Select,
    Typography: {
      Text: ({
        children,
        type,
        className,
      }: {
        children: React.ReactNode
        type?: string
        className?: string
      }) => (
        <span data-type={type} className={className}>
          {children}
        </span>
      ),
    },
  }
})

vi.mock('@/api/client', () => ({
  http: { get: (...args: unknown[]) => mockHttpGet(...args) },
}))

vi.mock('@/constants/module-options', () => ({
  roleDataScopeValues: ['全部数据', '本部门', '本人'],
  roleTypeValues: ['系统', '自定义'],
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    roleTemplates: ['roleTemplates'],
  },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (...args: unknown[]) => mockAsString(...args),
}))

import { RoleActionEditorModal } from '@/views/system/RoleActionEditorModal'

const formInstance = {
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  setFieldsValue: vi.fn(),
  setFieldValue: vi.fn(),
  resetFields: vi.fn(),
  validateFields: vi.fn(),
}

function renderModal(
  props?: Partial<Parameters<typeof RoleActionEditorModal>[0]>,
) {
  return render(
    <RoleActionEditorModal
      open={true}
      editingRole={null}
      form={formInstance as never}
      saving={false}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  )
}

describe('RoleActionEditorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })
  })

  it('关闭时不渲染内容但仍以 disabled 查询模板', () => {
    renderModal({ open: false })

    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
    expect(latestQueryOptions()).toMatchObject({
      queryKey: ['roleTemplates'],
      enabled: false,
      staleTime: 600000,
    })
  })

  it('创建模式渲染标题、表单字段、保存/取消文案并透传 loading', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    renderModal({ saving: true, onSave, onClose })

    expect(screen.getByTestId('form-modal')).toHaveAttribute(
      'data-confirm-loading',
      'true',
    )
    expect(
      screen.getByText('system.roleEditor.createTitle'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('role-form')).toHaveAttribute(
      'data-layout',
      'vertical',
    )
    expect(screen.getByTestId('role-form')).toHaveAttribute(
      'data-has-form',
      'true',
    )
    expect(screen.getByTestId('required-roleName')).toBeInTheDocument()
    expect(screen.getByTestId('required-roleCode')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('system.roleEditor.roleNamePlaceholder'),
    ).toHaveAttribute('maxLength', '64')
    expect(
      screen.getByPlaceholderText('system.roleEditor.roleCodePlaceholder'),
    ).not.toBeDisabled()
    expect(
      screen.getByPlaceholderText('system.roleEditor.remarkPlaceholder'),
    ).toHaveAttribute('rows', '3')

    fireEvent.click(screen.getByText('system.roleEditor.save'))
    fireEvent.click(screen.getByText('system.roleEditor.cancel'))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(latestQueryOptions()).toMatchObject({ enabled: true })
  })

  it('编辑模式渲染编辑标题、禁用角色编码且不展示模板', () => {
    renderModal({
      editingRole: {
        id: '1',
        roleName: '管理员',
        roleCode: 'admin',
        roleType: '系统',
        dataScope: '全部数据',
        status: 'enabled',
        userCount: 1,
        remark: null,
      },
    })

    expect(screen.getByText('system.roleEditor.editTitle')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('system.roleEditor.roleCodePlaceholder'),
    ).toBeDisabled()
    expect(
      screen.queryByText('system.roleEditor.permTemplate'),
    ).not.toBeInTheDocument()
    expect(latestQueryOptions()).toMatchObject({ enabled: false })
  })

  it('有模板时展示模板 Select、提示文案，并在选择模板时回调', () => {
    const onApplyTemplate = vi.fn()
    mockUseQuery.mockReturnValue({
      data: [{ name: '财务', description: '财务权限模板' }],
      isLoading: false,
    })

    renderModal({ onApplyTemplate })

    expect(
      screen.getByText('system.roleEditor.permTemplate'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.roleEditor.templateHint'),
    ).toBeInTheDocument()
    const templateSelect = screen.getByTestId(
      'select-system.roleEditor.templatePlaceholder',
    )
    expect(templateSelect).toHaveAttribute('data-allow-clear', 'true')

    fireEvent.click(within(templateSelect).getByText('财务 — 财务权限模板'))

    expect(mockAsString).toHaveBeenCalledWith('财务')
    expect(onApplyTemplate).toHaveBeenCalledWith('财务')
  })

  it('模板为空、清空选择或缺少回调时不会应用模板', () => {
    const onApplyTemplate = vi.fn()
    mockUseQuery.mockReturnValue({
      data: [{ name: '运营', description: '运营权限模板' }],
      isLoading: false,
    })

    const { rerender } = render(
      <RoleActionEditorModal
        open={true}
        editingRole={null}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onApplyTemplate={onApplyTemplate}
      />,
    )

    fireEvent.click(screen.getAllByText('clear')[0])
    expect(onApplyTemplate).not.toHaveBeenCalled()

    rerender(
      <RoleActionEditorModal
        open={true}
        editingRole={null}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('运营 — 运营权限模板'))
    expect(onApplyTemplate).not.toHaveBeenCalled()
  })

  it('查询函数兼容数组响应、data 响应和空 data 响应', async () => {
    renderModal()
    const queryFn = latestQueryOptions().queryFn
    mockHttpGet.mockResolvedValueOnce([{ name: '系统', description: '默认' }])
    await expect(queryFn()).resolves.toEqual([
      { name: '系统', description: '默认' },
    ])
    expect(mockHttpGet).toHaveBeenCalledWith('/role-settings/templates')

    mockHttpGet.mockResolvedValueOnce({
      data: [{ name: '业务', description: '业务权限' }],
    })
    await expect(queryFn()).resolves.toEqual([
      { name: '业务', description: '业务权限' },
    ])

    mockHttpGet.mockResolvedValueOnce({})
    await expect(queryFn()).resolves.toEqual([])
  })
})
