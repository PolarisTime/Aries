import type { ModuleLineItem } from '@/types/module-page'

export interface RemoveEditorLineItemsOptions {
  /**
   * 来源分组 key：返回同一来源单据的分组键，删除时整组联动移除；
   * 返回空串表示该行不参与分组（只按行删除）。
   */
  sourceGroupKey?: (item: ModuleLineItem) => string
}

/**
 * 从明细中移除选中的行。
 *
 * <p>上游导入行占用的来源数量由服务端按「保存载荷里剩余的明细行」重新汇总：
 * 被删除的行不再出现在载荷中，其占用的来源数量随之释放，无需前端改写其它行的数量或
 * <code>_maxImportQuantity</code>；这也是「删除导入行」不应报错、也不应要求该行重新
 * 关联采购来源的原因。</p>
 *
 * <p>未选中任何行时原样返回入参（引用不变），调用方可据此跳过状态更新。</p>
 */
export function removeEditorLineItems(
  items: ModuleLineItem[],
  selectedItemIds: readonly string[],
  options: RemoveEditorLineItemsOptions = {},
): ModuleLineItem[] {
  if (!selectedItemIds.length) {
    return items
  }
  const selectedItemIdSet = new Set(selectedItemIds)
  const { sourceGroupKey } = options
  if (!sourceGroupKey) {
    return items.filter((item) => !selectedItemIdSet.has(item.id))
  }

  const selectedSourceGroupKeys = new Set<string>()
  for (const item of items) {
    if (!selectedItemIdSet.has(item.id)) continue
    const groupKey = sourceGroupKey(item)
    if (groupKey) selectedSourceGroupKeys.add(groupKey)
  }

  return items.filter((item) => {
    if (selectedItemIdSet.has(item.id)) return false
    const groupKey = sourceGroupKey(item)
    return !groupKey || !selectedSourceGroupKeys.has(groupKey)
  })
}
