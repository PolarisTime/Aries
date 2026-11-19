import type { TreeSelectProps } from 'antd'
import { Segmented, Tag, TreeSelect, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { categoriesOf, varietyKeyOf } from '@/views/price-compare/core'
import varietiesJson from '@/views/price-compare/data/varieties.json'
import type { Variety } from '@/views/price-compare/types'

/**
 * 项目资料「比价配置」区的复合字段控件。
 *
 * <p>2026-11-16 用户定稿：**项目资料是品牌/品种/规格/加价/代取/指定品牌的唯一配置点**。
 * 2026-11-19 用户要求「重做这片区域的下拉选择」——原来品牌 × 品种是一排小 Select、
 * 商品规格是 26 项扁平多选（标签铺满半屏），扫读与勾选都费劲。现改为 antd 的
 * **树形多选（TreeSelect treeCheckable）**：层级即业务层级，勾父节点＝全选其子项，
 * 半选状态一目了然；标签按「品牌 · 品种」「类别 材质 规格 长度」显示，长列表折叠成 +N。</p>
 *
 * <p>存储口径没变（后端契约不动）：品种仍是 `Record<品牌, 品类[]>`（缺键/空数组 = 全部），
 * 商品仍是 `类别|材质|规格|长度` 键数组（空 = 全部），只在控件内部做
 * 「扁平值 ↔ 树勾选」的双向转换（`*ToTreeValue` / `*FromTreeValue` 是唯一转换出口）。</p>
 */

/** 树节点值分隔符：与商品键 `类别|材质|规格|长度` 同一分隔符，品牌/品类名里不会出现。 */
const SEP = '|'

export interface QuoteTreeNode {
  value: string
  title: string
  children?: QuoteTreeNode[]
}

/** 参考数据：与比价页 `usePriceCompareData` 的 metadata 同一份 JSON（不重复维护）。 */
const VARIETIES: Variety[] = (varietiesJson as Variety[]).map((item) => ({
  ...item,
  label: item.label.replace(/Φ\s*/g, '').replace(/\s+/g, ' ').trim(),
}))

/** 参与比价的商品键选项：`类别|材质|规格|长度`（与比价页保存口径一致）。 */
export const PROJECT_VARIETY_OPTIONS = VARIETIES.map((item) => ({
  label: `${item.category} ${item.material} ${item.spec} ${item.length}`,
  value: varietyKeyOf(item),
}))

/** 品牌 × 品种树：品牌为父节点，品种为叶子（父节点值 = 品牌名）。 */
export function buildBrandCategoryTree(
  brands: readonly string[],
  categories: readonly string[],
): QuoteTreeNode[] {
  return brands.map((brand) => ({
    value: brand,
    title: brand,
    children: categories.map((category) => ({
      value: `${brand}${SEP}${category}`,
      title: category,
    })),
  }))
}

/**
 * 存储值 → 树勾选值（只返回「最大已全选前缀」，让标签保持简短）。
 *
 * <p>空数组/缺键按业务口径表示「全部品种」，等价于勾中该品牌父节点。</p>
 */
export function brandCategoriesToTreeValue(
  record: Record<string, string[]> | undefined,
  brands: readonly string[],
  categories: readonly string[],
): string[] {
  const value: string[] = []
  for (const brand of brands) {
    const picked = (record?.[brand] ?? []).filter((item) =>
      categories.includes(item),
    )
    if (picked.length === 0 || picked.length === categories.length) {
      value.push(brand)
      continue
    }
    value.push(...picked.map((category) => `${brand}${SEP}${category}`))
  }
  return value
}

/** 树勾选值 → 存储值：父节点（品牌）表示该品牌全部品种（空数组）。 */
export function brandCategoriesFromTreeValue(
  values: readonly string[],
): Record<string, string[]> {
  const record: Record<string, string[]> = {}
  for (const value of values) {
    const index = value.indexOf(SEP)
    if (index < 0) {
      // 勾中品牌 = 全部品种；后出现的叶子不再覆盖（SHOW_PARENT 下二者不会并存）
      record[value] ??= []
      continue
    }
    const brand = value.slice(0, index)
    const category = value.slice(index + 1)
    if (record[brand] === undefined || record[brand].length > 0) {
      record[brand] = [...(record[brand] ?? []), category]
    }
  }
  return record
}

/** 商品树：类别 → 材质 → 规格 → 长度（叶子值 = 商品键）。 */
export function buildProductTree(
  varieties: readonly Variety[],
): QuoteTreeNode[] {
  const categories = new Map<string, Map<string, Map<string, Set<string>>>>()
  for (const item of varieties) {
    const materials = categories.get(item.category) ?? new Map()
    categories.set(item.category, materials)
    const specs = materials.get(item.material) ?? new Map()
    materials.set(item.material, specs)
    const lengths = specs.get(String(item.spec)) ?? new Set<string>()
    specs.set(String(item.spec), lengths)
    lengths.add(item.length)
  }
  return [...categories.entries()].map(([category, materials]) => ({
    value: category,
    title: category,
    children: [...materials.entries()].map(([material, specs]) => ({
      value: `${category}${SEP}${material}`,
      title: material,
      children: [...specs.entries()].map(([spec, lengths]) => ({
        value: `${category}${SEP}${material}${SEP}${spec}`,
        title: spec,
        children: [...lengths].map((length) => ({
          value: `${category}${SEP}${material}${SEP}${spec}${SEP}${length}`,
          title: length,
        })),
      })),
    })),
  }))
}

function collectLeafValues(node: QuoteTreeNode): string[] {
  if (!node.children?.length) {
    return [node.value]
  }
  return node.children.flatMap(collectLeafValues)
}

/** 存储的商品键 → 树勾选值：全部叶子都被选中时提升为父节点，标签才不会被 26 个键刷屏。 */
export function productsToTreeValue(
  keys: readonly string[] | undefined,
  tree: readonly QuoteTreeNode[],
): string[] {
  if (!keys?.length) {
    return tree.map((node) => node.value)
  }
  const selected = new Set(keys)
  const result: string[] = []
  const walk = (node: QuoteTreeNode) => {
    const leaves = collectLeafValues(node)
    if (leaves.every((leaf) => selected.has(leaf))) {
      result.push(node.value)
      return
    }
    if (node.children?.length) {
      node.children.forEach(walk)
    }
  }
  tree.forEach(walk)
  return result
}

/** 树勾选值 → 存储的商品键：父节点展开成它名下全部叶子（后端只认四段键）。 */
export function productsFromTreeValue(
  values: readonly string[],
  tree: readonly QuoteTreeNode[],
): string[] {
  const leaves: string[] = []
  const collect = (node: QuoteTreeNode): string[] =>
    node.children?.length ? node.children.flatMap(collect) : [node.value]
  const walk = (
    nodes: readonly QuoteTreeNode[],
    prefixes: readonly string[],
  ) => {
    for (const node of nodes) {
      const path = [...prefixes, node.value]
      if (values.includes(node.value) || values.includes(path.join(SEP))) {
        leaves.push(...collect(node))
        continue
      }
      if (node.children?.length) {
        walk(node.children, path)
      }
    }
  }
  walk(tree, [])
  return [...new Set(leaves)]
}

/** 标签文案：层级值用空格连接，品牌 × 品种用「·」连接。 */
export function formatTreeValueLabel(
  value: string,
  kind: 'brand-category' | 'product',
): string {
  const parts = value.split(SEP)
  if (kind === 'brand-category') {
    return parts.length > 1 ? `${parts[0]} · ${parts[1]}` : parts[0]
  }
  return parts.join(' ')
}

function treeTagRender(
  kind: 'brand-category' | 'product',
): TreeSelectProps['tagRender'] {
  return ({ label, value, closable, onClose, disabled }) => {
    /*
     * `value` 为空的是 antd 的「折叠剩余项」（maxTagCount=responsive 时产生）：
     * 它会走同一个 tagRender，若照常拼 label 会渲染出字面量 "undefined"。
     * 这种情况交回 antd 的默认占位（由 maxTagPlaceholder 决定）。
     */
    if (value === undefined || value === null) {
      return (
        <Tag closable={false} style={{ marginInlineEnd: 4 }}>
          {label}
        </Tag>
      )
    }
    return (
      <Tag
        closable={closable && !disabled}
        onClose={onClose}
        style={{ marginInlineEnd: 4 }}
        title={formatTreeValueLabel(String(value), kind)}
      >
        {formatTreeValueLabel(String(value), kind)}
      </Tag>
    )
  }
}

/** 品牌 × 品种：一棵树取代原来「每品牌一个小 Select」的矩阵。 */
export function ProjectQuoteBrandCategoriesField({
  value,
  onChange,
  disabled,
  label,
  brands,
}: {
  value?: Record<string, string[]>
  onChange?: (value: Record<string, string[]>) => void
  disabled?: boolean
  label: string
  /** 品牌清单来自同表单的「允许的品牌」字段（空 = 项目不限品牌，此时不渲染树）。 */
  brands: readonly string[]
}) {
  const { t } = useTranslation()
  const categories = useMemo(() => categoriesOf(VARIETIES), [])
  const treeData = useMemo(
    () => buildBrandCategoryTree(brands, categories),
    [brands, categories],
  )
  const checked = useMemo(
    () => brandCategoriesToTreeValue(value, brands, categories),
    [value, brands, categories],
  )

  if (brands.length === 0) {
    return (
      <Typography.Text type="secondary">
        {t('modules.pages.project.quoteBrandCategoriesEmpty')}
      </Typography.Text>
    )
  }

  return (
    <TreeSelect<string[]>
      aria-label={label}
      allowClear
      disabled={disabled}
      maxTagCount={6}
      maxTagPlaceholder={(omitted) => `+ ${omitted.length} …`}
      onChange={(next) => onChange?.(brandCategoriesFromTreeValue(next))}
      placeholder={t('modules.pages.project.quoteBrandCategoriesPlaceholder')}
      showSearch
      showCheckedStrategy={TreeSelect.SHOW_PARENT}
      /* 下拉不与控件同宽：整行宽度会让树铺满一屏，眼睛要横跨 1.4 米找勾选框 */
      styles={{ popup: { root: { width: 420 } } }}
      style={{ width: '100%' }}
      tagRender={treeTagRender('brand-category')}
      treeCheckable
      treeData={treeData}
      treeDefaultExpandAll
      value={checked}
    />
  )
}

/** 参与比价的商品规格：四层树（类别 → 材质 → 规格 → 长度），勾父节点即全选其下规格。 */
export function ProjectQuoteProductsField({
  value,
  onChange,
  disabled,
  label,
}: {
  value?: string[]
  onChange?: (value: string[]) => void
  disabled?: boolean
  label: string
}) {
  const { t } = useTranslation()
  const tree = useMemo(() => buildProductTree(VARIETIES), [])
  const checked = useMemo(() => productsToTreeValue(value, tree), [value, tree])

  return (
    <TreeSelect<string[]>
      aria-label={label}
      allowClear
      disabled={disabled}
      maxTagCount={5}
      maxTagPlaceholder={(omitted) => `+ ${omitted.length} …`}
      onChange={(next) => onChange?.(productsFromTreeValue(next, tree))}
      placeholder={t('modules.pages.project.quoteProductsPlaceholder')}
      showSearch
      showCheckedStrategy={TreeSelect.SHOW_PARENT}
      styles={{ popup: { root: { width: 420 } } }}
      style={{ width: '100%' }}
      tagRender={treeTagRender('product')}
      treeCheckable
      treeData={tree}
      value={checked}
    />
  )
}

/**
 * 抗震牌号（HRB400E）代取开关：boolean 值。
 *
 * <p>不复用通用 `segmented` 字段：通用控件把选项值 `String()` 化，表单里会变成字符串，
 * 而接口契约要求 boolean（见项目资料新字段 `quoteHrb400eFallback`）。</p>
 */
export function ProjectQuoteHrb400eFallbackField({
  value,
  onChange,
  disabled,
}: {
  value?: boolean
  onChange?: (value: boolean) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Segmented<boolean>
      disabled={disabled}
      onChange={(next) => onChange?.(next)}
      options={[
        {
          label: t('modules.pages.project.quoteHrb400eFallbackOn'),
          value: true,
        },
        {
          label: t('modules.pages.project.quoteHrb400eFallbackOff'),
          value: false,
        },
      ]}
      value={value ?? false}
    />
  )
}
