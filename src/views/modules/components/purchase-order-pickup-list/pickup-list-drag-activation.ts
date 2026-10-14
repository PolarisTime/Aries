/**
 * 提货单曾把行拖动激活判定放在本文件, 现已提取为共享能力
 * (`@/components/table/row-drag`): 取消可见拖动手柄后"整行即拖动区"的放行口径
 * 必须全系统一致, 否则某张表会在按钮上误起拖、另一张表又不会。
 *
 * <p>这里只做转发, 保持既有引用与用例不变。</p>
 */
export {
  type ForwardedListeners,
  forwardDragListeners,
  guard,
  isRowDragBlockedTarget,
  type Listener,
} from '@/components/table/row-drag/row-drag-activation'
