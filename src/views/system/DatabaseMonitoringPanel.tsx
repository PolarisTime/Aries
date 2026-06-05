import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Empty from 'antd/es/empty'
import Progress from 'antd/es/progress'
import Row from 'antd/es/row'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import {
  type ApiNumeric,
  type DatabaseMonitoring,
  getDatabaseMonitoring,
  type IndexHealthItem,
  type PostgresActivity,
  type PostgresOverview,
  type QueryStats,
  type RedisMonitoring,
  type TableHealthItem,
} from '@/api/database-admin'
import { formatDatabaseMemory } from '@/views/system/database-backup-view-utils'

interface Props {
  visible: boolean
}

export function DatabaseMonitoringPanel({ visible }: Props) {
  const { t } = useTranslation()
  const { data, isFetching, refetch } = useQuery<DatabaseMonitoring>({
    queryKey: ['database-monitoring', 'readonly-v2'],
    queryFn: getDatabaseMonitoring,
    enabled: visible,
  })

  if (!visible) return null

  if (!data && !isFetching) {
    return (
      <div className="database-status-section">
        <DatabaseMonitoringHeader
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('system.databaseMonitor.noData')}
        />
      </div>
    )
  }

  return (
    <div className="database-status-section">
      <DatabaseMonitoringHeader
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />

      {data ? (
        <div className="database-monitor-stack">
          <PostgresDiagnostic monitoring={data} />
          <RedisMonitoringSummary redis={data.redis} />
        </div>
      ) : (
        <Card className="database-monitor-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('system.databaseMonitor.noData')}
          />
        </Card>
      )}
    </div>
  )
}

interface DatabaseMonitoringHeaderProps {
  isFetching: boolean
  onRefresh: () => void
}

function DatabaseMonitoringHeader({
  isFetching,
  onRefresh,
}: DatabaseMonitoringHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="database-section-heading">
      <div>
        <Typography.Title level={5} className="database-section-title">
          {t('system.databaseMonitor.sectionTitle')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('system.databaseMonitor.sectionDesc')}
        </Typography.Text>
      </div>
      <Button
        size="small"
        loading={isFetching}
        icon={<ReloadOutlined />}
        onClick={onRefresh}
      >
        {t('system.databaseMonitor.refresh')}
      </Button>
    </div>
  )
}

interface PostgresDiagnosticProps {
  monitoring: DatabaseMonitoring
}

function PostgresDiagnostic({ monitoring }: PostgresDiagnosticProps) {
  const { t } = useTranslation()
  const isHealthy = monitoring.status === '正常'
  const overview = monitoring.overview ?? EMPTY_POSTGRES_OVERVIEW
  const activity = monitoring.activity ?? EMPTY_POSTGRES_ACTIVITY

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-heading">
        <div className="database-monitor-subsection-title">
          {t('system.databaseMonitor.pgDiagnostics')}
        </div>
        <Tag color={isHealthy ? 'green' : 'red'}>{monitoring.status}</Tag>
      </div>
      {monitoring.available ? (
        <div className="database-monitor-stack">
          <PostgresOverviewCards overview={overview} />
          <PostgresActivityCards activity={activity} />
          <PostgresHealthTables
            tableHealth={monitoring.tableHealth ?? []}
            indexHealth={monitoring.indexHealth ?? []}
          />
          <PostgresQueryStats
            queryStats={monitoring.queryStats ?? EMPTY_QUERY_STATS}
          />
        </div>
      ) : (
        <Card className="database-monitor-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              monitoring.status || t('system.databaseMonitor.pgUnavailable')
            }
          />
        </Card>
      )}
    </div>
  )
}

const EMPTY_POSTGRES_OVERVIEW: PostgresOverview = {
  totalConnections: 0,
  activeConnections: 0,
  idleInTransactionConnections: 0,
  lockWaitSessions: 0,
  blockedSessions: 0,
  longTransactions: 0,
  longestTransactionSeconds: 0,
  longestQuerySeconds: 0,
  xactCommit: 0,
  xactRollback: 0,
  deadlocks: 0,
  tempFiles: 0,
  tempBytes: 0,
  cacheHitRate: 0,
  databaseSize: '未知',
  uptimeSeconds: 0,
}

