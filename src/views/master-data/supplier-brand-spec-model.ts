import type { SupplierPriceSpecRow } from '@/api/market/supplier-price-lists'
import {
  normalizeSupplierBrandSpecs,
  type SupplierBrandSpecItem,
  supplierBrandSpecKey,
} from '@/api/master/supplier-brand-specs'
import { asString } from '@/utils/type-narrowing'

/**
 * 供应商「品牌规格配置」的口径 —— 穿梭框控件与报价表过滤共用这一处。
 *
 * <p>三条规则必须只有一个实现，否则「配置了却不生效」或「全选却写进几百条」这类问题
 * 会在两个出口各错一遍：</p>
 * <ol>
 *   <li><b>默认全量</b>：某品牌没有显式条目 = 按商品资料里该品牌的全量组合报价；</li>
 *   <li><b>全选等价于未配置</b>：勾满全部组合时不写条目（{@link applyBrandSpecSelection}），
 *       否则每次保存都往库里灌一份等价于"全量"的快照，商品资料一更新它就过期；</li>
 *   <li><b>显式配置是商品资料的真子集</b>：已停用/删除的商品组合不在穿梭框里，
 *       确认时按"当前商品资料"重算，不会凭旧配置保留已经取不到的商品组合。</li>
 * </ol>
 */

/**
 * 品牌列表归一：接受表单/记录里的任意值，返回去空白、去空项的字符串数组。
 *
 * <p>「经营品牌」在多处出现（表单字段、供应商记录、保存载荷），归一规则必须只有这一处 ——
 * 两处各写一份 trim/过滤，配置范围与保存载荷就会在空串、前后空白这些边界上分叉。</p>
 */
export function brandListOf(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const brands: string[] = []
  for (const entry of value) {
    const brand = asString(entry).trim()
    if (brand) brands.push(brand)
  }
  return brands
}

/** 配置维度排序：品牌 → 类别 → 材质 → 规格 → 定尺。保存载荷与界面列序共用。 */ export function compareSupplierBrandSpecs(
  left: SupplierBrandSpecItem,
  right: SupplierBrandSpecItem,
): number {
  return (
    left.brandName.localeCompare(right.brandName) ||
    left.category.localeCompare(right.category) ||
    left.material.localeCompare(right.material) ||
    left.spec - right.spec ||
    left.length.localeCompare(right.length)
  )
}

/** 条目展示文案：`直条 · HRB400E · 12 · 9米`。 */
export function supplierBrandSpecLabelOf(item: SupplierBrandSpecItem): string {
  return [item.category, item.material, String(item.spec), item.length].join(
    ' · ',
  )
}

/**
 * 某品牌在商品资料里的全部组合（穿梭框左栏数据源）。
 *
 * <p>只取该品牌、四段文案齐全的记录：缺类别/材质/定尺的商品无法落成一条合法配置
 * （后端 NOT NULL），放进穿梭框只会让用户选中一条保存时被 422 拒掉的组合。</p>
 */
export function brandSpecOptionsOf(
  rows: readonly SupplierPriceSpecRow[],
  brandName: string,
): SupplierBrandSpecItem[] {
  const brand = brandName.trim()
  if (!brand) return []
  const items: SupplierBrandSpecItem[] = []
  for (const row of rows) {
    if ((row.brand ?? '').trim() !== brand) continue
    const category = (row.category ?? '').trim()
    const material = (row.material ?? '').trim()
    const length = (row.length ?? '').trim()
    if (!category || !material || !length) continue
    items.push({ brandName: brand, category, material, spec: row.spec, length })
  }
  return normalizeSupplierBrandSpecs(items).sort(compareSupplierBrandSpecs)
}

/** 默认全选：某品牌全部组合的键。 */
export function defaultBrandSpecKeys(
  options: readonly SupplierBrandSpecItem[],
): string[] {
  return options.map(supplierBrandSpecKey)
}

/** 选择结果是否等于"全部组合"（全选 = 未配置）。 */
export function isFullBrandSpecSelection(
  options: readonly SupplierBrandSpecItem[],
  keys: readonly string[],
): boolean {
  if (options.length === 0) return false
  const selected = new Set(keys)
  return options.every((option) => selected.has(supplierBrandSpecKey(option)))
}

/** 某品牌当前应显示为"已选"的键：有显式配置取配置，否则默认全选。 */
export function selectedBrandSpecKeys(
  items: readonly SupplierBrandSpecItem[] | undefined,
  brandName: string,
  options: readonly SupplierBrandSpecItem[],
): string[] {
  const brand = brandName.trim()
  const configured = (items ?? []).filter(
    (item) => item.brandName.trim() === brand,
  )
  if (configured.length === 0) return defaultBrandSpecKeys(options)
  // 只保留当前商品资料里还存在的键：已下架组合在穿梭框里无从显示，
  // 保留它们会让"已选"数与可见项数对不上（详情见 applyBrandSpecSelection）。
  const available = new Set(defaultBrandSpecKeys(options))
  return configured
    .map(supplierBrandSpecKey)
    .filter((key) => available.has(key))
}

/**
 * 确认某品牌的选择结果，返回新的整份草稿（不改入参）。
 *
 * <p>{@code keys} 为空表示"该品牌一个规格都不报"—— 后端没有这个状态（没有条目就等于全量），
 * 所以控件层会拦住这种确认（见 `SupplierBrandSpecField` 的确定按钮）；真发生时空选择按
 * "不写条目"处理，即回落到全量。</p>
 */
export function applyBrandSpecSelection(
  items: readonly SupplierBrandSpecItem[] | undefined,
  brandName: string,
  options: readonly SupplierBrandSpecItem[],
  keys: readonly string[],
): SupplierBrandSpecItem[] {
  const brand = brandName.trim()
  const keep = (items ?? []).filter((item) => item.brandName.trim() !== brand)
  const optionByKey = new Map(
    options.map((option) => [supplierBrandSpecKey(option), option]),
  )
  const selected = [...new Set(keys)].flatMap((key) => {
    const option = optionByKey.get(key)
    return option ? [option] : []
  })
  // 空选择 / 全选都等价于"未配置"：不写条目，回落到按商品资料全量
  if (selected.length === 0) return [...keep].sort(compareSupplierBrandSpecs)
  if (isFullBrandSpecSelection(options, selected.map(supplierBrandSpecKey))) {
    return [...keep].sort(compareSupplierBrandSpecs)
  }
  return [...keep, ...selected].sort(compareSupplierBrandSpecs)
}

/**
 * 保存载荷：只保留当前**经营品牌**范围内的条目（后端会校验 brandName 属于该供应商的品牌，
 * 越界会 422）；去重后按 {@link compareSupplierBrandSpecs} 稳定排序，让 PUT 载荷可复现。
 */
export function supplierBrandSpecPayload(
  items: readonly SupplierBrandSpecItem[] | undefined,
  brandNames: readonly string[],
): SupplierBrandSpecItem[] {
  const allowed = new Set(
    brandNames.map((brand) => brand.trim()).filter(Boolean),
  )
  const scoped = (items ?? []).filter((item) =>
    allowed.has(item.brandName.trim()),
  )
  return normalizeSupplierBrandSpecs(scoped).sort(compareSupplierBrandSpecs)
}

/** 某品牌的展示状态：`null` = 未配置（默认全量），否则是显式配置的条目数。 */
export function configuredBrandSpecCount(
  items: readonly SupplierBrandSpecItem[] | undefined,
  brandName: string,
): number | null {
  const brand = brandName.trim()
  const count = (items ?? []).filter(
    (item) => item.brandName.trim() === brand,
  ).length
  return count === 0 ? null : count
}
