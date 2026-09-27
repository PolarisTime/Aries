import { createEditorLineItemId } from '@/module-system/editor/module-editor-shared'
import type { ModuleLineItem } from '@/types/module-page'

export interface DuplicatedEditorLineItem<T extends ModuleLineItem> {
  /** 复制后的完整明细数组（副本紧跟源行下方）。 */
  items: T[]
  /** 新增行的 id。 */
  newItemId: string
  /** 新增行在数组中的下标。 */
  index: number
}

/**
 * 明细「复制本行」的纯数据层实现。
 *
 * <p>复制源行的全部字段值，只重新生成行 id（新行尚未落库，不能复用后端主键），
 * 并把副本插入到源行正下方，保持与「新增明细」相同的本地行语义。</p>
 *
 * <p>源行不存在时返回 <code>null</code>，调用方据此忽略本次操作而不是插入脏数据。</p>
 */
export function duplicateEditorLineItem<T extends ModuleLineItem>(
  items: readonly T[],
  itemId: string,
): DuplicatedEditorLineItem<T> | null {
  const index = items.findIndex((item) => item.id === itemId)
  if (index < 0) return null

  const newItemId = createEditorLineItemId()
  const duplicated = { ...items[index], id: newItemId }
  const nextItems = [
    ...items.slice(0, index + 1),
    duplicated,
    ...items.slice(index + 1),
  ]

  return { items: nextItems, newItemId, index: index + 1 }
}
