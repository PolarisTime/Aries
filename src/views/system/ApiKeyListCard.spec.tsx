import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/usePaginationConfig', () => ({
  createPaginationConfig: (opts: Record<string, unknown>) => opts,
}))

vi.mock('@/views/system/ApiKeyListToolbar', () => ({
  ApiKeyListToolbar: () => <div data-testid="toolbar">Toolbar</div>,
}))

vi.mock('@/views/system/api-key-list-columns', () => ({
  buildApiKeyListColumns: () => [
    { title: 'Key Name', dataIndex: 'keyName', width: 180 },
    { title: 'Status', dataIndex: 'status', width: 110 },
  ],
}))

import { ApiKeyListCard } from '@/views/system/ApiKeyListCard'

describe('ApiKeyListCard', () => {
  const defaultProps = {
    keyword: '',
    filterUserId: undefined,
    statusFilter: undefined,
    usageScopeFilter: undefined,
    currentPage: 1,
    pageSize: 20,
    totalElements: 2,
    keys: [
      { id: '1', keyName: 'key1', status: '有效' },
      { id: '2', keyName: 'key2', status: '已禁用' },
    ],
    loading: false,
    canCreate: true,
    canEdit: true,
    totpDisabled: false,
    userOptions: [],
    resourceOptions: [],
    actionOptions: [],
    onKeywordChange: vi.fn(),
    onSearch: vi.fn(),
    onFilterUserChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onUsageScopeFilterChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
    onRevoke: vi.fn(),
    onPageChange: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(ApiKeyListCard).toBeDefined()
    expect(typeof ApiKeyListCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<ApiKeyListCard {...defaultProps} />)
    expect(screen.getByText('system.apiKeyList.title')).toBeInTheDocument()
  })

  it('renders the toolbar', () => {
    render(<ApiKeyListCard {...defaultProps} />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('renders table with data', () => {
    const { container } = render(<ApiKeyListCard {...defaultProps} />)
    expect(container.querySelector('.ant-table')).toBeInTheDocument()
  })

  it('renders table rows', () => {
    render(<ApiKeyListCard {...defaultProps} />)
    expect(screen.getByText('key1')).toBeInTheDocument()
    expect(screen.getByText('key2')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    const { container } = render(<ApiKeyListCard {...defaultProps} loading={true} />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('renders empty table when no keys', () => {
    render(<ApiKeyListCard {...defaultProps} keys={[]} totalElements={0} />)
    expect(screen.getByText('system.apiKeyList.title')).toBeInTheDocument()
  })
})
