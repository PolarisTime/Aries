import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { createPaginationConfig } from '@/hooks/usePaginationConfig'
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
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
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder="搜索 Token ID / IP / 设备信息"
          onKeywordChange={onKeywordChange}
          onSearch={onSearch}
          onRefresh={onRefresh}
        >
          {canEdit && (
            <Button danger icon={<DeleteOutlined />} onClick={onRevokeAll}>
              清除全部
            </Button>
          )}
        </SystemTableToolbar>
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
        pagination={createPaginationConfig({
          current: currentPage,
          pageSize,
          total: totalElements,
          onChange: onPageChange,
        })}
      />
    </Card>
  )
}
