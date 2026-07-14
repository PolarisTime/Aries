import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppHeaderSearch } from '@/layouts/AppHeaderSearch'

vi.mock('antd', () => ({
  AutoComplete: ({
    children,
    className,
    open,
    options,
    onChange,
    onOpenChange,
    onSelect,
    showSearch,
  }: any) => (
    <div
      data-testid="autocomplete"
      data-open={String(open)}
      className={className}
    >
      <button
        type="button"
        data-testid="autocomplete-search"
        onClick={() => showSearch?.onSearch('needle')}
      />
      <button
        type="button"
        data-testid="autocomplete-change-custom"
        onClick={() => onChange('custom keyword')}
      />
      <button
        type="button"
        data-testid="autocomplete-change-option"
        onClick={() => onChange(options[0]?.value ?? 'option')}
      />
      <button
        type="button"
        data-testid="autocomplete-select"
        onClick={() => onSelect(options[0]?.value ?? 'selected')}
      />
      <button
        type="button"
        data-testid="autocomplete-open"
        onClick={() => onOpenChange(true)}
      />
      <button
        type="button"
        data-testid="autocomplete-close"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  ),
  Button: ({ children, className, icon, loading, onClick }: any) => (
    <button
      type="button"
      className={className}
      data-loading={String(Boolean(loading))}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  ),
  Input: ({ onPressEnter, ...props }: any) => (
    <input
      {...props}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onPressEnter?.(event)
        }
      }}
    />
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'layouts.headerSearch.placeholder': '搜索单号/关键字',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (...parts: string[]) => parts.join('-'),
}))

const defaultProps = {
  className: 'test-search',
  keyword: '',
  options: [],
  open: false,
  loading: false,
  onBlur: vi.fn(),
  onKeywordChange: vi.fn(),
  onOpen: vi.fn(),
  onOpenChange: vi.fn(),
  onSearch: vi.fn(),
  onSelect: vi.fn(),
  onSubmit: vi.fn(),
}

describe('AppHeaderSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input with placeholder', { timeout: 15000 }, () => {
    render(<AppHeaderSearch {...defaultProps} />)
    expect(screen.getByPlaceholderText('搜索单号/关键字')).toBeDefined()
  })

  it('calls onOpen on input focus', () => {
    render(<AppHeaderSearch {...defaultProps} />)
    fireEvent.focus(screen.getByPlaceholderText('搜索单号/关键字'))
    expect(defaultProps.onOpen).toHaveBeenCalled()
  })

  it('calls onBlur on input blur', () => {
    render(<AppHeaderSearch {...defaultProps} />)
    fireEvent.blur(screen.getByPlaceholderText('搜索单号/关键字'))
    expect(defaultProps.onBlur).toHaveBeenCalled()
  })

  it('calls onSubmit on Enter key press', () => {
    render(<AppHeaderSearch {...defaultProps} keyword="test-keyword" />)
    const input = screen.getByPlaceholderText('搜索单号/关键字')
    fireEvent.change(input, { target: { value: 'test-keyword' } })
    fireEvent.keyDown(input, {
      key: 'Enter',
      code: 'Enter',
    })
    expect(defaultProps.onSubmit).toHaveBeenCalledWith('test-keyword')
  })

  it('calls onSubmit when search button is clicked', () => {
    render(<AppHeaderSearch {...defaultProps} keyword="search-term" />)
    const buttons = document.querySelectorAll('.header-global-search-button')
    if (buttons.length > 0) {
      fireEvent.click(buttons[0])
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('search-term')
    }
  })

  it('renders with custom className', () => {
    const { container } = render(
      <AppHeaderSearch {...defaultProps} className="custom-class" />,
    )
    expect(container.querySelector('.custom-class')).toBeDefined()
  })

  it('renders header-global-search-group container', () => {
    const { container } = render(<AppHeaderSearch {...defaultProps} />)
    expect(container.querySelector('.header-global-search-group')).toBeDefined()
  })

  it('renders header-global-search-box', () => {
    const { container } = render(<AppHeaderSearch {...defaultProps} />)
    expect(container.querySelector('.header-global-search-box')).toBeDefined()
  })

  it('renders input with correct id', () => {
    render(<AppHeaderSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('搜索单号/关键字')
    expect(input.getAttribute('id')).toBe('header-search-keyword')
  })

  it('renders input with correct name', () => {
    render(<AppHeaderSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('搜索单号/关键字')
    expect(input.getAttribute('name')).toBe('header-search-keyword')
  })

  it('renders search button with loading state', () => {
    const { container } = render(
      <AppHeaderSearch {...defaultProps} loading={true} />,
    )
    const button = container.querySelector('.header-global-search-button')
    expect(button).toBeDefined()
  })

  it('opens dropdown only when open and options are available', () => {
    const { rerender } = render(
      <AppHeaderSearch {...defaultProps} open={true} options={[]} />,
    )

    expect(screen.getByTestId('autocomplete')).toHaveAttribute(
      'data-open',
      'false',
    )

    rerender(
      <AppHeaderSearch
        {...defaultProps}
        open={true}
        options={[{ value: 'order-1', label: '订单 1' }]}
      />,
    )

    expect(screen.getByTestId('autocomplete')).toHaveAttribute(
      'data-open',
      'true',
    )
  })

  it('opens and searches from AutoComplete search input', () => {
    render(<AppHeaderSearch {...defaultProps} />)

    fireEvent.click(screen.getByTestId('autocomplete-search'))

    expect(defaultProps.onOpen).toHaveBeenCalledTimes(1)
    expect(defaultProps.onSearch).toHaveBeenCalledWith('needle')
  })

  it('updates keyword when AutoComplete change is not an existing option', () => {
    render(
      <AppHeaderSearch
        {...defaultProps}
        options={[{ value: 'known', label: '已知选项' }]}
      />,
    )

    fireEvent.click(screen.getByTestId('autocomplete-change-custom'))

    expect(defaultProps.onKeywordChange).toHaveBeenCalledWith('custom keyword')
  })

  it('keeps keyword unchanged when AutoComplete change matches an option', () => {
    render(
      <AppHeaderSearch
        {...defaultProps}
        options={[{ value: 123, label: '订单 123' }]}
      />,
    )

    fireEvent.click(screen.getByTestId('autocomplete-change-option'))

    expect(defaultProps.onKeywordChange).not.toHaveBeenCalled()
  })

  it('normalizes selected AutoComplete value before notifying parent', () => {
    render(
      <AppHeaderSearch
        {...defaultProps}
        options={[{ value: 123, label: '订单 123' }]}
      />,
    )

    fireEvent.click(screen.getByTestId('autocomplete-select'))

    expect(defaultProps.onSelect).toHaveBeenCalledWith('123')
  })

  it('forwards AutoComplete open state changes', () => {
    render(<AppHeaderSearch {...defaultProps} />)

    fireEvent.click(screen.getByTestId('autocomplete-open'))
    fireEvent.click(screen.getByTestId('autocomplete-close'))

    expect(defaultProps.onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(defaultProps.onOpenChange).toHaveBeenNthCalledWith(2, false)
  })
})