const EMPTY_POSTGRES_ACTIVITY: PostgresActivity = {
  activeSessions: 0,
  idleInTransactionSessions: 0,
  lockWaitSessions: 0,
  blockedSessions: 0,
  longTransactions: 0,
  longestTransactionSeconds: 0,
  longestQuerySeconds: 0,
}

const EMPTY_QUERY_STATS = {
  available: false,
  status: '未启用 pg_stat_statements',
  items: [],
}

interface PostgresOverviewCardsProps {
  overview: PostgresOverview
}

function PostgresOverviewCards({ overview }: PostgresOverviewCardsProps) {
  const { t } = useTranslation()
  const activeConnections = toFiniteNumber(overview.activeConnections)
  const totalConnections = toFiniteNumber(overview.totalConnections)
  const xactCommit = toFiniteNumber(overview.xactCommit)
  const xactRollback = toFiniteNumber(overview.xactRollback)
  const connectionRate =
    totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0
  const rollbackRate =
    xactCommit + xactRollback > 0
      ? (xactRollback / (xactCommit + xactRollback)) * 100
      : 0

  const metrics = [
    {
      label: t('system.databaseMonitor.metricConnection'),
      value: `${formatInteger(overview.activeConnections)} / ${formatInteger(overview.totalConnections)}`,
      extra: `${t('system.databaseMonitor.metricActiveRatio')} ${formatPercent(connectionRate)}`,
    },
    {
      label: t('system.databaseMonitor.metricLockWait'),
      value: formatInteger(overview.lockWaitSessions),
      extra: `${t('system.databaseMonitor.blockedSessions')} ${formatInteger(overview.blockedSessions)}`,
    },
    {
      label: t('system.databaseMonitor.metricLongTx'),
      value: formatInteger(overview.longTransactions),
      extra: `${t('system.databaseMonitor.longest')} ${formatDuration(overview.longestTransactionSeconds)}`,
    },
    {
      label: t('system.databaseMonitor.metricCacheHit'),
      value: formatPercent(overview.cacheHitRate),
      extra: `DB ${overview.databaseSize || '--'}`,
    },
    {
      label: t('system.databaseMonitor.metricTxRollback'),
      value: formatInteger(overview.xactRollback),
      extra: `${t('system.databaseMonitor.metricRollbackRate')} ${formatPercent(rollbackRate)}`,
    },
    {
      label: t('system.databaseMonitor.metricDeadlock'),
      value: formatInteger(overview.deadlocks),
      extra: `${t('system.databaseMonitor.metricTempFiles')} ${formatInteger(overview.tempFiles)}`,
    },
    {
      label: t('system.databaseMonitor.metricTempWrite'),
      value: formatDatabaseMemory(overview.tempBytes),
      extra: t('system.databaseMonitor.metricFromPgStat'),
    },
    {
      label: t('system.databaseMonitor.metricUptime'),
      value: formatDuration(overview.uptimeSeconds),
      extra: `${t('system.databaseMonitor.metricLongestQuery')} ${formatDuration(overview.longestQuerySeconds)}`,
    },
  ]

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-title">
        {t('system.databaseMonitor.healthSummary')}
      </div>
      <Card
        size="small"
        className="database-monitor-card database-redis-monitor-card"
      >
        <MetricTiles metrics={metrics} />
      </Card>
    </div>
  )
}

interface PostgresActivityCardsProps {
  activity: PostgresActivity
}

function PostgresActivityCards({ activity }: PostgresActivityCardsProps) {
  const { t } = useTranslation()
  const metrics = [
    {
      label: 'Active',
      value: formatInteger(activity.activeSessions),
      extra: t('system.databaseMonitor.activeSessions'),
    },
    {
      label: 'Idle in tx',
      value: formatInteger(activity.idleInTransactionSessions),
      extra: t('system.databaseMonitor.idleInTxSessions'),
    },
    {
      label: t('system.databaseMonitor.lockWait'),
      value: formatInteger(activity.lockWaitSessions),
      extra: `${t('system.databaseMonitor.blocked')} ${formatInteger(activity.blockedSessions)}`,
    },
    {
      label: t('system.databaseMonitor.longTx'),
      value: formatInteger(activity.longTransactions),
      extra: `${t('system.databaseMonitor.longest')} ${formatDuration(activity.longestTransactionSeconds)}`,
    },
  ]

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-title">
        {t('system.databaseMonitor.currentActivity')}
      </div>
      <Card
        size="small"
        className="database-monitor-card database-redis-monitor-card"
      >
        <MetricTiles metrics={metrics} />
      </Card>
    </div>
  )
}

