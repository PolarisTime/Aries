import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
})
