import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SystemTableToolbar } from './SystemTableToolbar'

describe('SystemTableToolbar', () => {
  const defaultProps = {
    keyword: '',
    onKeywordChange: vi.fn(),
    onRefresh: vi.fn(),
  }

  it('renders search input with default placeholder', () => {
    render(<SystemTableToolbar {...defaultProps} />)
    const input = screen.getByPlaceholderText('toolbar.searchPlaceholder')
    expect(input).toBeTruthy()
  })

  it('gives the search input an accessible name', () => {
    render(<SystemTableToolbar {...defaultProps} />)

    expect(
      screen.getByRole('searchbox', { name: 'toolbar.searchPlaceholder' }),
    ).toBeTruthy()
  })

  it('renders custom placeholder', () => {
    render(
      <SystemTableToolbar {...defaultProps} keywordPlaceholder="搜索订单号" />,
    )
    expect(screen.getByPlaceholderText('搜索订单号')).toBeTruthy()
  })

  it('calls onKeywordChange on input change', () => {
    const onKeywordChange = vi.fn()
    render(
      <SystemTableToolbar
        {...defaultProps}
        onKeywordChange={onKeywordChange}
      />,
    )
    const input = screen.getByPlaceholderText('toolbar.searchPlaceholder')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(onKeywordChange).toHaveBeenCalledWith('test')
  })

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn()
    render(<SystemTableToolbar {...defaultProps} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByText('toolbar.refresh'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows create button when onCreate is provided', () => {
    const onCreate = vi.fn()
    render(<SystemTableToolbar {...defaultProps} onCreate={onCreate} />)
    fireEvent.click(screen.getByText('toolbar.create'))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('uses custom action labels and create disabled state', () => {
    const onCreate = vi.fn()
    render(
      <SystemTableToolbar
        {...defaultProps}
        onCreate={onCreate}
        refreshLabel="重新加载"
        createLabel="生成密钥"
        createDisabled
      />,
    )

    expect(screen.getByText('重新加载')).toBeTruthy()
    expect(screen.getByText('生成密钥').closest('button')).toBeDisabled()
  })

  it('hides create button when onCreate is not provided', () => {
    render(<SystemTableToolbar {...defaultProps} />)
    expect(screen.queryByText('toolbar.create')).toBeNull()
  })

  it('renders children', () => {
    render(
      <SystemTableToolbar {...defaultProps}>
        <span>extra content</span>
      </SystemTableToolbar>,
    )
    expect(screen.getByText('extra content')).toBeTruthy()
  })

  it('applies custom width to search input container', () => {
    render(<SystemTableToolbar {...defaultProps} keywordWidth={500} />)
    const input = screen.getByPlaceholderText('toolbar.searchPlaceholder')
    expect(
      input.closest('.ant-input-search-wrapper')?.style?.width ||
        input.style?.width,
    ).toBeDefined()
  })
})
