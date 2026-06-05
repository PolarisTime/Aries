import { DeleteOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Statistic from 'antd/es/statistic'
import type { ColumnsType } from 'antd/es/table'
import Table from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type {
  RefreshTokenRecord,
  RefreshTokenSummaryData,
} from '@/api/session-management'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { createPaginationConfig } from '@/hooks/usePaginationConfig'

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
  const { t } = useTranslation()
  return (
    <Card
      title={t('system.session.title')}
      extra={
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder={t('system.session.searchPlaceholder')}
          onKeywordChange={onKeywordChange}
          onSearch={onSearch}
          onRefresh={onRefresh}
        >
          {canEdit && (
            <Button danger icon={<DeleteOutlined />} onClick={onRevokeAll}>
              {t('system.session.revokeAll')}
            </Button>
          )}
        </SystemTableToolbar>
      }
    >
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.session.onlineUsers')}
            value={summary?.onlineUsers ?? 0}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.session.onlineDevices')}
            value={summary?.onlineSessions ?? 0}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.session.activeSessions')}
            value={summary?.activeSessions ?? 0}
          />
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
          t,
        })}
      />
    </Card>
  )
}
