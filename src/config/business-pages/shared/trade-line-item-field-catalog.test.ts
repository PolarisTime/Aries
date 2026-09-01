import { describe, expect, it } from 'vitest'
import {
  TRADE_LINE_ITEM_FIELD_CATALOG,
  TRADE_LINE_ITEM_FIELD_KEYS,
} from './trade-line-item-field-catalog'

describe('TRADE_LINE_ITEM_FIELD_CATALOG', () => {
  it('目录 key 与 field key 列表一一对应', () => {
    expect(TRADE_LINE_ITEM_FIELD_KEYS).toEqual(
      TRADE_LINE_ITEM_FIELD_KEYS.filter(
        (key, index) => TRADE_LINE_ITEM_FIELD_KEYS.indexOf(key) === index,
      ),
    )
    for (const key of TRADE_LINE_ITEM_FIELD_KEYS) {
      expect(TRADE_LINE_ITEM_FIELD_CATALOG[key]).toBeDefined()
    }
  })

  it('目录条目 key 与索引一致，且包含 labelKey 与宽度', () => {
    for (const [key, spec] of Object.entries(TRADE_LINE_ITEM_FIELD_CATALOG)) {
      expect(spec.key).toBe(key)
      expect(spec.labelKey).toBeTruthy()
      expect(typeof spec.width).toBe('number')
    }
  })

  it('目录只保存 label key，不保存跨语言翻译文本', () => {
    const spec = TRADE_LINE_ITEM_FIELD_CATALOG.brand
    expect(spec.labelKey.startsWith('modules.')).toBe(true)
    expect(spec.labelKey).not.toContain('品牌')
  })
})
