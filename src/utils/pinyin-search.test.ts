import { describe, expect, it } from 'vitest'
import { createStructuredMaterialFilterOption } from './pinyin-search'

const filterMaterial = createStructuredMaterialFilterOption()

const material = (brand: string) => ({
  brand,
  material: 'HRB400E',
  category: '直条',
  spec: '18',
  length: '9米',
})

describe('createStructuredMaterialFilterOption', () => {
  it('使用 zh 搜索时只命中首字母为 zh 的品牌', () => {
    expect(filterMaterial('zh', material('中杭'))).toBe(true)
    expect(filterMaterial('zh', material('中天'))).toBe(false)
    expect(filterMaterial('zh', material('中新'))).toBe(false)
  })

  it('保留完整拼音和拼音前缀搜索', () => {
    expect(filterMaterial('zhonghang', material('中杭'))).toBe(true)
    expect(filterMaterial('yi', material('益海'))).toBe(true)
  })
})
