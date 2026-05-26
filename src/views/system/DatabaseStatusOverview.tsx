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
        <div className="database-service-icon" style={{ background: accent }}>
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
            服务概览
          </Typography.Title>
          <Typography.Text type="secondary">
            当前数据库组件在线状态与关键容量指标
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
                { title: '数据库大小', value: dbStatus.postgres.databaseSize },
                { title: '表数量', value: dbStatus.postgres.tableCount },
                {
                  title: '活跃连接',
                  value: `${dbStatus.postgres.activeConnections}/${dbStatus.postgres.maxConnections}`,
                },
              ]}
              details={[
                {
                  label: '地址',
                  value: `${dbStatus.postgres.host}:${dbStatus.postgres.port}`,
                },
                { label: '数据库', value: dbStatus.postgres.database },
                ...(dbStatus.postgres.serverStartTime
                  ? [
                      {
                        label: '启动时间',
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
                  title: '内存占用',
                  value: formatDatabaseMemory(dbStatus.redis.usedMemory),
                },
                { title: '键数量', value: dbStatus.redis.totalKeys },
                { title: '命中率', value: `${dbStatus.redis.hitRate}%` },
              ]}
              details={[
                {
                  label: '地址',
                  value: `${dbStatus.redis.host}:${dbStatus.redis.port}`,
                },
                { label: '运行时间', value: dbStatus.redis.uptime },
                {
                  label: '客户端',
                  value: `${dbStatus.redis.connectedClients} 个连接`,
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
