import { describe, expect, it } from 'vitest'
import {
  createPinyinFilterOption,
  createStructuredMaterialFilterOption,
} from './pinyin-search'

const filterMaterial = createStructuredMaterialFilterOption()
const filterPinyin = createPinyinFilterOption()

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

describe('createPinyinFilterOption', () => {
  it('支持中文原文、全拼与首字母索引', () => {
    expect(filterPinyin('', { label: '沙钢' })).toBe(true)
    expect(filterPinyin('沙', { label: '沙钢' })).toBe(true)
    expect(filterPinyin('shagang', { label: '沙钢' })).toBe(true)
    expect(filterPinyin('sg', { label: '沙钢' })).toBe(true)
    expect(filterPinyin('hg', { label: '河钢' })).toBe(true)
    expect(filterPinyin('sg', { label: '河钢' })).toBe(false)
  })

  it('多关键词空格分隔按 AND 匹配', () => {
    expect(filterPinyin('sha gang', { label: '沙钢' })).toBe(true)
    expect(filterPinyin('sha he', { label: '沙钢' })).toBe(false)
  })

  it('无 label 或 undefined option 时不误命中', () => {
    expect(filterPinyin('sg', undefined)).toBe(false)
    expect(filterPinyin('sg', {})).toBe(false)
  })
})