interface PostgresHealthTablesProps {
  tableHealth: TableHealthItem[]
  indexHealth: IndexHealthItem[]
}

function PostgresHealthTables({
  tableHealth,
  indexHealth,
}: PostgresHealthTablesProps) {
  const { t } = useTranslation()
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card
          size="small"
          title={t('system.databaseMonitor.tableHealth')}
          className="database-monitor-card"
        >
          <Table
            rowKey="tableName"
            dataSource={tableHealth}
            scroll={{ x: 820 }}
            columns={[
              {
                dataIndex: 'tableName',
                title: t('system.databaseMonitor.colTable'),
                width: 220,
                ellipsis: true,
              },
              {
                dataIndex: 'deadPct',
                title: t('system.databaseMonitor.colDeadTupleRate'),
                width: 110,
                align: 'right',
                render: (v: number) => (
                  <Progress
                    percent={v}
                    size="small"
                    strokeColor={bloatColor(v)}
                    format={() => formatPercent(v)}
                  />
                ),
              },
              {
                dataIndex: 'deadRows',
                title: t('system.databaseMonitor.colDeadTuples'),
                width: 90,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'autovacuumStatus',
                title: t('system.databaseMonitor.colAutovacuum'),
                width: 110,
                render: (status: string) => (
                  <Tag color={autovacuumStatusColor(status)}>
                    {status || t('system.databaseMonitor.unknownStatus')}
                  </Tag>
                ),
              },
              {
                dataIndex: 'vacuumTriggerRows',
                title: t('system.databaseMonitor.colVacuumThreshold'),
                width: 90,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'nModSinceAnalyze',
                title: t('system.databaseMonitor.colPendingAnalyze'),
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'seqScan',
                title: t('system.databaseMonitor.colSeqScan'),
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'heapCachePct',
                title: t('system.databaseMonitor.colCache'),
                width: 80,
                align: 'right',
                render: formatPercent,
              },
              {
                dataIndex: 'lastAutovacuum',
                title: t('system.databaseMonitor.colLastVacuum'),
                width: 120,
                render: formatNullableDateTime,
              },
              {
                dataIndex: 'lastAutovacuumAgeSeconds',
                title: t('system.databaseMonitor.colVacuumInterval'),
                width: 90,
                render: formatDurationNullable,
              },
              {
                dataIndex: 'autovacuumAdvice',
                title: t('system.databaseMonitor.colAdvice'),
                width: 260,
                ellipsis: true,
              },
            ]}
            size="small"
            pagination={false}
            locale={{ emptyText: t('system.databaseMonitor.noTableHealth') }}
          />
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card
          size="small"
          title={t('system.databaseMonitor.indexHealth')}
          className="database-monitor-card"
        >
          <Table
            rowKey="indexName"
            dataSource={indexHealth}
            scroll={{ x: 760 }}
            columns={[
              {
                dataIndex: 'indexName',
                title: t('system.databaseMonitor.colIndex'),
                width: 260,
                ellipsis: true,
              },
              {
                dataIndex: 'tableName',
                title: t('system.databaseMonitor.colTable'),
                width: 160,
                ellipsis: true,
              },
              {
                dataIndex: 'size',
                title: t('system.databaseMonitor.colSize'),
                width: 80,
                align: 'right',
              },
              {
                dataIndex: 'scans',
                title: t('system.databaseMonitor.colScans'),
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'valid',
                title: t('system.databaseMonitor.colStatus'),
                width: 80,
                render: (valid: boolean) => (
                  <Tag color={valid ? 'green' : 'red'}>
                    {valid
                      ? t('system.databaseMonitor.valid')
                      : t('system.databaseMonitor.invalid')}
                  </Tag>
                ),
              },
            ]}
            size="small"
            pagination={false}
            locale={{ emptyText: t('system.databaseMonitor.noIndexHealth') }}
          />
        </Card>
      </Col>
    </Row>
  )
}

interface PostgresQueryStatsProps {
  queryStats: QueryStats
}

