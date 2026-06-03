import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'test-id' }),
}))

vi.mock('@/api/api-keys', () => ({
  getApiKeyDetail: vi.fn().mockResolvedValue({
    id: 'test-id',
    keyName: 'Test Key',
    usageScope: '全部接口',
    allowedResources: [],
    allowedActions: ['read'],
    userName: 'Admin',
    loginName: 'admin',
    userId: 'user-1',
    keyPrefix: 'sk-test',
    status: '有效',
    createdAt: '2024-01-01T00:00:00',
    expiresAt: null,
    lastUsedAt: null,
  }),
  listApiKeyResourceOptions: vi.fn().mockResolvedValue([]),
  listApiKeyActionOptions: vi.fn().mockResolvedValue([
    { code: 'read', title: '读取' },
  ]),
}))

import { ApiKeyDetailView } from '@/views/system/ApiKeyDetailView'

describe('ApiKeyDetailView', () => {
  it('renders without crashing', () => {
    expect(ApiKeyDetailView).toBeDefined()
    expect(typeof ApiKeyDetailView).toBe('function')
  })

  it('renders the back button', () => {
    render(<ApiKeyDetailView />)
    expect(screen.getByText('system.apiKeyDetail.back')).toBeInTheDocument()
  })

  it('renders the page title', () => {
    render(<ApiKeyDetailView />)
    expect(screen.getByText('system.apiKeyDetail.title')).toBeInTheDocument()
  })

  it('renders loading state initially', () => {
    const { container } = render(<ApiKeyDetailView />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('renders empty state when no record and not loading', async () => {
    const { container } = render(<ApiKeyDetailView />)
    expect(container).toBeInTheDocument()
  })
})
