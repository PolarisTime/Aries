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
  /**
   * 重置筛选。业务列表页**不再传**：重置已回到筛选区尾部（与它作用的筛选条件同排），
   * 避免与右侧刷新按钮的两个圆形箭头图标并排造成误点。
   */
  onReset?: () => void
  extra?: ReactNode
  /** 筛选状态提示（「已筛选 N 项 · 清空筛选」），渲染在右侧状态区。 */
  filterSummary?: ReactNode
  /**
   * 页面级动作（打印 / 附件 / 单据流 …）。
   *
   * <p>**批量动作也在这里**：「导出选中 N 条 / 批量审核 / 批量反审核 / 批量删除」由
   * `BusinessGridContent` 合并进本 prop（`toolbarActionList`）。它们只在有勾选时才会生成，
   * 所以未勾选时工具栏不会多出禁用按钮；勾选后原地出现，用户不用再往表格上方找横幅。</p>
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
