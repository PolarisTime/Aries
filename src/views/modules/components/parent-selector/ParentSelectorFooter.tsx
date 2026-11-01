import { CheckOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import type { ParentSelectorTranslator } from '../useModuleParentSelectorOverlay'

export interface ParentSelectorFooterProps {
  confirmDisabled: boolean
  /** 导入进行中：确认按钮 loading，重复点击被 hook 忽略。 */
  confirmLoading?: boolean
  /** 导入进行中禁止取消：避免「弹层关了但明细随后又回填」。 */
  cancelDisabled?: boolean
  onCancel: () => void
  onConfirm: () => void
  summary: string
  t: ParentSelectorTranslator
}

/**
 * 选单弹层动作区：取消 / 确认导入（左）+ 已选摘要（右）。
 *
 * <p>顺序按视觉从左到右排列，DOM 顺序与视觉顺序保持一致（不用 CSS `order` 调换，
 * 否则键盘 Tab 顺序会与看到的顺序相反）。摘要只是说明文字，放在按钮之后、由
 * `margin-left: auto` 推到行尾。</p>
 *
 * <p>动作区的左内边距与「已选单据」面板的内容左边界对齐（见 workspace-overlay.css 的
 * `.parent-selector-top-actions`），让上下两块在视觉上同一条竖线上。</p>
 */
export function ParentSelectorFooter({
  confirmDisabled,
  confirmLoading = false,
  // 导入进行中默认同时锁取消：两者是一把 in-flight 锁的两面
  cancelDisabled = confirmLoading,
  onCancel,
  onConfirm,
  summary,
  t,
}: ParentSelectorFooterProps) {
  return (
    <div className="parent-selector-footer">
      <div className="parent-selector-footer-buttons">
        <Button disabled={cancelDisabled} onClick={onCancel}>
          {t('modules.parentSelector.cancel')}
        </Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          loading={confirmLoading}
          disabled={confirmDisabled || confirmLoading}
          onClick={onConfirm}
        >
          {t('modules.parentSelector.confirmImport')}
        </Button>
      </div>
      <span className="parent-selector-footer-summary">{summary}</span>
    </div>
  )
}
