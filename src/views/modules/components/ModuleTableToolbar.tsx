import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Space, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleActionDefinition } from '@/types/module-page'

const EMPTY_TOOLBAR_ACTIONS: never[] = []

import { resolveModuleActionIcon } from '@/module-system/module-action-icons'

interface Props {
  canCreate: boolean
  canExport: boolean
  selectedCount: number
  loading: boolean
  exporting: boolean
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  extra?: ReactNode
  toolbarActions?: ModuleActionDefinition[]
  onAction?: (action: ModuleActionDefinition) => void
}

export function ModuleTableToolbar({
  canCreate,
  canExport,
  selectedCount,
  loading,
  exporting,
  onCreate,
  onExport,
  onRefresh,
  extra,
  toolbarActions = EMPTY_TOOLBAR_ACTIONS,
  onAction,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className="module-table-toolbar">
      <Space wrap className="module-table-actions">
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
      <div className="module-table-utilities">
        {selectedCount > 0 ? (
          <span className="module-table-selected-count" aria-live="polite">
            {t('common.selected', { count: selectedCount })}
          </span>
        ) : null}
        <Tooltip title={t('common.refresh')}>
          <Button
            type="text"
            className="module-table-refresh-button"
            aria-label={t('common.refresh')}
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          />
        </Tooltip>
      </div>
    </div>
  )
}
