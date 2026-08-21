import type { ModuleLineItem } from '@/types/module-page'

/** 解析“9米”/“12”/“-”等长度、规格文本中的数值，无法解析时排到最后。 */
function parseNumericValue(value: unknown): number {
  const match = String(value ?? '')
    .trim()
    .match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

function compareChineseText(a: unknown, b: unknown): number {
  return String(a ?? '').localeCompare(String(b ?? ''), 'zh-Hans-CN')
}

/**
 * 按商品资料的默认排序规则（材质 → 长度 → 品牌 → 规格）整理行项目顺序。
 * 与后端 MaterialSearchPolicy.DEFAULT_SORT 的字段顺序保持一致，
 * 长度、规格按其中的数值比较，“-”与空值排在末尾。
 */
export function sortItemsByMaterialDefault<T extends ModuleLineItem>(
  items: readonly T[],
): T[] {
  return items.toSorted(
    (left, right) =>
      compareChineseText(left.material, right.material) ||
      parseNumericValue(left.length) - parseNumericValue(right.length) ||
      compareChineseText(left.brand, right.brand) ||
      parseNumericValue(left.spec) - parseNumericValue(right.spec),
  )
}
