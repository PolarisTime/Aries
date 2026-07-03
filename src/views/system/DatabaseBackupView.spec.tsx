import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabaseStatus } from '@/api/database-admin'
import { QUERY_KEYS } from '@/constants/query-keys'

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  invalidateQueries: vi.fn(),
  monitoringPanelProps: [] as Array<{ visible: boolean }>,
  statusOverviewProps: [] as Array<{ dbStatus: unknown; loading: boolean }>,
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mocks.useQuery(...args),
  useQueryClient: () => mocks.useQueryClient(),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mocks.can }),
}))

vi.mock('@/views/system/DatabaseMonitoringPanel', () => ({
  DatabaseMonitoringPanel: ({ visible }: { visible: boolean }) => {
    mocks.monitoringPanelProps.push({ visible })

    return (
      <div data-testid="monitoring-panel" data-visible={String(visible)}>
        {visible ? 'Monitoring visible' : 'Monitoring hidden'}
      </div>
    )
  },
}))

vi.mock('@/views/system/DatabaseStatusOverview', () => ({
  DatabaseStatusOverview: ({
    dbStatus,
    loading,
  }: {
    dbStatus: unknown
    loading: boolean
  }) => {
    mocks.statusOverviewProps.push({ dbStatus, loading })

    return (
      <div data-testid="status-overview" data-loading={String(loading)}>
        {loading ? 'Loading...' : dbStatus ? 'Loaded' : 'No data'}
      </div>
    )
  },
}))

import { DatabaseBackupView } from '@/views/system/DatabaseBackupView'

describe('DatabaseBackupView', () => {
  const databaseStatus = {
    postgres: { status: '正常' },
    redis: { status: '正常' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.monitoringPanelProps = []
    mocks.statusOverviewProps = []
    mocks.can.mockReturnValue(true)
    mocks.invalidateQueries.mockResolvedValue(undefined)
    mocks.useQueryClient.mockReturnValue({
      invalidateQueries: mocks.invalidateQueries,
    })
    mocks.useQuery.mockReturnValue({
      data: databaseStatus,
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

  it('uses database status query configuration', () => {
    render(<DatabaseBackupView />)

    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.databaseStatus,
      queryFn: getDatabaseStatus,
    })
  })

  it('passes loaded status data to overview', () => {
    render(<DatabaseBackupView />)

    expect(screen.getByTestId('status-overview')).toHaveTextContent('Loaded')
    expect(mocks.statusOverviewProps).toEqual([
      { dbStatus: databaseStatus, loading: false },
    ])
  })

  it('passes loading state to button and overview', () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<DatabaseBackupView />)

    expect(screen.getByRole('button')).toHaveClass('ant-btn-loading')
    expect(screen.getByTestId('status-overview')).toHaveTextContent(
      'Loading...',
    )
    expect(mocks.statusOverviewProps).toEqual([
      { dbStatus: undefined, loading: true },
    ])
  })

  it('passes empty status data to overview when the query has no result', () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    })

    render(<DatabaseBackupView />)

    expect(screen.getByTestId('status-overview')).toHaveTextContent('No data')
    expect(mocks.statusOverviewProps).toEqual([
      { dbStatus: undefined, loading: false },
    ])
  })

  it('renders monitoring panel when user has permission', () => {
    mocks.can.mockReturnValue(true)
    render(<DatabaseBackupView />)

    expect(mocks.can).toHaveBeenCalledWith('database', 'read')
    expect(screen.getByTestId('monitoring-panel')).toHaveAttribute(
      'data-visible',
      'true',
    )
    expect(mocks.monitoringPanelProps).toEqual([{ visible: true }])
  })

  it('passes hidden state to monitoring panel when user lacks permission', () => {
    mocks.can.mockReturnValue(false)
    render(<DatabaseBackupView />)

    expect(screen.getByTestId('monitoring-panel')).toHaveAttribute(
      'data-visible',
      'false',
    )
    expect(mocks.monitoringPanelProps).toEqual([{ visible: false }])
  })

  it('refreshes the database status query from the toolbar button', () => {
    render(<DatabaseBackupView />)

    fireEvent.click(
      screen.getByRole('button', {
        name: /system\.database\.refreshStatus/,
      }),
    )

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.databaseStatus,
    })
  })
})
