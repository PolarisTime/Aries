import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAssertApiSuccess,
  mockCan,
  mockHttpGet,
  mockHttpPut,
  mockInvalidateQueries,
  mockSetFieldsValue,
  mockUseQuery,
  mockValidateFields,
} = vi.hoisted(() => ({
  mockAssertApiSuccess: vi.fn(),
  mockCan: vi.fn(),
  mockHttpGet: vi.fn(),
  mockHttpPut: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockSetFieldsValue: vi.fn(),
  mockUseQuery: vi.fn(),
  mockValidateFields: vi.fn(),
}))

let latestUseQueryOptions: { queryFn: () => Promise<unknown> } | null = null

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const create = React.createElement

  const Form = ({ children }: { children?: ReactNode }) =>
    create('form', null, children)
  Form.useForm = () => [
    {
      setFieldsValue: mockSetFieldsValue,
      validateFields: mockValidateFields,
    },
  ]
  Form.Item = ({
    children,
    label,
  }: {
    children?: ReactNode
    label?: ReactNode
  }) => create('label', null, create('span', null, label), children)

  return {
    Button: ({
      children,
      loading,
      onClick,
    }: {
      children?: ReactNode
      loading?: boolean
      onClick?: () => void
    }) =>
      create(
        'button',
        { 'data-loading': loading ? 'true' : 'false', onClick },
        children,
      ),
    Card: ({
      children,
      className,
      extra,
      title,
    }: {
      children?: ReactNode
      className?: string
      extra?: ReactNode
      title?: ReactNode
    }) =>
      create(
        'section',
        { className },
        create('h2', null, title),
        create('div', null, extra),
        children,
      ),
    Form,
    InputNumber: () => create('input', { type: 'number' }),
    Modal: ({
      cancelText,
      children,
      confirmLoading,
      okText,
      onCancel,
      onOk,
      open,
      title,
    }: {
      cancelText?: ReactNode
      children?: ReactNode
      confirmLoading?: boolean
      okText?: ReactNode
      onCancel?: () => void
      onOk?: () => void
      open?: boolean
      title?: ReactNode
    }) =>
      open
        ? create(
            'div',
            { 'aria-label': String(title), role: 'dialog' },
            create('h3', null, title),
            children,
            create(
              'button',
              {
                'data-loading': confirmLoading ? 'true' : 'false',
                onClick: onOk,
              },
              okText,
            ),
            create('button', { onClick: onCancel }, cancelText),
          )
        : null,
    Select: ({
      options = [],
      placeholder,
      value,
      onChange,
    }: {
      options?: Array<{ label: ReactNode; value: string }>
      placeholder?: string
      value?: string
      onChange?: (value: string | undefined) => void
    }) =>
      create(
        'select',
        {
          'aria-label': placeholder,
          value: value ?? '',
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onChange?.(event.currentTarget.value || undefined),
        },
        create('option', { value: '' }, placeholder),
        ...options.map((option) =>
          create(
            'option',
            { key: option.value, value: option.value },
            option.label,
          ),
        ),
      ),
    Space: ({ children }: { children?: ReactNode }) =>
      create('div', null, children),
    Switch: () => create('input', { type: 'checkbox' }),
    Table: ({
      columns = [],
      dataSource = [],
    }: {
      columns?: Array<{
        dataIndex?: string
        render?: (value: unknown, record: Record<string, unknown>) => ReactNode
        title?: ReactNode
      }>
      dataSource?: Array<Record<string, unknown>>
    }) =>
      create(
        'table',
        { className: 'ant-table' },
        create(
          'thead',
          null,
          create(
            'tr',
            null,
            ...columns.map((column, index) =>
              create(
                'th',
                { key: `${String(column.title)}-${index}` },
                column.title,
              ),
            ),
          ),
        ),
        create(
          'tbody',
          null,
          ...dataSource.map((record) =>
            create(
              'tr',
              { key: String(record.id) },
              ...columns.map((column, index) => {
                const value = column.dataIndex
                  ? record[column.dataIndex]
                  : undefined
                return create(
                  'td',
                  { key: `${String(record.id)}-${index}` },
                  column.render
                    ? column.render(value, record)
                    : String(value ?? ''),
                )
              }),
            ),
          ),
        ),
      ),
    Typography: {
      Text: ({ children }: { children?: ReactNode }) =>
        create('span', null, children),
    },
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: (
    selector?: (state: Record<string, unknown>) => unknown,
  ) => {
    const state = { can: mockCan }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: (...args: unknown[]) => mockAssertApiSuccess(...args),
  http: { get: mockHttpGet, put: mockHttpPut },
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({
    status,
    statusMap,
  }: {
    status: string
    statusMap: Record<string, { label: string }>
  }) => <span>{statusMap[status]?.label ?? status}</span>,
}))

