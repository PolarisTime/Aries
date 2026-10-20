import { ReloadOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * 列表工具栏右侧的「已选条数 / 清空选择 / 刷新」通用区块。
 *
 * <p>项目资料页、物流方资料页、主数据页、销售合同页的这段 JSX 原本各自复制了一份
 * （react-doctor 报 `duplicate-jsx-subtree`），无障碍属性（`aria-live`、`aria-label`）
 * 与类名只维护一份，避免各页面各自漂移。</p>
 *
 * <p>清空按钮有两种历史写法：文案「✕」与图标 `CloseOutlined`；模块表工具栏还允许
 * 不传 `onClearSelection`（不给清空入口）。两者都用可选 props 表达，渲染出的 DOM 与原来一致。</p>
 */
export interface ModuleTableUtilitiesProps {
  /**
   * 插在「已选条数」左侧的状态提示（目前是「已筛选 N 项 · 清空筛选」）。
   *
   * <p>原先筛选项提示单独占一行，只有 150px 宽却把筛选区顶高一整行；
   * 两个都是「当前生效状态」的入口，放在一起既省一行又便于一并清除。</p>
   */
  leading?: ReactNode
  selectedCount: number
  onClearSelection?: (() => void) | undefined
  /** 传入后清空按钮改用图标呈现（模块表工具栏的历史写法），不传则用「✕」文案。 */
  clearSelectionIcon?: ReactNode
  isFetching: boolean
  onRefresh: () => void
}

export function ModuleTableUtilities({
  leading,
  selectedCount,
  onClearSelection,
  clearSelectionIcon,
  isFetching,
  onRefresh,
}: ModuleTableUtilitiesProps) {
  const { t } = useTranslation()

  return (
    <div className="module-table-utilities">
      {leading}
      {selectedCount > 0 ? (
        <>
          <span className="module-table-selected-count" aria-live="polite">
            {t('common.selected', { count: selectedCount })}
          </span>
          {onClearSelection ? (
            <Tooltip title={t('common.clearSelection')}>
              <Button
                size="small"
                type="text"
                className="module-table-clear-selection-button"
                aria-label={t('common.clearSelection')}
                {...(clearSelectionIcon ? { icon: clearSelectionIcon } : {})}
                onClick={onClearSelection}
              >
                {clearSelectionIcon ? null : '✕'}
              </Button>
            </Tooltip>
          ) : null}
        </>
      ) : null}
      <Tooltip title={t('common.refresh')}>
        <Button
          type="text"
          className="module-table-refresh-button"
          aria-label={t('common.refresh')}
          icon={<ReloadOutlined />}
          loading={isFetching}
          onClick={onRefresh}
        />
      </Tooltip>
    </div>
  )
}
