import { afterEach, describe, expect, it } from 'vitest'
import { QUERY_KEYS } from '@/constants/query-keys'
import { DEFAULT_QUOTE_REGIONS } from '@/constants/quote-regions'
import { queryClient } from '@/lib/query-client'
import { readMasterOptionRequirements } from '@/module-system/core/master-option-requirement-tag'
import { getQuoteRegionOptions } from './module-option-resolvers'

/** 只写入本解析器读取的那一段，避免为 runtime-config 造一整份无关配置。 */
function seedRuntimeQuoteRegions(quoteRegions: string[]): void {
  queryClient.setQueryData(QUERY_KEYS.runtimeConfig, {
    business: { quoteRegions },
  })
}

describe('getQuoteRegionOptions', () => {
  afterEach(() => {
    queryClient.removeQueries({ queryKey: QUERY_KEYS.runtimeConfig })
  })

  it('有缓存时按 runtime-config 的地区清单映射为 label/value', () => {
    seedRuntimeQuoteRegions(['杭州', '上海', '宁波'])

    expect(getQuoteRegionOptions()).toEqual([
      { label: '杭州', value: '杭州' },
      { label: '上海', value: '上海' },
      { label: '宁波', value: '宁波' },
    ])
  })

  it('缓存为空（页面未加载 runtime-config）时回退到默认取价地区，而不是空数组', () => {
    queryClient.removeQueries({ queryKey: QUERY_KEYS.runtimeConfig })

    const options = getQuoteRegionOptions()

    expect(options.length).toBeGreaterThan(0)
    expect(options.map((option) => option.value)).toEqual([
      ...DEFAULT_QUOTE_REGIONS,
    ])
  })

  it('后端下发空清单时同样回退到默认取价地区', () => {
    seedRuntimeQuoteRegions([])

    expect(getQuoteRegionOptions().map((option) => option.value)).toEqual([
      ...DEFAULT_QUOTE_REGIONS,
    ])
  })

  it('trim / 去空 / 去重，且不产生空 label 或空 value', () => {
    seedRuntimeQuoteRegions(['杭州', ' 杭州 ', '', '   ', '上海', '杭州'])

    const options = getQuoteRegionOptions()

    expect(options).toEqual([
      { label: '杭州', value: '杭州' },
      { label: '上海', value: '上海' },
    ])
    for (const option of options) {
      expect(option.label.trim()).not.toBe('')
      expect(String(option.value).trim()).not.toBe('')
    }
  })

  it('不打 master-options 需求标记（数据来自 runtime-config，不是主数据接口）', () => {
    expect(readMasterOptionRequirements(getQuoteRegionOptions)).toBeUndefined()
  })
})
