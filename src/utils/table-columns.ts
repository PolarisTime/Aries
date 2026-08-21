/**
 * 表格列顺序合并与列显隐切换的共享工具：
 * 业务网格与编辑器行项目两处表格复用同一规则，避免行为漂移。
 */
export interface MergeColumnOrderOptions {
  /** 追加到末尾的固定列（如操作列），保证始终排在业务数据之后。 */
  tailId?: string
  /** 剔除保存顺序中已不存在于当前列集合的非法 id。 */
  filterInvalid?: boolean
}

export function mergeColumnOrder(
  allIds: string[],
  savedOrder: string[],
  options?: MergeColumnOrderOptions,
): string[] {
  const validIds = options?.filterInvalid ? new Set(allIds) : undefined
  const merged = validIds
    ? savedOrder.filter((id) => validIds.has(id))
    : [...savedOrder]
  const ordered = new Set(merged)
  for (const id of allIds) {
    if (!ordered.has(id)) {
      merged.push(id)
    }
  }
  const tailId = options?.tailId
  if (tailId) {
    const index = merged.indexOf(tailId)
    if (index >= 0 && index !== merged.length - 1) {
      merged.splice(index, 1)
      merged.push(tailId)
    }
  }
  return merged
}

/** 切换某列的显隐状态：隐藏过的恢复默认显示，可见的标记为隐藏。 */
export function toggleColumnVisibility(
  columnVisibility: Record<string, boolean>,
  key: string,
): Record<string, boolean> {
  const next = { ...columnVisibility }
  if (next[key] === false) {
    delete next[key]
  } else {
    next[key] = false
  }
  return next
}
