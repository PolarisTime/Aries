import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUOTE_REGIONS,
  resolveQuoteRegions,
} from '@/constants/quote-regions'

describe('resolveQuoteRegions（取价地区动态取值）', () => {
  it('后端下发地区时按原顺序返回，不再使用内置默认值', () => {
    expect(resolveQuoteRegions(['南京', '杭州'])).toEqual(['南京', '杭州'])
  })

  it('后端未下发（undefined/null）时回退内置默认地区', () => {
    expect(resolveQuoteRegions(undefined)).toEqual([...DEFAULT_QUOTE_REGIONS])
    expect(resolveQuoteRegions(null)).toEqual([...DEFAULT_QUOTE_REGIONS])
  })

  it('后端下发空数组或全为空白时回退内置默认地区', () => {
    expect(resolveQuoteRegions([])).toEqual([...DEFAULT_QUOTE_REGIONS])
    expect(resolveQuoteRegions(['', '   '])).toEqual([...DEFAULT_QUOTE_REGIONS])
  })

  it('剔除空白项并对重复地区去重', () => {
    expect(resolveQuoteRegions([' 南京 ', '南京', '', '杭州'])).toEqual([
      '南京',
      '杭州',
    ])
  })

  it('返回新数组，调用方修改不会污染内置默认值', () => {
    const regions = resolveQuoteRegions([])
    regions.push('广州')

    expect(DEFAULT_QUOTE_REGIONS).not.toContain('广州')
    expect(resolveQuoteRegions([])).toEqual([...DEFAULT_QUOTE_REGIONS])
  })
})
