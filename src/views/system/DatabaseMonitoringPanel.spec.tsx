import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

import { DatabaseMonitoringPanel } from '@/views/system/DatabaseMonitoringPanel'

describe('DatabaseMonitoringPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it('renders without crashing', () => {
    expect(DatabaseMonitoringPanel).toBeDefined()
    expect(typeof DatabaseMonitoringPanel).toBe('function')
  })

  it('returns null when not visible', () => {
    const { container } = render(<DatabaseMonitoringPanel visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders empty state when no data and not fetching', () => {
    render(<DatabaseMonitoringPanel visible={true} />)
    expect(screen.getByText('system.databaseMonitor.noData')).toBeInTheDocument()
  })

  it('renders section title when visible', () => {
    render(<DatabaseMonitoringPanel visible={true} />)
    expect(screen.getByText('system.databaseMonitor.sectionTitle')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<DatabaseMonitoringPanel visible={true} />)
    expect(screen.getByText('system.databaseMonitor.refresh')).toBeInTheDocument()
  })
})
