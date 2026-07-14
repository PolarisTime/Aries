import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const formListState = vi.hoisted(() => ({
  add: vi.fn(),
  fields: [] as Array<{ key: string; name: number }>,
  remove: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd', () => {
  const Form = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )
  Form.List = ({
    children,
  }: {
    children: (
      fields: Array<{ key: string; name: number }>,
      operations: {
        add: typeof formListState.add
        remove: typeof formListState.remove
      },
    ) => React.ReactNode
  }) => (
    <div>
      {children(formListState.fields, {
        add: formListState.add,
        remove: formListState.remove,
      })}
    </div>
  )
  Form.Item = ({
    children,
    hidden,
    label,
  }: {
    children?: React.ReactNode
    hidden?: boolean
    label?: React.ReactNode
  }) => (
    <div hidden={hidden}>
      {label ? <span>{label}</span> : null}
      {children}
    </div>
  )

  return {
    Button: ({
      children,
      disabled,
      onClick,
    }: {
      children?: React.ReactNode
      disabled?: boolean
      onClick?: () => void
    }) => (
      <button disabled={disabled} type="button" onClick={onClick}>
        {children}
      </button>
    ),
    Card: ({
      children,
      title,
    }: {
      children?: React.ReactNode
      title?: React.ReactNode
    }) => (
      <section>
        {title}
        {children}
      </section>
    ),
    Col: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Empty: ({
      children,
      description,
    }: {
      children?: React.ReactNode
      description?: React.ReactNode
    }) => (
      <div>
        {description}
        {children}
      </div>
    ),
    Form,
    Input: ({
      disabled,
      placeholder,
    }: {
      disabled?: boolean
      placeholder?: string
    }) => <input disabled={disabled} placeholder={placeholder} />,
    Row: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Select: ({
      disabled,
      options = [],
    }: {
      disabled?: boolean
      options?: Array<{ label: string; value: string }>
    }) => (
      <select disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Typography: {
      Text: ({ children }: { children?: React.ReactNode }) => (
        <span>{children}</span>
      ),
    },
  }
})

vi.mock('@/views/system/company-settings-view-utils', () => ({
  createEmptySettlementAccount: () => ({
    accountName: '',
    bankName: '',
    bankAccount: '',
    usageType: '通用',
    status: '正常',
    remark: '',
  }),
}))

import { CompanySettlementAccountsCard } from '@/views/system/CompanySettlementAccountsCard'

describe('CompanySettlementAccountsCard', () => {
  beforeEach(() => {
    formListState.add.mockClear()
    formListState.remove.mockClear()
    formListState.fields = []
  })

  it('renders without crashing', () => {
    expect(CompanySettlementAccountsCard).toBeDefined()
    expect(typeof CompanySettlementAccountsCard).toBe('function')
  })

  it('renders the settlement info title', () => {
    render(<CompanySettlementAccountsCard canSave={true} />)
    expect(
      screen.getByText('system.company.settlementInfo'),
    ).toBeInTheDocument()
  })

  it('is a function component', () => {
    expect(typeof CompanySettlementAccountsCard).toBe('function')
  })

  it('adds an account from the header and empty state', () => {
    render(<CompanySettlementAccountsCard canSave={true} />)

    expect(
      screen.getByText('system.company.noSettlementAccounts'),
    ).toBeInTheDocument()
    screen.getAllByText('system.company.addBank').forEach((button) => {
      fireEvent.click(button)
    })

    expect(formListState.add).toHaveBeenCalledTimes(2)
    expect(formListState.add).toHaveBeenCalledWith(
      expect.objectContaining({ status: '正常', usageType: '通用' }),
    )
  })

  it('hides add actions when saving is not allowed', () => {
    render(<CompanySettlementAccountsCard canSave={false} />)

    expect(screen.queryByText('system.company.addBank')).not.toBeInTheDocument()
  })

  it('renders account fields and removes an existing account', () => {
    formListState.fields = [{ key: 'row-1', name: 0 }]

    render(<CompanySettlementAccountsCard canSave={true} />)

    expect(
      screen.getByText((_content, node) =>
        Boolean(
          node?.tagName === 'SPAN' &&
            node.textContent === 'system.company.settlementAccount 1',
        ),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('system.company.accountName')).toBeInTheDocument()
    expect(screen.getByText('system.company.usageType')).toBeInTheDocument()
    expect(screen.getByText('common.status')).toBeInTheDocument()
    fireEvent.click(screen.getByText('common.delete'))

    expect(formListState.remove).toHaveBeenCalledWith(0)
  })

  it('disables fields and hides delete when saving is not allowed', () => {
    formListState.fields = [{ key: 'row-1', name: 0 }]

    render(<CompanySettlementAccountsCard canSave={false} />)

    expect(screen.queryByText('common.delete')).not.toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('system.company.accountNamePlaceholder'),
    ).toBeDisabled()
  })
})
