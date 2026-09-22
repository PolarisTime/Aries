import dayjs from 'dayjs'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'

export type PriceFloatMode = 'ADD' | 'SUBTRACT'

/**
 * 规整日期为 `YYYY-MM-DD`：
 * 兼容 dayjs 对象、ISO 字符串（含时间）与 `YYYY年M月D日` 等展示格式；无法解析时返回空串。
 */
export function normalizeDateValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : ''
  }
  if (value instanceof Date) {
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
  }
  const text = String(value).trim()
  if (!text) return ''
  const direct = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`
  const cn = /^(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(text)
  if (cn) {
    return `${cn[1]}-${cn[2].padStart(2, '0')}-${cn[3].padStart(2, '0')}`
  }
  const parsed = dayjs(text)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
}

/** 按 2 位小数四舍五入（与后端金额精度口径一致）。 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * 按项目浮动约定计算单价：ADD 加价、SUBTRACT 减价；未配置浮动则原价。
 * 幅度缺失或非有限值时按原价处理。
 */
export function applyNetPriceFloat(
  netPrice: number,
  mode: PriceFloatMode | undefined,
  value: number | undefined,
): number {
  if ((mode === 'ADD' || mode === 'SUBTRACT') && Number.isFinite(value)) {
    const delta = Number(value)
    return round2(mode === 'SUBTRACT' ? netPrice - delta : netPrice + delta)
  }
  return round2(netPrice)
}

/** 从行情匹配结果构建索引：优先按 materialId，其次按 品牌|类别|材质|规格|长度。 */
export function buildNetPriceIndex(rows: MaterialPriceMatch[]): {
  byId: Map<string, number>
  byKey: Map<string, number>
} {
  const byId = new Map<string, number>()
  const byKey = new Map<string, number>()
  for (const row of rows) {
    if (row.price == null) continue
    const price = Number(row.price)
    if (!Number.isFinite(price)) continue
    if (row.materialId != null) byId.set(String(row.materialId), price)
    byKey.set(matchKey(row), price)
  }
  return { byId, byKey }
}

/** 解析某明细行的网价：先按 materialId 命中，否则按商品维度键命中。 */
export function resolveNetPrice(
  item: ModuleLineItem,
  index: { byId: Map<string, number>; byKey: Map<string, number> },
): number | undefined {
  const materialId = String(item.materialId ?? '').trim()
  if (materialId) {
    const byMaterialId = index.byId.get(materialId)
    if (byMaterialId !== undefined) return byMaterialId
  }
  return index.byKey.get(itemMatchKey(item))
}

function matchKey(row: {
  brand?: string | null
  category?: string | null
  material?: string | null
  spec?: string | null
  length?: string | null
}): string {
  return [
    row.brand ?? '',
    row.category ?? '',
    row.material ?? '',
    row.spec ?? '',
    row.length ?? '',
  ].join('|')
}

function itemMatchKey(item: ModuleLineItem): string {
  return matchKey({
    brand: item.brand as string | undefined,
    category: item.category as string | undefined,
    material: item.material as string | undefined,
    spec: item.spec as string | undefined,
    length: item.length as string | undefined,
  })
}
