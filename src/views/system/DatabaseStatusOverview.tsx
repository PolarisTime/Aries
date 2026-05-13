import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
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

type ServiceCardProps = {
  accent: string
  title: string
  version: string
  status: string
  summary: Array<{ title: string; value: number | string }>
  details: Array<{ label: string; value: string }>
}

function DatabaseServiceCard({
  accent,
  title,
  version,
  status,
  summary,
  details,
}: ServiceCardProps) {
  return (
    <Card size="small" style={{ background: '#fafafa' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: '#fff',
          }}
        >
          <DatabaseOutlined />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{version}</div>
        </div>
        <Tag
          color={status === '正常' ? 'green' : 'red'}
          style={{ marginLeft: 'auto' }}
        >
          {status}
        </Tag>
      </div>
      <Row
        gutter={16}
        style={{
          marginBottom: 20,
          paddingBottom: 20,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {summary.map((item) => (
          <Col key={item.title} span={8}>
            <Statistic
              title={item.title}
              value={item.value}
              styles={{ content: { fontSize: 20 } }}
            />
          </Col>
        ))}
      </Row>
      <Descriptions size="small" column={1}>
        {details.map((item) => (
          <Descriptions.Item key={item.label} label={item.label}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  )
}

type Props = {
  dbStatus?: DatabaseStatus
  loading: boolean
  onRefresh: () => void
}

export function DatabaseStatusOverview({
  dbStatus,
  loading,
  onRefresh,
}: Props) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          数据库状态
        </Typography.Title>
        <Button
          size="small"
          loading={loading}
          icon={<ReloadOutlined />}
          onClick={onRefresh}
        >
          刷新
        </Button>
      </div>

      {dbStatus ? (
        <Row gutter={20}>
          <Col span={12}>
            <DatabaseServiceCard
              accent="linear-gradient(135deg, #1890ff, #096dd9)"
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
          <Col span={12}>
            <DatabaseServiceCard
              accent="linear-gradient(135deg, #ff4d4f, #cf1322)"
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
        <Skeleton active />
      )}
    </div>
  )
}
