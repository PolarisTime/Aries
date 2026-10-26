import { DownloadOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import type { ModuleActionDefinition } from '@/types/module-page'

/** 导出类动作：图标统一用下载图标，而不是按文案猜（`导出选中 3 条` 也命中）。 */
export function isExportAction(action: ModuleActionDefinition) {
  return action.key === 'export' || Boolean(action.key?.startsWith('export_'))
}

interface Props {
  action: ModuleActionDefinition
  onAction?: (action: ModuleActionDefinition) => void
}

/**
 * 模块动作按钮 —— 工具栏与「已选择 N 项」横幅共用同一份渲染。
 *
 * <p>为什么收敛到一处：同一批批量动作（导出选中 / 批量审核 / 批量删除）现在会出现在
 * 两个位置（工具栏、勾选横幅），图标、危险色、置灰原因 tooltip 各写一遍必然漂移
 * （"横幅里的反审核是红的、工具栏里不是"这类问题肉眼很难发现）。</p>
 */
export function ModuleActionButton({ action, onAction }: Props) {
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

  if (!action.tooltip) {
    return button
  }
  /*
   * 置灰按钮不能再获得鼠标事件（disabled 元素不派发 mouseenter），必须套一层 span
   * 才能让 Tooltip 在悬停/聚焦时说明限制原因。
   */
  return (
    <Tooltip title={action.tooltip}>
      <span className="module-table-action-tooltip-target">{button}</span>
    </Tooltip>
  )
}
