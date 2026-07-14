import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd', () => ({
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
  Input: {
    Search: ({
      'aria-label': ariaLabel,
      placeholder,
      value,
      onChange,
      onSearch,
    }: {
      'aria-label'?: string
      placeholder?: string
      value?: string
      onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
      onSearch?: () => void
    }) => (
      <input
        aria-label={ariaLabel}
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSearch?.()
        }}
      />
    ),
  },
  Select: ({
    'aria-label': ariaLabel,
    options = [],
    placeholder,
    showSearch,
    value,
    onChange,
  }: {
    'aria-label'?: string
    options?: Array<{ label: string; value: string }>
    placeholder?: string
    showSearch?: {
      filterOption?: (
        input: string,
        option?: { label?: string; value?: string },
      ) => boolean
    }
    value?: string
    onChange?: (value?: string) => void
  }) => (
    <div>
      <select
        aria-label={ariaLabel}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.currentTarget.value || undefined)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showSearch?.filterOption ? (
        <>
          <span data-testid={`${placeholder}-filter-match`}>
            {String(showSearch.filterOption('adm', options[0]))}
          </span>
          <span data-testid={`${placeholder}-filter-missing-label`}>
            {String(showSearch.filterOption('adm', {}))}
          </span>
        </>
      ) : null}
    </div>
  ),
}))

import { ApiKeyListToolbar } from '@/views/system/ApiKeyListToolbar'

describe('ApiKeyListToolbar', () => {
  const defaultProps = {
    keyword: '',
    filterUserId: undefined,
    statusFilter: undefined,
    usageScopeFilter: undefined,
    canCreate: true,
    totpDisabled: false,
    userOptions: [{ id: '1', userName: 'Admin', loginName: 'admin' }],
    onKeywordChange: vi.fn(),
    onSearch: vi.fn(),
    onFilterUserChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onUsageScopeFilterChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(ApiKeyListToolbar).toBeDefined()
    expect(typeof ApiKeyListToolbar).toBe('function')
  })

  it('renders search input', () => {
    render(<ApiKeyListToolbar {...defaultProps} />)
    expect(
      screen.getByPlaceholderText('system.apiKey.searchPlaceholder'),
    ).toBeInTheDocument()
  })

  it('gives search and filter controls persistent accessible names', () => {
    render(<ApiKeyListToolbar {...defaultProps} />)

    expect(
      screen.getByRole('searchbox', {
        name: 'system.apiKey.searchPlaceholder',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', {
        name: 'system.apiKey.filterUserPlaceholder',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'system.apiKey.allStatus' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'system.apiKey.allScope' }),
    ).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<ApiKeyListToolbar {...defaultProps} />)
    expect(screen.getByText('common.refresh')).toBeInTheDocument()
  })

  it('renders create button when canCreate is true', () => {
    render(<ApiKeyListToolbar {...defaultProps} canCreate={true} />)
    expect(screen.getByText('system.apiKey.generateButton')).toBeInTheDocument()
  })

  it('does not render create button when canCreate is false', () => {
    render(<ApiKeyListToolbar {...defaultProps} canCreate={false} />)
    expect(
      screen.queryByText('system.apiKey.generateButton'),
    ).not.toBeInTheDocument()
  })

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn()
    render(<ApiKeyListToolbar {...defaultProps} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByText('common.refresh'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls onCreate when create button clicked', () => {
    const onCreate = vi.fn()
    render(<ApiKeyListToolbar {...defaultProps} onCreate={onCreate} />)
    fireEvent.click(screen.getByText('system.apiKey.generateButton'))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('disables create button when totpDisabled is true', () => {
    render(<ApiKeyListToolbar {...defaultProps} totpDisabled={true} />)
    const button = screen.getByText('system.apiKey.generateButton')
    expect(button.closest('button')).toBeDisabled()
  })

  it('filters and changes select values', () => {
    const onFilterUserChange = vi.fn()
    const onStatusFilterChange = vi.fn()
    const onUsageScopeFilterChange = vi.fn()

    render(
      <ApiKeyListToolbar
        {...defaultProps}
        onFilterUserChange={onFilterUserChange}
        onStatusFilterChange={onStatusFilterChange}
        onUsageScopeFilterChange={onUsageScopeFilterChange}
      />,
    )

    expect(
      screen.getByTestId('system.apiKey.filterUserPlaceholder-filter-match'),
    ).toHaveTextContent('true')
    expect(
      screen.getByTestId(
        'system.apiKey.filterUserPlaceholder-filter-missing-label',
      ),
    ).toHaveTextContent('false')

    fireEvent.change(
      screen.getByLabelText('system.apiKey.filterUserPlaceholder'),
      { target: { value: '1' } },
    )
    fireEvent.change(screen.getByLabelText('system.apiKey.allStatus'), {
      target: { value: '有效' },
    })
    fireEvent.change(screen.getByLabelText('system.apiKey.allScope'), {
      target: { value: '全部接口' },
    })

    expect(onFilterUserChange).toHaveBeenCalledWith('1')
    expect(onStatusFilterChange).toHaveBeenCalledWith('有效')
    expect(onUsageScopeFilterChange).toHaveBeenCalledWith('全部接口')
  })

  it('falls back to empty user option value when id is missing', () => {
    render(
      <ApiKeyListToolbar
        {...defaultProps}
        userOptions={[{ id: undefined, userName: 'No Id', loginName: 'no-id' }]}
      />,
    )

    expect(
      screen.getByLabelText('system.apiKey.filterUserPlaceholder'),
    ).toHaveTextContent('No Id')
  })
})
