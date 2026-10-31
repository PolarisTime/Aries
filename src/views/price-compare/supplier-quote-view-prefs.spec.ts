// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  brandPrefsKey,
  cellIdOf,
  draftsKey,
  gridQueryKey,
  priceModeKey,
  readPriceMode,
  readViewMode,
  viewModeKey,
} from './supplier-quote-view-prefs'

afterEach(() => {
  window.localStorage.clear()
})

describe('供应商报价视图偏好(supplier-quote-view-prefs)', () => {
  it('各类本地存储键按供应商隔离且前缀互不冲突', () => {
    const supplierId = 'sup-1'
    expect(brandPrefsKey(supplierId)).toBe('aries:supplier-quote-prefs:sup-1')
    expect(viewModeKey(supplierId)).toBe('aries:supplier-quote-view:sup-1')
    expect(priceModeKey(supplierId)).toBe(
      'price-compare:supplier-price-mode:sup-1',
    )
    expect(draftsKey(supplierId)).toBe('aries:supplier-quote-drafts:sup-1')
    // 换供应商不会读到别人的键
    expect(viewModeKey('sup-2')).not.toBe(viewModeKey('sup-1'))
  })

  it('默认值: 品牌成列 + 手填价格', () => {
    expect(readViewMode('sup-1')).toBe('brands')
    expect(readPriceMode('sup-1')).toBe('manual')
  })

  it('读取已保存偏好, 非法值回落到默认值', () => {
    window.localStorage.setItem(viewModeKey('sup-1'), 'specs')
    window.localStorage.setItem(priceModeKey('sup-1'), 'base')
    expect(readViewMode('sup-1')).toBe('specs')
    expect(readPriceMode('sup-1')).toBe('base')

    window.localStorage.setItem(viewModeKey('sup-2'), 'unknown')
    window.localStorage.setItem(priceModeKey('sup-2'), 'BASE')
    expect(readViewMode('sup-2')).toBe('brands')
    expect(readPriceMode('sup-2')).toBe('manual')
  })

  it('单元格标识用不可见分隔符, 品牌名里的冒号不会产生歧义', () => {
    expect(cellIdOf('品牌:甲', 'row-1')).toBe('品牌:甲\u0000row-1')
    expect(cellIdOf('品牌', 'row:1')).toBe('品牌\u0000row:1')
    // 「品牌:甲 + row-1」与「品牌 + 甲:row-1」不会拼出同一个 id
    expect(cellIdOf('品牌:甲', 'row-1')).not.toBe(cellIdOf('品牌', '甲:row-1'))
  })

  it('网格查询键由品牌名组成, 不同品牌互不命中', () => {
    expect(gridQueryKey('甲')).toEqual(['supplier-price-grid', '甲'])
    expect(gridQueryKey('甲')).not.toEqual(gridQueryKey('乙'))
  })
})
