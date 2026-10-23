import { categoriesOf } from './core'
import type { Brand, ProjectConfig, Variety } from './types'

/** 品牌未配置运费时的缺省运费（元/吨）。 */
export const DEFAULT_FREIGHT = 30

/** 品种唯一键：同一「类别|材质|规格|长度」视为同一个可选商品。 */
export const varietyKey = (item: Variety) =>
  `${item.category}|${item.material}|${item.spec}|${item.length}`

export type ProjectConfigDraft = {
  brands: string[]
  freightMap: Record<string, number>
  categoryMap: Record<string, string[]>
  premium: number
  hrb400eFallback: boolean
  products: string[]
  designatedBrands: string[]
}

/**
 * 项目配置 → 表单草稿：补齐品牌运费/类别的缺省值，并把「未配置」归一化成默认值。
 *
 * <p>放在非组件模块：草稿映射是纯数据变换，弹窗组件只负责渲染与交互。</p>
 */
export function createDraft(
  config: ProjectConfig,
  brandOptions: string[],
  varieties: Variety[],
): ProjectConfigDraft {
  const names = config.brands.map((brand) => brand.name)
  const brandByName = new Map<string, Brand>()
  for (const brand of config.brands) {
    if (!brandByName.has(brand.name)) brandByName.set(brand.name, brand)
  }
  // 未配置过品种的品牌默认值 = 数据里出现过的类别全选(不再套写死的四类)
  const allCategories = categoriesOf(varieties)
  const freightMap: Record<string, number> = {}
  const categoryMap: Record<string, string[]> = {}
  for (const name of brandOptions) {
    const brand = brandByName.get(name)
    freightMap[name] = brand?.freight ?? DEFAULT_FREIGHT
    categoryMap[name] = brand?.categories ?? allCategories
  }
  return {
    brands: names.length ? names : brandOptions,
    freightMap,
    categoryMap,
    premium: config.lengthPremium,
    hrb400eFallback: config.hrb400eFallback,
    products: config.products?.length
      ? config.products
      : varieties.map(varietyKey),
    designatedBrands: config.designatedBrands ?? [],
  }
}

/** 表单草稿 → 项目配置：把「全选/全量」这类默认值还原成不下发的空值。 */
export function draftToConfig(
  draft: ProjectConfigDraft,
  varieties: Variety[],
): ProjectConfig {
  const allCategories = categoriesOf(varieties)
  const brands: Brand[] = draft.brands.map((name) => {
    const categories = draft.categoryMap[name] ?? allCategories
    const enabled =
      categories.length === 0 || categories.length === allCategories.length
        ? undefined
        : categories
    return {
      name,
      freight: draft.freightMap[name] ?? DEFAULT_FREIGHT,
      categories: enabled,
    }
  })
  return {
    brands,
    lengthPremium: draft.premium,
    hrb400eFallback: draft.hrb400eFallback,
    products:
      draft.products.length === varieties.length ? undefined : draft.products,
    designatedBrands: draft.designatedBrands.length
      ? draft.designatedBrands
      : undefined,
  }
}
