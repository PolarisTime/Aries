import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Flex from 'antd/es/flex'
import Pagination from 'antd/es/pagination'
import Space from 'antd/es/space'
import type { ReactNode } from 'react'
import type { ModuleActionDefinition } from '@/types/module-page'
import { resolveModuleActionIcon } from '@/views/modules/module-action-icons'

interface Props {
  canCreate: boolean
  canExport: boolean
  total: number
  currentPage: number
  pageSize: number
  selectedCount: number
  loading: boolean
  exporting: boolean
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  onPageChange: (page: number, pageSize: number) => void
  extra?: ReactNode
  toolbarActions?: ModuleActionDefinition[]
  onAction?: (action: ModuleActionDefinition) => void
}

export function ModuleTableToolbar({
  canCreate,
  canExport,
  total,
  currentPage,
  pageSize,
  selectedCount,
  loading,
  exporting,
  onCreate,
  onExport,
  onRefresh,
  onPageChange,
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
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={total}
          size="small"
          showSizeChanger={false}
          showTotal={(t) =>
            selectedCount > 0
              ? `已选 ${selectedCount} / 共 ${t} 条`
              : `共 ${t} 条`
          }
          onChange={onPageChange}
          itemRender={(_, type, originalElement) => {
            if (type === 'prev') return <a>上一页</a>
            if (type === 'next') return <a>下一页</a>
            return originalElement
          }}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          刷新
        </Button>
      </Space>
    </Flex>
  )
}
