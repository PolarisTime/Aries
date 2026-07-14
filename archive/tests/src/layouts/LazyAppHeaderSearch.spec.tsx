import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LazyAppHeaderSearch } from '@/layouts/LazyAppHeaderSearch'

vi.mock('@/layouts/AppHeaderSearch', () => ({
  AppHeaderSearch: (props: any) => (
    <div data-testid="mock-search" className={props.className}>
      keyword:{props.keyword}
    </div>
  ),
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

describe('LazyAppHeaderSearch', () => {
  it('renders the search component', async () => {
    render(<LazyAppHeaderSearch {...defaultProps} />)
    expect(await screen.findByTestId('mock-search')).toBeDefined()
  })

  it('passes keyword to the search component', async () => {
    render(<LazyAppHeaderSearch {...defaultProps} keyword="test" />)
    expect(await screen.findByText('keyword:test')).toBeDefined()
  })

  it('passes className to the component', async () => {
    render(<LazyAppHeaderSearch {...defaultProps} className="custom-class" />)
    const element = await screen.findByTestId('mock-search')
    expect(element.className).toBe('custom-class')
  })
})
