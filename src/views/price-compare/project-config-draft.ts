import type { Brand, ProjectConfig, Variety } from './types'

/** 品牌未配置运费时的缺省运费（元/吨）。 */
export const DEFAULT_FREIGHT = 30

/** 品种唯一键：同一「类别|材质|规格|长度」视为同一个可选商品。 */
export const varietyKey = (item: Variety) =>
  `${item.category}|${item.material}|${item.spec}|${item.length}`

/**
 * 比价「配置」弹层的草稿：**只剩每品牌运费**。
 *
 * <p>2026-11-16 用户定稿：品牌、品种、规格、定尺加价、抗震代取、指定品牌都在
 * 「项目资料」维护；比价配置的 PUT 也只写运费（`{brands:[{brandName,freight}], remark?}`）。
 * 因此草稿不再承载品牌增删/品类/商品等结构，避免弹层里出现第二个配置点。</p>
 *
 * <p>品牌清单是**只读**的：来自 `GET /quote-project-configs/{id}`（后端由项目资料派生）。</p>
 */
export type FreightDraft = {
  /** 品牌清单（只读，顺序即服务端顺序）。 */
  brands: string[]
  /** 品牌 → 运费（元/吨）。 */
  freightMap: Record<string, number>
}

/** 项目配置 → 运费草稿（缺省运费补齐 `DEFAULT_FREIGHT`）。 */
export function createFreightDraft(config: ProjectConfig): FreightDraft {
  const brands = config.brands.map((brand) => brand.name)
  const freightMap: Record<string, number> = {}
  for (const brand of config.brands) {
    freightMap[brand.name] = brand.freight
  }
  return { brands, freightMap }
}

/**
 * 运费草稿 → 项目配置。
 *
 * <p>只改回运费；品牌清单在没有草稿值时才回退 `DEFAULT_FREIGHT`。其它字段原样保留 ——
 * 前端不参与它们的保存（PUT 只发运费），但本地状态仍用于渲染。</p>
 */
export function applyFreightDraft(
  config: ProjectConfig,
  draft: FreightDraft,
): ProjectConfig {
  const brands: Brand[] = draft.brands.map((name) => {
    const current = config.brands.find((brand) => brand.name === name)
    return {
      name,
      freight: draft.freightMap[name] ?? current?.freight ?? DEFAULT_FREIGHT,
      ...(current?.categories ? { categories: current.categories } : {}),
    }
  })
  return { ...config, brands }
}

/** 运费草稿是否与服务端配置不同（用于「有未保存改动」确认）。 */
export function isFreightDraftDirty(
  config: ProjectConfig,
  draft: FreightDraft,
): boolean {
  const current = createFreightDraft(config)
  if (current.brands.join('|') !== draft.brands.join('|')) return true
  return draft.brands.some(
    (name) => (current.freightMap[name] ?? 0) !== (draft.freightMap[name] ?? 0),
  )
}
