import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()
const mockCan = vi.fn()
const mockUseQueryClient = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/views/system/DatabaseMonitoringPanel', () => ({
  DatabaseMonitoringPanel: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="monitoring-panel">Monitoring</div> : null,
}))

vi.mock('@/views/system/DatabaseStatusOverview', () => ({
  DatabaseStatusOverview: ({
    dbStatus,
    loading,
  }: {
    dbStatus: unknown
    loading: boolean
  }) => (
    <div data-testid="status-overview">
      {loading ? 'Loading...' : dbStatus ? 'Loaded' : 'No data'}
    </div>
  ),
}))

import { DatabaseBackupView } from '@/views/system/DatabaseBackupView'

describe('DatabaseBackupView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockUseQuery.mockReturnValue({
      data: { postgres: { status: '正常' }, redis: { status: '正常' } },
      isLoading: false,
    })
  })

  it('renders without crashing', () => {
    expect(DatabaseBackupView).toBeDefined()
    expect(typeof DatabaseBackupView).toBe('function')
  })

  it('renders the page title', () => {
    render(<DatabaseBackupView />)
    expect(screen.getByText('system.database.title')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<DatabaseBackupView />)
    expect(screen.getByText('system.database.description')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<DatabaseBackupView />)
    expect(
      screen.getByText('system.database.refreshStatus'),
    ).toBeInTheDocument()
  })

  it('renders the status overview component', () => {
    render(<DatabaseBackupView />)
    expect(screen.getByTestId('status-overview')).toBeInTheDocument()
  })

  it('renders monitoring panel when user has permission', () => {
    mockCan.mockReturnValue(true)
    render(<DatabaseBackupView />)
    expect(screen.getByTestId('monitoring-panel')).toBeInTheDocument()
  })

  it('does not render monitoring panel when user lacks permission', () => {
    mockCan.mockReturnValue(false)
    render(<DatabaseBackupView />)
    expect(screen.queryByTestId('monitoring-panel')).not.toBeInTheDocument()
  })
})
