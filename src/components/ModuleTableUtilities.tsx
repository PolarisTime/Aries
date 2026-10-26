import { ReloadOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleResetButton } from '@/components/ModuleResetButton'

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
  /**
   * 已选条数；`0` 或缺省时不渲染胶囊。
   *
   * <p>业务列表页不再往这里传：勾选状态改由表格上方的「已选择 N 项」横幅
   * （`ModuleSelectionAlert`）表达，工具栏右侧只留筛选提示 / 刷新 / 重置。</p>
   */
  selectedCount?: number
  onClearSelection?: (() => void) | undefined
  /** 传入后清空按钮改用图标呈现（模块表工具栏的历史写法），不传则用「✕」文案。 */
  clearSelectionIcon?: ReactNode
  isFetching: boolean
  onRefresh: () => void
  /**
   * 传入时在区块最右端追加「重置」（用分隔线隔开）。
   *
   * <p>业务列表页把筛选区的重置按钮下移到这里：筛选区只放筛选条件，右侧不再有孤立按钮，
   * 而「重置 / 已选择 / 清除 / 刷新」都是"当前列表状态"的入口，同组更符合心智模型。
   * 放在最右端还有一个副作用好处 —— 勾选后「已选 N 项」出现时，重置不会跟着左右跳。</p>
   */
  onReset?: (() => void) | undefined
}

export function ModuleTableUtilities({
  leading,
  selectedCount = 0,
  onClearSelection,
  clearSelectionIcon,
  isFetching,
  onRefresh,
  onReset,
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
      {onReset ? (
        <>
          <span className="module-table-utilities-divider" aria-hidden="true" />
          <ModuleResetButton onClick={onReset} />
        </>
      ) : null}
    </div>
  )
}