vi.mock('@/components/TableActions', () => ({
  TableActions: ({
    items,
  }: {
    items: Array<{ key: string; label: string; onClick: () => void }>
  }) => (
    <div>
      {items.map((item) => (
        <button key={item.key} type="button" onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

import { RateLimitRulesCard } from '@/views/system/RateLimitRulesCard'

describe('RateLimitRulesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    latestUseQueryOptions = null
    mockCan.mockReturnValue(true)
    mockValidateFields.mockResolvedValue({
      capacity: 100,
      enabled: true,
      rate: 10,
      tokensPerRequest: 1,
    })
    mockUseQuery.mockImplementation((options) => {
      latestUseQueryOptions = options
      return {
        data: [],
        isFetching: false,
        refetch: vi.fn(),
      }
    })
  })

  it('renders without crashing', () => {
    expect(RateLimitRulesCard).toBeDefined()
    expect(typeof RateLimitRulesCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<RateLimitRulesCard />)
    expect(screen.getByText('system.rateLimit.title')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<RateLimitRulesCard />)
    expect(screen.getByText('system.rateLimit.refresh')).toBeInTheDocument()
  })

  it('renders empty text when no rules', () => {
    render(<RateLimitRulesCard />)
    expect(screen.getByText('system.rateLimit.noRules')).toBeInTheDocument()
  })

  it('renders table when rules exist', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          ruleKey: 'GLOBAL:default',
          ruleType: 'GLOBAL',
          rate: 10.0,
          capacity: 100,
          tokensPerRequest: 1,
          priority: 0,
          enabled: true,
        },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })
    const { container } = render(<RateLimitRulesCard />)
    expect(container.querySelector('.ant-table')).toBeInTheDocument()
  })

  it('returns null when user has no read permission', () => {
    mockCan.mockReturnValue(false)
    const { container } = render(<RateLimitRulesCard />)
    expect(container.innerHTML).toBe('')
  })

  it('maps backend rate limit rules from query function', async () => {
    mockHttpGet.mockResolvedValue({
      code: 0,
      data: [
        {
          id: '1',
          rule_key: 'GLOBAL:default',
          rule_type: 'GLOBAL',
          rate: 10,
          capacity: 100,
          tokens_per_request: 1,
          priority: 0,
          enabled: true,
        },
      ],
    })
    render(<RateLimitRulesCard />)

    await expect(latestUseQueryOptions!.queryFn()).resolves.toEqual([
      {
        id: '1',
        ruleKey: 'GLOBAL:default',
        ruleType: 'GLOBAL',
        rate: 10,
        capacity: 100,
        tokensPerRequest: 1,
        priority: 0,
        enabled: true,
      },
    ])
    expect(mockHttpGet).toHaveBeenCalledWith('/admin/rate-limit/rules')
    expect(mockAssertApiSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ code: 0 }),
      'system.rateLimit.loadFailed',
    )
  })

  it('maps missing backend data to an empty rule list', async () => {
    mockHttpGet.mockResolvedValue({ code: 0, data: undefined })
    render(<RateLimitRulesCard />)

    await expect(latestUseQueryOptions!.queryFn()).resolves.toEqual([])
  })

  it('refreshes rules from the toolbar button', () => {
    const refetch = vi.fn()
    mockUseQuery.mockReturnValue({
      data: [],
      isFetching: true,
      refetch,
    })

    render(<RateLimitRulesCard />)
    fireEvent.click(screen.getByText('system.rateLimit.refresh'))

    expect(refetch).toHaveBeenCalled()
    expect(screen.getByText('system.rateLimit.refresh')).toHaveAttribute(
      'data-loading',
      'true',
    )
  })

  it('filters rules by selected type', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          ruleKey: 'GLOBAL:default',
          ruleType: 'GLOBAL',
          rate: 10,
          capacity: 100,
          tokensPerRequest: 1,
          priority: 0,
          enabled: true,
        },
        {
          id: '2',
          ruleKey: 'METHOD:/api',
          ruleType: 'METHOD',
          rate: 20,
          capacity: 200,
          tokensPerRequest: 2,
          priority: 1,
          enabled: true,
        },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })

    render(<RateLimitRulesCard />)
    fireEvent.change(screen.getByLabelText('system.rateLimit.allTypes'), {
      target: { value: 'METHOD' },
    })

    expect(screen.queryByText('GLOBAL:default')).not.toBeInTheDocument()
    expect(screen.getByText('METHOD:/api')).toBeInTheDocument()
  })

  it('renders fallback labels for custom disabled rule types', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'custom',
          ruleKey: 'CUSTOM:rule',
          ruleType: 'CUSTOM',
          rate: 3,
          capacity: 30,
          tokensPerRequest: 3,
          priority: 9,
          enabled: false,
        },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })

    render(<RateLimitRulesCard />)

    expect(screen.getByText('CUSTOM')).toBeInTheDocument()
    expect(screen.getByText('system.rateLimit.statusOff')).toBeInTheDocument()
    expect(screen.getByText('3.00')).toBeInTheDocument()
  })

  it('opens editor and saves changed rule values', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          ruleKey: 'GLOBAL:default',
          ruleType: 'GLOBAL',
          rate: 10,
          capacity: 100,
          tokensPerRequest: 1,
          priority: 0,
          enabled: true,
        },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })
    mockValidateFields.mockResolvedValue({
      capacity: 120,
      enabled: false,
      rate: 12.5,
      tokensPerRequest: 2,
    })
    mockHttpPut.mockResolvedValue({ code: 0 })

    render(<RateLimitRulesCard />)
    fireEvent.click(screen.getByText('common.edit'))
    expect(mockSetFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    )
    fireEvent.click(screen.getByText('system.rateLimit.save'))

    await waitFor(() => {
      expect(mockHttpPut).toHaveBeenCalledWith('/admin/rate-limit/rules/1', {
        rate: 12.5,
        capacity: 120,
        tokens_per_request: 2,
        enabled: false,
      })
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rate-limit-rules'],
    })
  })

  it('keeps editor open when saving fails', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          ruleKey: 'GLOBAL:default',
          ruleType: 'GLOBAL',
          rate: 10,
          capacity: 100,
          tokensPerRequest: 1,
          priority: 0,
          enabled: true,
        },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })
    mockHttpPut.mockRejectedValue(new Error('save failed'))

    render(<RateLimitRulesCard />)
    fireEvent.click(screen.getByText('common.edit'))
    fireEvent.click(screen.getByText('system.rateLimit.save'))

    await waitFor(() => {
      expect(mockHttpPut).toHaveBeenCalled()
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mockInvalidateQueries).not.toHaveBeenCalled()
  })

  it('closes editor when cancel is clicked', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          ruleKey: 'GLOBAL:default',
          ruleType: 'GLOBAL',
          rate: 10,
          capacity: 100,
          tokensPerRequest: 1,
          priority: 0,
          enabled: true,
        },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })

    render(<RateLimitRulesCard />)
    fireEvent.click(screen.getByText('common.edit'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByText('system.rateLimit.cancel'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
