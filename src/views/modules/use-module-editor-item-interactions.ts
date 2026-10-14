import { useState } from 'react'
import { applyEditorLineItemOrder } from '@/module-system/adapter/module-adapter-editor'
import { removeEditorLineItems } from '@/module-system/editor/module-editor-line-item-removal'
import type { ModuleLineItem } from '@/types/module-page'

interface Props {
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  /** 是否允许拖动排序(判定见 canReorderModuleEditorItems: 只读/模块显式禁用时为 false)。 */
  canReorderItems: boolean
}

/**
 * 编辑器明细行的行级交互: 选中/删除 + 整行长按拖动排序。
 *
 * <p>拖动排序已从「HTML5 draggable 的手柄列」换成共享的整行长按拖动
 * ({@link @/components/table/row-drag}): 不占单独的拖动列, 行序变化只回调新的 id 顺序,
 * 由这里写回行模型数组 —— 后端口径是「items 数组顺序即最终顺序」, 保存时按数组顺序下发。</p>
 */
export function useModuleEditorItemInteractions({
  items,
  setItems,
  canReorderItems,
}: Props) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  const clearSelectedItems = () => {
    setSelectedItemIds([])
  }

  const removeSelectedItems = () => {
    if (!selectedItemIds.length) return
    setItems((prev) => removeEditorLineItems(prev, selectedItemIds))
    setSelectedItemIds([])
  }

  /**
   * 拖动落位 / 键盘 Alt+↑↓ 落位后写回行模型。
   *
   * <p>只按 id 重排数组, 不改行字段: 服务端按 id 复用实体并以数组下标重编 `line_no`。</p>
   */
  const handleRowReorder = (nextIds: string[]) => {
    if (!canReorderItems) return
    setItems((prev) => applyEditorLineItemOrder(prev, nextIds))
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedItemIds(checked ? items.map((item) => item.id) : [])
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId),
    )
  }

  return {
    clearSelectedItems,
    handleRowReorder,
    handleSelectAll,
    handleSelectItem,
    removeSelectedItems,
    selectedItemIds,
  }
}
