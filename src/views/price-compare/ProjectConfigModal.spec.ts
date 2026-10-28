// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createDraft, draftToConfig } from './project-config-draft'
import type { ProjectConfig, Variety } from './types'

const varieties: Variety[] = [
  {
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
    label: 'HRB400E 12 9米',
  },
]

const brandOptions = ['中天', '沙钢', '永钢']

function baseConfig(designatedBrands?: string[]): ProjectConfig {
  return {
    brands: [{ name: '中天', freight: 30 }],
    lengthPremium: 30,
    hrb400eFallback: false,
    designatedBrands,
  }
}

describe('ProjectConfigModal 指定品牌映射', () => {
  it('createDraft 读取 config.designatedBrands', () => {
    const draft = createDraft(baseConfig(['沙钢']), brandOptions, varieties)
    expect(draft.designatedBrands).toEqual(['沙钢'])
  })

  it('draftToConfig 将指定品牌保存到 config.designatedBrands', () => {
    const draft = createDraft(baseConfig(['沙钢']), brandOptions, varieties)
    const next = draftToConfig(
      { ...draft, designatedBrands: ['中天', '永钢'] },
      varieties,
    )
    expect(next.designatedBrands).toEqual(['中天', '永钢'])
  })

  it('指定品牌为空时归一化为 undefined', () => {
    const draft = createDraft(baseConfig(['沙钢']), brandOptions, varieties)
    const next = draftToConfig({ ...draft, designatedBrands: [] }, varieties)
    expect(next.designatedBrands).toBeUndefined()
  })

  it('旧配置无 designatedBrands 时草稿为空数组且可兼容保存', () => {
    const legacy: ProjectConfig = {
      brands: [],
      lengthPremium: 30,
      hrb400eFallback: false,
    }
    const draft = createDraft(legacy, brandOptions, varieties)
    expect(draft.designatedBrands).toEqual([])
    expect(draftToConfig(draft, varieties).designatedBrands).toBeUndefined()
  })
})

/**
 * 守卫: 「未配置过品种的品牌」默认值必须是**数据里出现过的类别全选**，不是写死的四类。
 * 数据里出现新类别（探针「H型钢」）时，草稿默认值必须自动包含它。
 */
describe('ProjectConfigModal 品种默认值随数据派生', () => {
  const varietiesWithNewCategory: Variety[] = [
    ...varieties,
    {
      category: 'H型钢',
      material: 'Q235',
      spec: 200,
      length: '12米',
      label: 'Q235 200 12米',
    },
  ]

  it('createDraft 给未配置品种的品牌填「数据里出现过的类别全选」', () => {
    const draft = createDraft(
      baseConfig(),
      brandOptions,
      varietiesWithNewCategory,
    )
    expect(draft.categoryMap.中天).toEqual(['螺纹钢', 'H型钢'])
  })

  it('数据新增类别后, 该品牌全选保存时仍归一为「不下发」(全量即缺省)', () => {
    const draft = createDraft(
      baseConfig(),
      brandOptions,
      varietiesWithNewCategory,
    )
    // 默认全选 → 保存时不应把「全选」写成显式清单, 否则以后再加类别会被旧快照挡掉
    expect(
      draftToConfig(draft, varietiesWithNewCategory).brands[0].categories,
    ).toBeUndefined()
  })

  it('只勾掉新类别后, 保存的是显式清单', () => {
    const draft = createDraft(
      baseConfig(),
      brandOptions,
      varietiesWithNewCategory,
    )
    const next = draftToConfig(
      { ...draft, categoryMap: { ...draft.categoryMap, 中天: ['螺纹钢'] } },
      varietiesWithNewCategory,
    )
    expect(next.brands[0].categories).toEqual(['螺纹钢'])
  })
})
