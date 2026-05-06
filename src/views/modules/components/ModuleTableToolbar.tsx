import { Button, Flex, Space, Typography } from 'antd'
import { PlusOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import type { ModuleActionDefinition } from '@/types/module-page'

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
  onAction?: (label: string) => void
}

export function ModuleTableToolbar({
  canCreate, canExport, total, loading,
  exporting, onCreate, onExport, onRefresh,
  extra,
  toolbarActions = [],
  onAction,
}: Props) {
  return (
    <Flex
      align="center"
      justify="space-between"
      wrap
      gap="small"
      style={{ marginBottom: 16 }}
    >
      <Space wrap>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>新建</Button>
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
              icon={action.label === '导出' ? <DownloadOutlined /> : undefined}
              onClick={() => onAction?.(action.label)}
            >
              {action.label}
            </Button>
          )
        })}
        {canExport && !toolbarActions.some((a) => a.label === '导出') && (
          <Button icon={<DownloadOutlined />} onClick={onExport} loading={exporting}>导出</Button>
        )}
        {extra}
      </Space>
      <Space size="middle">
        <Typography.Text type="secondary">共 {total} 条</Typography.Text>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} size="small" />
      </Space>
    </Flex>
  )
}