function PostgresQueryStats({ queryStats }: PostgresQueryStatsProps) {
  const { t } = useTranslation()
  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-heading">
        <div className="database-monitor-subsection-title">
          {t('system.databaseMonitor.slowSqlSummary')}
        </div>
        <Tag color={queryStats.available ? 'green' : 'default'}>
          {queryStats.status}
        </Tag>
      </div>
      {queryStats.available ? (
        <Card size="small" className="database-monitor-card">
          <Table
            rowKey="queryId"
            dataSource={queryStats.items}
            scroll={{ x: 880 }}
            columns={[
              {
                dataIndex: 'queryPreview',
                title: 'SQL',
                width: 360,
                ellipsis: true,
              },
              {
                dataIndex: 'calls',
                title: t('system.databaseMonitor.colCalls'),
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'totalMs',
                title: t('system.databaseMonitor.colTotalMs'),
                width: 100,
                align: 'right',
                render: formatNumber,
              },
              {
                dataIndex: 'avgMs',
                title: t('system.databaseMonitor.colAvgMs'),
                width: 90,
                align: 'right',
                render: formatNumber,
              },
              {
                dataIndex: 'rows',
                title: t('system.databaseMonitor.colRows'),
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'cacheHitPct',
                title: t('system.databaseMonitor.colCacheHitPct'),
                width: 90,
                align: 'right',
                render: formatPercent,
              },
            ]}
            size="small"
            pagination={false}
            locale={{ emptyText: t('system.databaseMonitor.noSlowSql') }}
          />
        </Card>
      ) : (
        <Card className="database-monitor-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              queryStats.status || t('system.databaseMonitor.pgStatNotEnabled')
            }
          />
        </Card>
      )}
    </div>
  )
}

interface RedisMonitoringSummaryProps {
  redis: RedisMonitoring
}

function RedisMonitoringSummary({ redis }: RedisMonitoringSummaryProps) {
  const { t } = useTranslation()
  const isHealthy =
    redis.status === '正常' || redis.status.toUpperCase() === 'UP'
  const metrics = [
    {
      label: t('system.databaseMonitor.redisMemUsage'),
      value: formatDatabaseMemory(redis.memory.usedMemory),
      extra: `${t('system.databaseMonitor.peak')} ${formatDatabaseMemory(redis.memory.usedMemoryPeak)}`,
    },
    {
      label: t('system.databaseMonitor.redisMemLimit'),
      value:
        toFiniteNumber(redis.memory.maxMemory) > 0
          ? formatDatabaseMemory(redis.memory.maxMemory)
          : t('system.databaseMonitor.notSet'),
      extra: `${t('system.databaseMonitor.fragRatio')} ${formatRatio(redis.memory.fragmentationRatio)}`,
    },
    {
      label: t('system.databaseMonitor.realtimeOps'),
      value: formatInteger(redis.throughput.instantaneousOpsPerSec),
      extra: `${t('system.databaseMonitor.totalCommands')} ${formatInteger(redis.throughput.totalCommandsProcessed)}`,
    },
    {
      label: t('system.databaseMonitor.hitRate'),
      value: formatPercent(redis.throughput.hitRate),
      extra: `${formatInteger(redis.throughput.keyspaceHits)} / ${formatInteger(redis.throughput.keyspaceMisses)}`,
    },
    {
      label: t('system.databaseMonitor.clients'),
      value: formatInteger(redis.clients.connectedClients),
      extra: `${t('system.databaseMonitor.blockedClients')} ${formatInteger(redis.clients.blockedClients)} / ${t('system.databaseMonitor.rejectedConn')} ${formatInteger(redis.clients.rejectedConnections)}`,
    },
    {
      label: `DB ${redis.keyspace.database}`,
      value: `${formatInteger(redis.keyspace.keys)} keys`,
      extra: `${t('system.databaseMonitor.keyExpired')} ${formatInteger(redis.keyspace.expires)} / TTL ${formatTtl(redis.keyspace.avgTtlMs)}`,
    },
    {
      label: 'Key',
      value: `${formatInteger(redis.memory.evictedKeys)} ${t('system.databaseMonitor.evicted')}`,
      extra: `${formatInteger(redis.memory.expiredKeys)} ${t('system.databaseMonitor.expired')}`,
    },
    {
      label: t('system.databaseMonitor.persistence'),
      value:
        redis.persistence.rdbLastBgsaveStatus ||
        t('system.databaseMonitor.unknown'),
      extra: `AOF ${redis.persistence.aofEnabled ? redis.persistence.aofLastBgrewriteStatus : t('system.databaseMonitor.aofNotEnabled')} / RDB ${formatUnixSeconds(redis.persistence.rdbLastSaveTime)}`,
    },
  ]

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-heading">
        <div className="database-monitor-subsection-title">
          {t('system.databaseMonitor.redisMonitor')}
        </div>
        <Tag color={isHealthy ? 'green' : 'red'}>{redis.status}</Tag>
      </div>
      <Card
        size="small"
        className="database-monitor-card database-redis-monitor-card"
      >
        <MetricTiles metrics={metrics} />
      </Card>
    </div>
  )
}

