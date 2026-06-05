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
import { useTranslation } from 'react-i18next'
import type { ModuleActionDefinition } from '@/types/module-page'

const EMPTY_TOOLBAR_ACTIONS: never[] = []

import { resolveModuleActionIcon } from '@/module-system/module-action-icons'

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
  toolbarActions = EMPTY_TOOLBAR_ACTIONS,
  onAction,
}: Props) {
  const { t } = useTranslation()
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
            {t('common.create')}
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
            {t('common.export')}
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
          showTotal={(total) =>
            selectedCount > 0
              ? `${t('common.selected', { count: selectedCount })} / ${t('common.total', { count: total })}`
              : t('common.total', { count: total })
          }
          onChange={onPageChange}
          itemRender={(_, type, originalElement) => {
            if (type === 'prev')
              return <button type="button">{t('common.prevPage')}</button>
            if (type === 'next')
              return <button type="button">{t('common.nextPage')}</button>
            return originalElement
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          {t('common.refresh')}
        </Button>
      </Space>
    </Flex>
  )
}
