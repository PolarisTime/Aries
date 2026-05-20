import {
  CheckCircleOutlined,
  DownloadOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Flex from 'antd/es/flex'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Typography from 'antd/es/typography'
import type { ReactNode } from 'react'
import type { ModuleActionDefinition } from '@/types/module-page'
import { resolveModuleActionIcon } from '@/views/modules/module-action-icons'

interface Props {
  canCreate: boolean
  canExport: boolean
  total: number
  loading: boolean
  exporting: boolean
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  extra?: ReactNode
  toolbarActions?: ModuleActionDefinition[]
  onAction?: (action: ModuleActionDefinition) => void
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
}

export function ModuleTableToolbar({
  canCreate,
  canExport,
  total,
  loading,
  exporting,
  onCreate,
  onExport,
  onRefresh,
  extra,
  toolbarActions = [],
  onAction,
  isFetchingNextPage = false,
  hasNextPage = false,
}: Props) {
  return (
    <Flex
      align="center"
      justify="space-between"
      wrap
      gap="small"
      className="mb-4"
    >
      <Space wrap>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            新建
          </Button>
        )}
        {toolbarActions.map((action) => {
          if (action.label === '新增' || action.label.includes('新增')) {
            return null // Already handled by canCreate
          }
          return (
            <Button
              key={action.label}
              type={action.type === 'primary' ? 'primary' : 'default'}
              danger={action.danger}
              disabled={action.disabled}
              loading={action.loading}
              icon={
                action.label === '导出' ? (
                  <DownloadOutlined />
                ) : (
                  resolveModuleActionIcon(action.label)
                )
              }
              onClick={() => onAction?.(action)}
            >
              {action.label}
            </Button>
          )
        })}
        {canExport && !toolbarActions.some((a) => a.label === '导出') && (
          <Button
            icon={<DownloadOutlined />}
            onClick={onExport}
            loading={exporting}
          >
            导出
          </Button>
        )}
        {extra}
      </Space>
      <Space size="middle">
        {isFetchingNextPage ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />}
              size="small"
            />
            <span style={{ marginLeft: 6 }}>加载中...</span>
          </Typography.Text>
        ) : !hasNextPage && total > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
            <span style={{ marginLeft: 6 }}>已加载全部数据</span>
          </Typography.Text>
        ) : null}
        <Typography.Text type="secondary">共 {total} 条</Typography.Text>
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        />
      </Space>
    </Flex>
  )
}
