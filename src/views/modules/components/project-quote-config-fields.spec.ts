import { describe, expect, it } from 'vitest'
import { varietyKeyOf } from '@/views/price-compare/core'
import varietiesJson from '@/views/price-compare/data/varieties.json'
import type { Variety } from '@/views/price-compare/types'
import {
  brandCategoriesFromTreeValue,
  brandCategoriesToTreeValue,
  buildBrandCategoryTree,
  buildProductTree,
  formatTreeValueLabel,
  productsFromTreeValue,
  productsToTreeValue,
} from './project-quote-config-fields'

/**
 * 「比价配置」树形控件的扁平值 ↔ 树勾选值转换。
 *
 * <p>后端契约不变：品牌 × 品种仍是 `Record<品牌, 品类[]>`（缺键/空数组 = 全部），
 * 商品仍是 `类别|材质|规格|长度` 键数组（空 = 全部）。控件内部用「最大全选前缀」压缩标签，
 * 保存前再展开成四段键。这组用例锁的就是这两个方向，避免出现「界面显示已选、保存却是空」
 * 或「勾一个父节点存了半个类别」。</p>
 */

const CATEGORIES = ['螺纹钢', '盘螺']
const VARIETIES: Variety[] = (varietiesJson as Variety[]).slice(0, 40)

describe('品牌 × 品种树', () => {
  it('树结构：品牌为父、品种为叶，父节点值就是品牌名', () => {
    const tree = buildBrandCategoryTree(['中天', '亚新'], CATEGORIES)
    expect(tree.map((node) => node.value)).toEqual(['中天', '亚新'])
    expect(tree[0].children?.map((node) => node.value)).toEqual([
      '中天|螺纹钢',
      '中天|盘螺',
    ])
  })

  it('存储值 → 勾选值：缺键/空数组/全选都提升为品牌父节点', () => {
    expect(brandCategoriesToTreeValue(undefined, ['中天'], CATEGORIES)).toEqual(
      ['中天'],
    )
    expect(
      brandCategoriesToTreeValue({ 中天: [] }, ['中天'], CATEGORIES),
    ).toEqual(['中天'])
    expect(
      brandCategoriesToTreeValue(
        { 中天: ['螺纹钢', '盘螺'] },
        ['中天'],
        CATEGORIES,
      ),
    ).toEqual(['中天'])
  })

  it('存储值 → 勾选值：部分选中的品牌落到叶子', () => {
    expect(
      brandCategoriesToTreeValue(
        { 中天: ['盘螺'] },
        ['中天', '亚新'],
        CATEGORIES,
      ),
    ).toEqual(['中天|盘螺', '亚新'])
  })

  it('勾选值 → 存储值：勾品牌写空数组（= 全部品种），勾叶子写具体品种', () => {
    expect(brandCategoriesFromTreeValue(['中天'])).toEqual({ 中天: [] })
    expect(brandCategoriesFromTreeValue(['中天|盘螺'])).toEqual({
      中天: ['盘螺'],
    })
    expect(
      brandCategoriesFromTreeValue(['中天', '亚新|盘螺', '亚新|螺纹钢']),
    ).toEqual({ 中天: [], 亚新: ['盘螺', '螺纹钢'] })
  })

  it('品牌被清空（一个都没勾）时返回空对象，语义回到「不限制」', () => {
    expect(brandCategoriesFromTreeValue([])).toEqual({})
  })
})

describe('商品规格树', () => {
  const tree = buildProductTree(VARIETIES)
  const allLeaves = VARIETIES.map((item) => varietyKeyOf(item))

  it('树按 类别 → 材质 → 规格 → 长度 分层，叶子是四段商品键', () => {
    expect(tree.length).toBeGreaterThan(0)
    const category = tree[0]
    expect(category.children?.length).toBeGreaterThan(0)
    const material = category.children?.[0]
    expect(material?.value.split('|')).toHaveLength(2)
    const spec = material?.children?.[0]
    expect(spec?.value.split('|')).toHaveLength(3)
    const leaf = spec?.children?.[0]
    expect(leaf?.value.split('|')).toHaveLength(4)
    expect(leaf?.children).toBeUndefined()
  })

  it('空值表示全部商品：勾选值提升到顶层类别', () => {
    expect(productsToTreeValue(undefined, tree)).toEqual(
      tree.map((node) => node.value),
    )
    expect(productsToTreeValue([], tree)).toEqual(
      tree.map((node) => node.value),
    )
  })

  it('某个类别下全部叶子都选中时提升为该类别，避免 26 个标签刷屏', () => {
    const category = tree[0]
    const leaves =
      category.children?.flatMap(
        (material) =>
          material.children?.flatMap(
            (spec) => spec.children?.map((leaf) => leaf.value) ?? [],
          ) ?? [],
      ) ?? []
    expect(productsToTreeValue(leaves, tree)).toContain(category.value)
  })

  it('勾选值 → 商品键：父节点展开成全部叶子（后端只认四段键）', () => {
    const category = tree[0]
    const keys = productsFromTreeValue([category.value], tree)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(key.split('|')).toHaveLength(4)
    }
  })

  it('往返一致：存储的键 → 勾选值 → 键，结果完全还原', () => {
    const keys = allLeaves.slice(0, 6)
    const treeValue = productsToTreeValue(keys, tree)
    expect(productsFromTreeValue(treeValue, tree).sort()).toEqual(
      [...keys].sort(),
    )
  })
})

describe('标签文案', () => {
  it('品牌 × 品种用「·」连接，商品键用空格连接', () => {
    expect(formatTreeValueLabel('中天|盘螺', 'brand-category')).toBe(
      '中天 · 盘螺',
    )
    expect(formatTreeValueLabel('中天', 'brand-category')).toBe('中天')
    expect(formatTreeValueLabel('螺纹钢|HRB400E|10|9米', 'product')).toBe(
      '螺纹钢 HRB400E 10 9米',
    )
  })
})
