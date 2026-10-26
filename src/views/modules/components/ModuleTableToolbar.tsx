import { DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTableUtilities } from '@/components/ModuleTableUtilities'
import type { ModuleActionDefinition } from '@/types/module-page'
import {
  isExportAction,
  ModuleActionButton,
} from '@/views/modules/components/ModuleActionButton'

const EMPTY_TOOLBAR_ACTIONS: never[] = []

function isCreateAction(action: ModuleActionDefinition) {
  return action.key === 'create' || action.key?.startsWith('create_')
}

interface Props {
  canCreate: boolean
  canExport: boolean
  loading: boolean
  exporting: boolean
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  /** 重置筛选（按钮渲染在右侧状态区最右端，见 ModuleTableUtilities 的 onReset） */
  onReset?: () => void
  extra?: ReactNode
  /** 筛选状态提示（「已筛选 N 项 · 清空筛选」），渲染在右侧状态区。 */
  filterSummary?: ReactNode
  /**
   * 页面级动作（打印 / 附件 / 单据流 …）。
   *
   * <p>**批量动作不在这里**：「导出选中 N 条 / 批量审核 / 批量反审核 / 批量删除」只在有勾选时
   * 才有意义，由表格上方的「已选择 N 项」横幅（`ModuleSelectionAlert`）承载 —— 横幅出现时
   * 它们才出现，工具栏因此只剩"不依赖勾选"的动作，右侧状态区只留刷新与重置。</p>
   */
  toolbarActions?: ModuleActionDefinition[]
  onAction?: (action: ModuleActionDefinition) => void
}

export function ModuleTableToolbar({
  canCreate,
  canExport,
  loading,
  exporting,
  onCreate,
  onExport,
  onRefresh,
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
        {toolbarActions.map((action) =>
          isCreateAction(action) ? null : (
            <ModuleActionButton
              key={action.key || action.label}
              action={action}
              onAction={onAction}
            />
          ),
        )}
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
        isFetching={loading}
        onRefresh={onRefresh}
        onReset={onReset}
      />
    </div>
  )
}
