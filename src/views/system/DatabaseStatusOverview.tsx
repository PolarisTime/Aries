import { CloudServerOutlined, DatabaseOutlined } from '@ant-design/icons'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Descriptions from 'antd/es/descriptions'
import Row from 'antd/es/row'
import Skeleton from 'antd/es/skeleton'
import Statistic from 'antd/es/statistic'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import type { DatabaseStatus } from '@/api/database-admin'
import {
  formatDatabaseDateTime,
  formatDatabaseMemory,
} from '@/views/system/database-backup-view-utils'

interface ServiceCardProps {
  accent: string
  icon: React.ReactNode
  title: string
  version: string
  status: string
  summary: Array<{ title: string; value: number | string }>
  details: Array<{ label: string; value: string }>
}

function DatabaseServiceCard({
  accent,
  icon,
  title,
  version,
  status,
  summary,
  details,
}: ServiceCardProps) {
  const isHealthy = status === '正常' || status.toUpperCase() === 'UP'

  return (
    <Card size="small" className="database-service-card">
      <div className="database-service-card-header">
        <div className="database-service-icon"
          /* 动态背景色：accent 由父组件传入，对应不同服务类型 */
          style={{ background: accent }}>
          {icon}
        </div>
        <div className="database-service-title">
          <div className="database-service-name">{title}</div>
          <div className="database-service-version">{version}</div>
        </div>
        <Tag
          color={isHealthy ? 'green' : 'red'}
          className="database-status-tag"
        >
          {status}
        </Tag>
      </div>

      <div className="database-service-metrics">
        {summary.map((item) => (
          <Statistic
            key={item.title}
            title={item.title}
            value={item.value}
            className="database-service-metric"
            styles={{ content: { fontSize: 20 } }}
          />
        ))}
      </div>

      <Descriptions size="small" column={1} className="database-service-detail">
        {details.map((item) => (
          <Descriptions.Item key={item.label} label={item.label}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  )
}

interface Props {
  dbStatus?: DatabaseStatus
  loading: boolean
}

export function DatabaseStatusOverview({ dbStatus, loading }: Props) {
  const { t } = useTranslation()
  if (loading && !dbStatus) {
    return (
      <div className="database-status-section">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }

  return (
    <div className="database-status-section">
      <div className="database-section-heading">
        <div>
          <Typography.Title level={5} className="database-section-title">
            {t('system.databaseStatus.serviceOverview')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('system.databaseStatus.serviceOverviewDesc')}
          </Typography.Text>
        </div>
      </div>

      {dbStatus ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <DatabaseServiceCard
              accent="var(--theme-primary)"
              icon={<DatabaseOutlined />}
              title="PostgreSQL"
              version={dbStatus.postgres.version}
              status={dbStatus.postgres.status}
              summary={[
                { title: t('system.databaseStatus.dbSize'), value: dbStatus.postgres.databaseSize },
                { title: t('system.databaseStatus.tableCount'), value: dbStatus.postgres.tableCount },
                {
                  title: t('system.databaseStatus.activeConnections'),
                  value: `${dbStatus.postgres.activeConnections}/${dbStatus.postgres.maxConnections}`,
                },
              ]}
              details={[
                {
                  label: t('system.databaseStatus.address'),
                  value: `${dbStatus.postgres.host}:${dbStatus.postgres.port}`,
                },
                { label: t('system.databaseStatus.database'), value: dbStatus.postgres.database },
                ...(dbStatus.postgres.serverStartTime
                  ? [
                      {
                        label: t('system.databaseStatus.startTime'),
                        value: formatDatabaseDateTime(
                          dbStatus.postgres.serverStartTime,
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Col>
          <Col xs={24} xl={12}>
            <DatabaseServiceCard
              accent="var(--theme-error)"
              icon={<CloudServerOutlined />}
              title="Redis"
              version={dbStatus.redis.version}
              status={dbStatus.redis.status}
              summary={[
                {
                  title: t('system.databaseStatus.memUsage'),
                  value: formatDatabaseMemory(dbStatus.redis.usedMemory),
                },
                { title: t('system.databaseStatus.keyCount'), value: dbStatus.redis.totalKeys },
                { title: t('system.databaseStatus.hitRate'), value: `${dbStatus.redis.hitRate}%` },
              ]}
              details={[
                {
                  label: t('system.databaseStatus.address'),
                  value: `${dbStatus.redis.host}:${dbStatus.redis.port}`,
                },
                { label: t('system.databaseStatus.uptime'), value: dbStatus.redis.uptime },
                {
                  label: t('system.databaseStatus.clientConnections'),
                  value: `${dbStatus.redis.connectedClients} ${t('system.databaseStatus.connectionCount')}`,
                },
              ]}
            />
          </Col>
        </Row>
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} />
      )}
    </div>
  )
}
