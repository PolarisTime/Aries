import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseMonitoring } from '@/api/database-admin'

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

const fullMonitoring: DatabaseMonitoring = {
  available: true,
  status: '正常',
  overview: {
    totalConnections: '10',
    activeConnections: 4,
    idleInTransactionConnections: 1,
    lockWaitSessions: 1,
    blockedSessions: 2,
    longTransactions: 1,
    longestTransactionSeconds: 120,
    longestQuerySeconds: 3600,
    xactCommit: 100,
    xactRollback: 5,
    deadlocks: 1,
    tempFiles: 3,
    tempBytes: 2048,
    cacheHitRate: 98.5,
    databaseSize: '12 GB',
    uptimeSeconds: 172800,
  },
  activity: {
    activeSessions: 4,
    idleInTransactionSessions: 1,
    lockWaitSessions: 1,
    blockedSessions: 2,
    longTransactions: 1,
    longestTransactionSeconds: 120,
    longestQuerySeconds: 3600,
  },
  tuning: {
    maxConnections: 100,
    totalConnections: 10,
    activeConnections: 4,
    hikariMaximumPoolSize: 20,
    hikariMinimumIdle: 2,
    hikariLeakDetectionThresholdMs: 0,
    statementTimeout: '30s',
    idleInTransactionSessionTimeout: '60s',
    lockTimeout: '5s',
    trackIoTiming: 'on',
    sharedBuffers: '128MB',
    effectiveCacheSize: '512MB',
    workMem: '4MB',
    maintenanceWorkMem: '64MB',
    maxWalSize: '1GB',
    checkpointTimeout: '5min',
    pgStatStatementsTrack: 'top',
  },
  tableHealth: [
    {
      tableName: 'purchase_order',
      liveRows: 1000,
      deadRows: 250,
      deadPct: 25,
      seqScan: 12,
      idxScan: 120,
      nModSinceAnalyze: 42,
      heapCachePct: 91.5,
      vacuumTriggerRows: 200,
      analyzeTriggerRows: 150,
      lastAutovacuumAgeSeconds: 7200,
      lastAutoanalyzeAgeSeconds: 3600,
      autovacuumStatus: '需 VACUUM',
      autovacuumAdvice: '触发清理',
      lastVacuum: null,
      lastAutovacuum: '2026-06-05T01:00:00',
      lastAnalyze: null,
      lastAutoanalyze: '2026-06-05T02:00:00',
    },
    {
      tableName: 'sales_order',
      liveRows: '500',
      deadRows: '5',
      deadPct: 1,
      seqScan: '3',
      idxScan: '80',
      nModSinceAnalyze: '7',
      heapCachePct: 99.2,
      vacuumTriggerRows: '100',
      analyzeTriggerRows: '50',
      lastAutovacuumAgeSeconds: null,
      lastAutoanalyzeAgeSeconds: null,
      autovacuumStatus: '干净',
      autovacuumAdvice: '正常',
      lastVacuum: null,
      lastAutovacuum: null,
      lastAnalyze: null,
      lastAutoanalyze: null,
    },
  ],
  indexHealth: [
    {
      indexName: 'idx_purchase_order_no',
      tableName: 'purchase_order',
      size: '16 MB',
      sizeBytes: 16777216,
      scans: 0,
      tuplesRead: 0,
      tuplesFetched: 0,
      valid: false,
      unique: false,
      primary: false,
    },
    {
      indexName: 'idx_sales_order_no',
      tableName: 'sales_order',
      size: '8 MB',
      sizeBytes: 8388608,
      scans: 12,
      tuplesRead: 120,
      tuplesFetched: 100,
      valid: true,
      unique: true,
      primary: false,
    },
  ],
  queryStats: {
    available: true,
    status: 'pg_stat_statements enabled',
    items: [
      {
        queryId: 'q-1',
        queryPreview: 'select * from purchase_order',
        calls: 7,
        totalMs: 123.456,
        avgMs: 17.636,
        rows: 700,
        cacheHitPct: 96.2,
      },
    ],
  },
  redis: {
    memory: {
      usedMemory: 1024,
      usedMemoryPeak: 2048,
      maxMemory: 4096,
      fragmentationRatio: 1.25,
      evictedKeys: 2,
      expiredKeys: 9,
    },
    clients: {
      connectedClients: 3,
      blockedClients: 1,
      rejectedConnections: 2,
    },
    throughput: {
      totalCommandsProcessed: 10000,
      instantaneousOpsPerSec: 45,
      keyspaceHits: 80,
      keyspaceMisses: 20,
      hitRate: 80,
    },
    keyspace: {
      database: 0,
      keys: 120,
      expires: 30,
      avgTtlMs: 90000,
    },
    persistence: {
      rdbLastSaveTime: 1700000000,
      rdbLastBgsaveStatus: 'ok',
      aofEnabled: true,
      aofLastBgrewriteStatus: 'ok',
    },
    status: 'UP',
  },
}

