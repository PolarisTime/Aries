import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * 行内「上移 / 下移」按钮 —— 拖动排序的**单指针非拖动替代**(WCAG 2.2 SC 2.5.7)。
 *
 * <p>只提供键盘拖拽并不满足 SC 2.5.7: 该条要求"功能可用单指针、且无需执行拖动操作即可
 * 完成"。因此每个排序表面都必须有**可点击**的上移/下移入口 —— 鼠标点一下、键盘 Tab 过去
 * 按回车, 都能完成一次重排。行菜单(右键 / Shift+F10)只作为补充, 不能算替代: 它既要求
 * 指针是"次要键", 也不在做键盘用户的第一视线内。</p>
 *
 * <p>口径:</p>
 * <ul>
 *   <li>目标 ≥24×24(WCAG 2.5.8): 显式写成 minWidth/minHeight 24px, 不依赖主题尺寸;</li>
 *   <li>首项 / 末项用 `aria-disabled` 而不是原生 `disabled`: 按钮仍然可聚焦, 读屏用户能
 *       听到"上移, 已禁用"并知道边界在哪, 也能用方向键跳过;</li>
 *   <li>可访问名带行名(物料名 + 序号), 不含 id —— 同屏多行时才分得清是"哪一行的上移"。</li>
 * </ul>
 */
export interface RowReorderButtonsProps {
  /** 行的可读名(物料名 + 序号), 只用于可访问名与 tooltip, 不含 id。 */
  label: string
  canMoveUp: boolean
  canMoveDown: boolean
  /** 移动回调: -1 上移 / +1 下移。边界项不会触发。 */
  onMove: (delta: -1 | 1) => void
  className?: string
}

/** 按钮的命中区下限(WCAG 2.5.8): 24×24 CSS 像素。 */
export const ROW_REORDER_BUTTON_MIN_SIZE_PX = 24

export function RowReorderButtons({
  label,
  canMoveUp,
  canMoveDown,
  onMove,
  className,
}: RowReorderButtonsProps) {
  const { t } = useTranslation()
  const sizeStyle = {
    minHeight: ROW_REORDER_BUTTON_MIN_SIZE_PX,
    minWidth: ROW_REORDER_BUTTON_MIN_SIZE_PX,
  }
  return (
    <span
      className={['row-reorder-buttons', className].filter(Boolean).join(' ')}
    >
      <Button
        aria-disabled={!canMoveUp}
        aria-label={t('common.rowDragSort.moveUpAria', { row: label })}
        icon={<ArrowUpOutlined />}
        onClick={() => {
          if (canMoveUp) onMove(-1)
        }}
        size="small"
        style={sizeStyle}
        title={t('common.rowDragSort.moveUp')}
        type="text"
      />
      <Button
        aria-disabled={!canMoveDown}
        aria-label={t('common.rowDragSort.moveDownAria', { row: label })}
        icon={<ArrowDownOutlined />}
        onClick={() => {
          if (canMoveDown) onMove(1)
        }}
        size="small"
        style={sizeStyle}
        title={t('common.rowDragSort.moveDown')}
        type="text"
      />
    </span>
  )
}
