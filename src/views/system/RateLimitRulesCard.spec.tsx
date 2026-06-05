import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()
const mockCan = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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
  assertApiSuccess: vi.fn(),
  http: { get: vi.fn(), put: vi.fn() },
}))

import { RateLimitRulesCard } from '@/views/system/RateLimitRulesCard'

describe('RateLimitRulesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQuery.mockReturnValue({
      data: [],
      isFetching: false,
      refetch: vi.fn(),
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
})
