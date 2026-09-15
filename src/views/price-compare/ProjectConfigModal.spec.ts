// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createDraft, draftToConfig } from './ProjectConfigModal'
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