const unavailableMonitoring: DatabaseMonitoring = {
  ...fullMonitoring,
  available: false,
  status: '连接失败',
  overview: undefined as never,
  activity: undefined as never,
  tableHealth: undefined as never,
  indexHealth: undefined as never,
  queryStats: {
    available: false,
    status: '',
    items: [],
  },
  redis: {
    ...fullMonitoring.redis,
    memory: {
      usedMemory: Number.NaN,
      usedMemoryPeak: '',
      maxMemory: 0,
      fragmentationRatio: 0,
      evictedKeys: 'bad-number',
      expiredKeys: 0,
    },
    throughput: {
      totalCommandsProcessed: 'bad-number',
      instantaneousOpsPerSec: 0,
      keyspaceHits: 0,
      keyspaceMisses: 0,
      hitRate: 0,
    },
    keyspace: {
      database: 1,
      keys: 0,
      expires: 0,
      avgTtlMs: 0,
    },
    persistence: {
      rdbLastSaveTime: 0,
      rdbLastBgsaveStatus: '',
      aofEnabled: false,
      aofLastBgrewriteStatus: '',
    },
    status: 'DOWN',
  },
}

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
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['database-monitoring', 'readonly-v2'],
      }),
    )
  })

  it('renders empty state when no data and not fetching', () => {
    render(<DatabaseMonitoringPanel visible={true} />)
    expect(
      screen.getByText('system.databaseMonitor.noData'),
    ).toBeInTheDocument()
  })

  it('renders section title when visible', () => {
    render(<DatabaseMonitoringPanel visible={true} />)
    expect(
      screen.getByText('system.databaseMonitor.sectionTitle'),
    ).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<DatabaseMonitoringPanel visible={true} />)
    expect(
      screen.getByText('system.databaseMonitor.refresh'),
    ).toBeInTheDocument()
  })

  it('calls refetch when refresh button is clicked', () => {
    const refetch = vi.fn()
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      refetch,
    })

    render(<DatabaseMonitoringPanel visible={true} />)

    fireEvent.click(screen.getByText('system.databaseMonitor.refresh'))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    )
  })

  it('renders postgres, table, index, query and redis metrics', () => {
    mockUseQuery.mockReturnValue({
      data: fullMonitoring,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(<DatabaseMonitoringPanel visible={true} />)

    expect(
      screen.getByText('system.databaseMonitor.pgDiagnostics'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.healthSummary'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.currentActivity'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.tableHealth'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.indexHealth'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.slowSqlSummary'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.redisMonitor'),
    ).toBeInTheDocument()

    expect(screen.getByText('4 / 10')).toBeInTheDocument()
    expect(screen.getByText('98.50%')).toBeInTheDocument()
    expect(screen.getByText('2d')).toBeInTheDocument()
    expect(screen.getAllByText('purchase_order')).toHaveLength(2)
    expect(screen.getByText('idx_purchase_order_no')).toBeInTheDocument()
    expect(
      screen.getByText('system.databaseMonitor.invalid'),
    ).toBeInTheDocument()
    expect(screen.getByText('select * from purchase_order')).toBeInTheDocument()
    expect(screen.getByText('123.46')).toBeInTheDocument()
    expect(screen.getByText('17.64')).toBeInTheDocument()
    expect(screen.getByText('DB 0')).toBeInTheDocument()
    expect(screen.getByText('120 keys')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('renders unavailable postgres and redis fallback values', () => {
    mockUseQuery.mockReturnValue({
      data: unavailableMonitoring,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(<DatabaseMonitoringPanel visible={true} />)

    expect(screen.getAllByText('连接失败')).toHaveLength(2)

    const redisSection = screen
      .getByText('system.databaseMonitor.redisMonitor')
      .closest('.database-monitor-subsection')
    expect(redisSection).not.toBeNull()
    expect(
      within(redisSection as HTMLElement).getByText('DOWN'),
    ).toBeInTheDocument()
    expect(
      within(redisSection as HTMLElement).getByText(
        'system.databaseMonitor.notSet',
      ),
    ).toBeInTheDocument()
    expect(
      within(redisSection as HTMLElement).getByText(
        /system\.databaseMonitor\.aofNotEnabled/,
      ),
    ).toBeInTheDocument()
  })

  it('renders query stats fallback when pg stat statements is unavailable', () => {
    mockUseQuery.mockReturnValue({
      data: {
        ...fullMonitoring,
        queryStats: {
          available: false,
          status: '',
          items: [],
        },
      },
      isFetching: false,
      refetch: vi.fn(),
    })

    render(<DatabaseMonitoringPanel visible={true} />)

    expect(
      screen.getByText('system.databaseMonitor.pgStatNotEnabled'),
    ).toBeInTheDocument()
  })
})
