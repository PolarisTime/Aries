import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()

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

  return {
    Form,
    Input,
    Select: () => <div>Select</div>,
    Typography: {
      Text: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    },
  }
})

vi.mock('@/api/client', () => ({
  http: { get: vi.fn() },
}))

vi.mock('@/constants/module-options', () => ({
  roleDataScopeValues: ['全部数据', '本部门', '本人'],
  roleTypeValues: ['系统', '自定义'],
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

import { RoleActionEditorModal } from '@/views/system/RoleActionEditorModal'

describe('RoleActionEditorModal', () => {
  const formInstance = {
    getFieldValue: vi.fn(),
    getFieldsValue: vi.fn(() => ({})),
    setFieldsValue: vi.fn(),
    setFieldValue: vi.fn(),
    resetFields: vi.fn(),
    validateFields: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })
  })

  it('renders without crashing', () => {
    expect(RoleActionEditorModal).toBeDefined()
    expect(typeof RoleActionEditorModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(
      <RoleActionEditorModal
        open={true}
        editingRole={null}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('renders create title when no editing role', () => {
    render(
      <RoleActionEditorModal
        open={true}
        editingRole={null}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(
      screen.getByText('system.roleEditor.createTitle'),
    ).toBeInTheDocument()
  })

  it('renders edit title when editing role', () => {
    render(
      <RoleActionEditorModal
        open={true}
        editingRole={{ id: '1', roleName: 'Admin', roleCode: 'admin' } as never}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('system.roleEditor.editTitle')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <RoleActionEditorModal
        open={false}
        editingRole={null}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(
      <RoleActionEditorModal
        open={true}
        editingRole={null}
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('system.roleEditor.roleName')).toBeInTheDocument()
    expect(screen.getByText('system.roleEditor.roleCode')).toBeInTheDocument()
    expect(screen.getByText('system.roleEditor.roleType')).toBeInTheDocument()
    expect(screen.getByText('system.roleEditor.dataScope')).toBeInTheDocument()
    expect(screen.getByText('system.roleEditor.remark')).toBeInTheDocument()
  })
})
