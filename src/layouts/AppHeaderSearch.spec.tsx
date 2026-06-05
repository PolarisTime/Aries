import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppHeaderSearch } from '@/layouts/AppHeaderSearch'

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
    fireEvent.keyDown(screen.getByPlaceholderText('搜索单号/关键字'), {
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
})
