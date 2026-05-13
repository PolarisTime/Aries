import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Space from 'antd/es/space'
import Statistic from 'antd/es/statistic'
import Table from 'antd/es/table'
import type { ColumnsType } from 'antd/es/table'
import type {
  RefreshTokenRecord,
  RefreshTokenSummaryData,
} from '@/api/session-management'

interface Props {
  canEdit: boolean
  columns: ColumnsType<RefreshTokenRecord>
  currentPage: number
  isLoading: boolean
  keyword: string
  pageSize: number
  summary: RefreshTokenSummaryData | undefined
  tokens: RefreshTokenRecord[]
  totalElements: number
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onRefresh: () => void
  onRevokeAll: () => void
  onPageChange: (page: number, pageSize: number) => void
}

export function SessionManagementCard({
  canEdit,
  columns,
  currentPage,
  isLoading,
  keyword,
  pageSize,
  summary,
  tokens,
  totalElements,
  onKeywordChange,
  onSearch,
  onRefresh,
  onRevokeAll,
  onPageChange,
}: Props) {
  return (
    <Card
      title="会话管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索 Token ID / IP / 设备信息"
            style={{ width: 320 }}
            allowClear
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onSearch={onSearch}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          {canEdit && (
            <Button danger icon={<DeleteOutlined />} onClick={onRevokeAll}>
              清除全部
            </Button>
          )}
        </Space>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic title="在线人数" value={summary?.onlineUsers ?? 0} />
        </Col>
        <Col span={8}>
          <Statistic title="在线设备" value={summary?.onlineSessions ?? 0} />
        </Col>
        <Col span={8}>
          <Statistic title="有效会话" value={summary?.activeSessions ?? 0} />
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={tokens}
        loading={isLoading}
        size="middle"
        scroll={{ x: 1400 }}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalElements,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
      />
    </Card>
  )
}
