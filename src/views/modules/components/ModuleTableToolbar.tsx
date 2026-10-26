import {
  CloseOutlined,
  DownloadOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Button, Space, Tooltip } from 'antd'
import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleActionDefinition } from '@/types/module-page'

const EMPTY_TOOLBAR_ACTIONS: never[] = []

import { ModuleTableUtilities } from '@/components/ModuleTableUtilities'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'

function isCreateAction(action: ModuleActionDefinition) {
  return action.key === 'create' || action.key?.startsWith('create_')
}

function isExportAction(action: ModuleActionDefinition) {
  return action.key === 'export' || action.key?.startsWith('export_')
}

interface Props {
  canCreate: boolean
  canExport: boolean
  selectedCount: number
  loading: boolean
  exporting: boolean
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  onClearSelection?: () => void
  /** 重置筛选（按钮渲染在右侧状态区最右端，见 ModuleTableUtilities 的 onReset） */
  onReset?: () => void
  extra?: ReactNode
  /** 筛选状态提示（「已筛选 N 项 · 清空筛选」），渲染在右侧状态区。 */
  filterSummary?: ReactNode
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
  onClearSelection,
  onReset,
  extra,
  filterSummary,
  toolbarActions = EMPTY_TOOLBAR_ACTIONS,
  onAction,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className="module-table-toolbar">
      <Space wrap className="module-table-actions" size={16}>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('common.create')}
          </Button>
        )}
        {toolbarActions.map((action) => {
          if (isCreateAction(action)) {
            return null
          }
          const button = (
            <Button
              type={action.type === 'primary' ? 'primary' : 'default'}
              danger={action.danger}
              disabled={action.disabled}
              loading={action.loading}
              icon={
                isExportAction(action) ? (
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
          const key = action.key || action.label
          if (!action.tooltip) {
            return <Fragment key={key}>{button}</Fragment>
          }
          /*
           * 置灰按钮不能再获得鼠标事件(disabled 元素不派发 mouseenter),
           * 必须套一层 span 才能让 Tooltip 在悬停/聚焦时说明限制原因。
           */
          return (
            <Tooltip key={key} title={action.tooltip}>
              <span className="module-table-action-tooltip-target">
                {button}
              </span>
            </Tooltip>
          )
        })}
        {canExport && !toolbarActions.some(isExportAction) && (
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
      <ModuleTableUtilities
        leading={filterSummary}
        selectedCount={selectedCount}
        onClearSelection={onClearSelection}
        clearSelectionIcon={<CloseOutlined />}
        isFetching={loading}
        onRefresh={onRefresh}
        onReset={onReset}
      />
    </div>
  )
}
