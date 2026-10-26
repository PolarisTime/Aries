import { CloseOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import type {
  ModuleActionDefinition,
  ModuleOverviewItem,
} from '@/types/module-page'
import { ModuleActionButton } from '@/views/modules/components/ModuleActionButton'

interface Props {
  selectedCount: number
  /**
   * 勾选口径的合计（重量 / 金额 …）。
   *
   * <p>来自 `buildScopedOverview` 的 `scopeKey === 'selection'` 项；口径文案（「已选 N 项」）
   * 由本横幅自己的「已选择 N 项」承担，所以这里只渲染指标、不再渲染 `scope`。</p>
   */
  overviewItems: ModuleOverviewItem[]
  /** 勾选后才可用的批量动作（导出选中 / 批量审核 / 批量反审核 / 批量删除） */
  actions: ModuleActionDefinition[]
  onAction?: (action: ModuleActionDefinition) => void
  onClear: () => void
}

/**
 * 勾选状态横幅 —— 列表页唯一一处表达"当前勾了什么"的地方。
 *
 * <p>为什么需要：勾选状态原本散在工具栏右侧（一个「已选择 N 项」小胶囊 + ✕ + ⟳），
 * 与筛选区那个「重置」上下叠着、各占一小块；批量动作仍留在工具栏里，用户看不出
 * "这些按钮只对勾选行生效"。现在按 ProTable 的 `tableAlertRender` 形态做成整条浅蓝横幅：
 * 左侧「已选择 N 项 + 已选合计」，右侧批量动作 + 清除选择，勾选一出现就横贯一行，
 * 勾选一清空就整条消失。</p>
 *
 * <p>`role="status"` + `aria-live="polite"` **只加在左侧摘要上**：勾选/取消要播报数量变化，
 * 但用礼貌级别（每次点行都触发，`alert` 会打断读屏当前朗读）；右侧动作区不进 live region ——
 * 把按钮放进会被反复播报的实时区域里，读屏用户每点一行都要把一排按钮再听一遍。</p>
 */
export function ModuleSelectionAlert({
  selectedCount,
  overviewItems,
  actions,
  onAction,
  onClear,
}: Props) {
  const { t } = useTranslation()
  if (selectedCount <= 0) return null

  return (
    <div className="module-selection-alert">
      <div
        className="module-selection-alert-summary"
        role="status"
        aria-live="polite"
      >
        <span className="module-selection-alert-count">
          {t('common.selected', { count: selectedCount })}
        </span>
        {overviewItems.map((item) => (
          <span className="module-selection-alert-metric" key={item.label}>
            <span>{item.label}：</span>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>
      <div className="module-selection-alert-actions">
        {actions.map((action) => (
          <ModuleActionButton
            key={action.key || action.label}
            action={action}
            onAction={onAction}
          />
        ))}
        <Button
          type="text"
          className="module-selection-alert-clear"
          icon={<CloseOutlined />}
          onClick={onClear}
        >
          {t('common.clearSelection')}
        </Button>
      </div>
    </div>
  )
}
