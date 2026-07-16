import { DeleteOutlined } from '@ant-design/icons'
import type { ProColumns } from '@ant-design/pro-components/es/table'
import { Button, Col, Row, Statistic } from 'antd'
import { useTranslation } from 'react-i18next'
import type {
  RefreshTokenRecord,
  RefreshTokenSummaryData,
} from '@/api/session-management'
import { AppProTable } from '@/components/AppProTable'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { createPaginationConfig } from '@/hooks/usePaginationConfig'

interface Props {
  title?: string
  canEdit: boolean
  columns: ProColumns<RefreshTokenRecord>[]
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
  title,
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
    <AppProTable<RefreshTokenRecord>
      rowKey="id"
      columns={columns}
      dataSource={tokens}
      loading={isLoading}
      scroll={{ x: 1400 }}
      headerTitle={title}
      toolBarRender={() => [
        <SystemTableToolbar
          key="session-toolbar"
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
        </SystemTableToolbar>,
      ]}
      tableExtraRender={() => (
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
      )}
      pagination={createPaginationConfig({
        current: currentPage,
        pageSize,
        total: totalElements,
        onChange: onPageChange,
        t,
      })}
    />
  )
}