interface MetricTileData {
  label: string
  value: string
  extra: string
}

interface MetricTilesProps {
  metrics: MetricTileData[]
}

function MetricTiles({ metrics }: MetricTilesProps) {
  return (
    <Row gutter={[10, 10]} className="database-metric-row">
      {metrics.map((metric) => (
        <Col xs={24} sm={12} xl={6} key={metric.label}>
          <MetricTile {...metric} />
        </Col>
      ))}
    </Row>
  )
}

function MetricTile({ label, value, extra }: MetricTileData) {
  return (
    <div className="database-metric-tile">
      <div className="database-metric-label">{label}</div>
      <div className="database-metric-value">{value}</div>
      <div className="database-metric-extra">{extra}</div>
    </div>
  )
}

function bloatColor(pct: number) {
  return pct > 20 ? '#ef4444' : pct > 10 ? '#f59e0b' : '#22c55e'
}

function autovacuumStatusColor(status: string) {
  if (status === '需 VACUUM') return 'red'
  if (status === '关注' || status === '需 ANALYZE') return 'orange'
  if (status === '干净') return 'blue'
  return 'green'
}

function toFiniteNumber(value: ApiNumeric | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : 0
  }
  return 0
}

function hasFiniteNumber(value: ApiNumeric | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value))
  }
  return false
}

function formatInteger(value: ApiNumeric) {
  if (!hasFiniteNumber(value)) {
    return '--'
  }
  return toFiniteNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 0,
  })
}

function formatNumber(value: ApiNumeric) {
  return hasFiniteNumber(value) ? toFiniteNumber(value).toFixed(2) : '--'
}

function formatPercent(value: ApiNumeric) {
  return hasFiniteNumber(value) ? `${toFiniteNumber(value).toFixed(2)}%` : '--'
}

function formatRatio(value: ApiNumeric) {
  const numericValue = toFiniteNumber(value)
  return hasFiniteNumber(value) && numericValue > 0
    ? numericValue.toFixed(2)
    : '--'
}

function formatDuration(seconds: ApiNumeric) {
  const numericSeconds = toFiniteNumber(seconds)
  if (!hasFiniteNumber(seconds) || numericSeconds <= 0) {
    return '--'
  }
  if (numericSeconds < 60) {
    return `${Math.round(numericSeconds)}s`
  }
  if (numericSeconds < 3600) {
    return `${Math.round(numericSeconds / 60)}min`
  }
  if (numericSeconds < 86400) {
    return `${Math.round(numericSeconds / 3600)}h`
  }
  return `${Math.round(numericSeconds / 86400)}d`
}

function formatDurationNullable(seconds: ApiNumeric | null) {
  return seconds == null ? '--' : formatDuration(seconds)
}

function formatTtl(value: ApiNumeric) {
  const numericValue = toFiniteNumber(value)
  if (!hasFiniteNumber(value) || numericValue <= 0) {
    return '--'
  }
  if (numericValue < 1000) {
    return `${numericValue}ms`
  }
  if (numericValue < 60_000) {
    return `${(numericValue / 1000).toFixed(1)}s`
  }
  if (numericValue < 3_600_000) {
    return `${Math.round(numericValue / 60_000)}min`
  }
  return `${Math.round(numericValue / 3_600_000)}h`
}

function formatUnixSeconds(value: ApiNumeric) {
  const numericValue = toFiniteNumber(value)
  if (!hasFiniteNumber(value) || numericValue <= 0) {
    return '--'
  }
  return new Date(numericValue * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNullableDateTime(value: string | null) {
  if (!value) {
    return '--'
  }
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
