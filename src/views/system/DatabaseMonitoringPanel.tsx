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
          description="暂无监控数据"
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
            description="暂无监控数据"
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
  return (
    <div className="database-section-heading">
      <div>
        <Typography.Title level={5} className="database-section-title">
          数据库只读诊断
        </Typography.Title>
        <Typography.Text type="secondary">
          PostgreSQL 内置统计视图、可选慢 SQL 摘要与 Redis 只读指标
        </Typography.Text>
      </div>
      <Button
        size="small"
        loading={isFetching}
        icon={<ReloadOutlined />}
        onClick={onRefresh}
      >
        刷新
      </Button>
    </div>
  )
}

interface PostgresDiagnosticProps {
  monitoring: DatabaseMonitoring
}

function PostgresDiagnostic({ monitoring }: PostgresDiagnosticProps) {
  const isHealthy = monitoring.status === '正常'
  const overview = monitoring.overview ?? EMPTY_POSTGRES_OVERVIEW
  const activity = monitoring.activity ?? EMPTY_POSTGRES_ACTIVITY

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-heading">
        <div className="database-monitor-subsection-title">PostgreSQL 诊断</div>
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
            description={monitoring.status || 'PostgreSQL 监控不可用'}
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
      label: '连接使用',
      value: `${formatInteger(overview.activeConnections)} / ${formatInteger(overview.totalConnections)}`,
      extra: `活跃占比 ${formatPercent(connectionRate)}`,
    },
    {
      label: '锁等待',
      value: formatInteger(overview.lockWaitSessions),
      extra: `阻塞会话 ${formatInteger(overview.blockedSessions)}`,
    },
    {
      label: '长事务',
      value: formatInteger(overview.longTransactions),
      extra: `最长 ${formatDuration(overview.longestTransactionSeconds)}`,
    },
    {
      label: '缓存命中',
      value: formatPercent(overview.cacheHitRate),
      extra: `DB ${overview.databaseSize || '--'}`,
    },
    {
      label: '事务回滚',
      value: formatInteger(overview.xactRollback),
      extra: `回滚率 ${formatPercent(rollbackRate)}`,
    },
    {
      label: '死锁',
      value: formatInteger(overview.deadlocks),
      extra: `临时文件 ${formatInteger(overview.tempFiles)}`,
    },
    {
      label: '临时写入',
      value: formatDatabaseMemory(overview.tempBytes),
      extra: '来自 pg_stat_database',
    },
    {
      label: '运行时间',
      value: formatDuration(overview.uptimeSeconds),
      extra: `最长查询 ${formatDuration(overview.longestQuerySeconds)}`,
    },
  ]

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-title">健康摘要</div>
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
  const metrics = [
    {
      label: 'Active',
      value: formatInteger(activity.activeSessions),
      extra: '当前执行中的会话',
    },
    {
      label: 'Idle in tx',
      value: formatInteger(activity.idleInTransactionSessions),
      extra: '空闲未提交事务',
    },
    {
      label: '锁等待',
      value: formatInteger(activity.lockWaitSessions),
      extra: `阻塞 ${formatInteger(activity.blockedSessions)}`,
    },
    {
      label: '长事务',
      value: formatInteger(activity.longTransactions),
      extra: `最长 ${formatDuration(activity.longestTransactionSeconds)}`,
    },
  ]

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-title">当前活动</div>
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
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card size="small" title="表健康" className="database-monitor-card">
          <Table
            rowKey="tableName"
            dataSource={tableHealth}
            scroll={{ x: 820 }}
            columns={[
              {
                dataIndex: 'tableName',
                title: '表',
                width: 220,
                ellipsis: true,
              },
              {
                dataIndex: 'deadPct',
                title: '死元组率',
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
                title: '死元组',
                width: 90,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'autovacuumStatus',
                title: 'AutoVacuum',
                width: 110,
                render: (status: string) => (
                  <Tag color={autovacuumStatusColor(status)}>
                    {status || '未知'}
                  </Tag>
                ),
              },
              {
                dataIndex: 'vacuumTriggerRows',
                title: '触发阈值',
                width: 90,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'nModSinceAnalyze',
                title: '待分析',
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'seqScan',
                title: '顺扫',
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'heapCachePct',
                title: '缓存',
                width: 80,
                align: 'right',
                render: formatPercent,
              },
              {
                dataIndex: 'lastAutovacuum',
                title: '上次清理',
                width: 120,
                render: formatNullableDateTime,
              },
              {
                dataIndex: 'lastAutovacuumAgeSeconds',
                title: '清理间隔',
                width: 90,
                render: formatDurationNullable,
              },
              {
                dataIndex: 'autovacuumAdvice',
                title: '建议',
                width: 260,
                ellipsis: true,
              },
            ]}
            size="small"
            pagination={false}
            locale={{ emptyText: '暂无表健康数据' }}
          />
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card size="small" title="索引健康" className="database-monitor-card">
          <Table
            rowKey="indexName"
            dataSource={indexHealth}
            scroll={{ x: 760 }}
            columns={[
              {
                dataIndex: 'indexName',
                title: '索引',
                width: 260,
                ellipsis: true,
              },
              {
                dataIndex: 'tableName',
                title: '表',
                width: 160,
                ellipsis: true,
              },
              {
                dataIndex: 'size',
                title: '大小',
                width: 80,
                align: 'right',
              },
              {
                dataIndex: 'scans',
                title: '扫描',
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'valid',
                title: '状态',
                width: 80,
                render: (valid: boolean) => (
                  <Tag color={valid ? 'green' : 'red'}>
                    {valid ? '有效' : '无效'}
                  </Tag>
                ),
              },
            ]}
            size="small"
            pagination={false}
            locale={{ emptyText: '暂无索引健康数据' }}
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
  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-heading">
        <div className="database-monitor-subsection-title">慢 SQL 摘要</div>
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
                title: '次数',
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'totalMs',
                title: '总耗时ms',
                width: 100,
                align: 'right',
                render: formatNumber,
              },
              {
                dataIndex: 'avgMs',
                title: '平均ms',
                width: 90,
                align: 'right',
                render: formatNumber,
              },
              {
                dataIndex: 'rows',
                title: '行数',
                width: 80,
                align: 'right',
                render: formatInteger,
              },
              {
                dataIndex: 'cacheHitPct',
                title: '缓存命中',
                width: 90,
                align: 'right',
                render: formatPercent,
              },
            ]}
            size="small"
            pagination={false}
            locale={{ emptyText: '暂无慢 SQL 摘要' }}
          />
        </Card>
      ) : (
        <Card className="database-monitor-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={queryStats.status || '未启用 pg_stat_statements'}
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
  const isHealthy =
    redis.status === '正常' || redis.status.toUpperCase() === 'UP'
  const metrics = [
    {
      label: '内存占用',
      value: formatDatabaseMemory(redis.memory.usedMemory),
      extra: `峰值 ${formatDatabaseMemory(redis.memory.usedMemoryPeak)}`,
    },
    {
      label: '内存上限',
      value:
        toFiniteNumber(redis.memory.maxMemory) > 0
          ? formatDatabaseMemory(redis.memory.maxMemory)
          : '未设置',
      extra: `碎片率 ${formatRatio(redis.memory.fragmentationRatio)}`,
    },
    {
      label: '实时 OPS',
      value: formatInteger(redis.throughput.instantaneousOpsPerSec),
      extra: `累计命令 ${formatInteger(redis.throughput.totalCommandsProcessed)}`,
    },
    {
      label: '命中率',
      value: formatPercent(redis.throughput.hitRate),
      extra: `${formatInteger(redis.throughput.keyspaceHits)} / ${formatInteger(redis.throughput.keyspaceMisses)}`,
    },
    {
      label: '客户端',
      value: formatInteger(redis.clients.connectedClients),
      extra: `阻塞 ${formatInteger(redis.clients.blockedClients)} / 拒绝 ${formatInteger(redis.clients.rejectedConnections)}`,
    },
    {
      label: `DB ${redis.keyspace.database}`,
      value: `${formatInteger(redis.keyspace.keys)} keys`,
      extra: `过期 ${formatInteger(redis.keyspace.expires)} / TTL ${formatTtl(redis.keyspace.avgTtlMs)}`,
    },
    {
      label: 'Key 变化',
      value: `${formatInteger(redis.memory.evictedKeys)} 淘汰`,
      extra: `${formatInteger(redis.memory.expiredKeys)} 已过期`,
    },
    {
      label: '持久化',
      value: redis.persistence.rdbLastBgsaveStatus || '未知',
      extra: `AOF ${redis.persistence.aofEnabled ? redis.persistence.aofLastBgrewriteStatus : '未开启'} / RDB ${formatUnixSeconds(redis.persistence.rdbLastSaveTime)}`,
    },
  ]

  return (
    <div className="database-monitor-subsection">
      <div className="database-monitor-subsection-heading">
        <div className="database-monitor-subsection-title">Redis 运行监控</div>
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
