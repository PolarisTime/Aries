import { describe, expect, it } from 'vitest'
import {
  FIXED_FREIGHT_AMOUNT_FIELD,
  FREIGHT_SETTLEMENT_MODE_BY_TONNAGE,
  FREIGHT_SETTLEMENT_MODE_FIXED,
  FREIGHT_SETTLEMENT_MODES,
  isFixedFreightSettlement,
  isValidFixedFreightAmount,
  resolveFixedFreightAmount,
  resolveFreightSettlementMode,
  resolveTonnageFreightAmount,
  SETTLEMENT_MODE_FIELD,
} from '@/constants/freight-settlement'

/**
 * 结算方式口径的回归测试。
 *
 * <p>枚举字面量与后端冻结契约一一对应（Jackson 按枚举名精确匹配，写错就是 400），
 * 因此这里既钉住字面量本身，也钉住「缺省/脏值一律按吨位」这个向后兼容约定。</p>
 */

describe('物流单结算方式口径', () => {
  it('枚举字面量与后端契约一致', () => {
    expect(FREIGHT_SETTLEMENT_MODES).toEqual(['BY_TONNAGE', 'FIXED'])
    expect(SETTLEMENT_MODE_FIELD).toBe('settlementMode')
    expect(FIXED_FREIGHT_AMOUNT_FIELD).toBe('fixedFreightAmount')
  })

  it('缺省/空值/脏值一律按「按吨位」处理（老数据与后端未上线时行为不变）', () => {
    for (const form of [
      undefined,
      {},
      { settlementMode: null },
      { settlementMode: '' },
      { settlementMode: '   ' },
      { settlementMode: 'TONNAGE' },
      { settlementMode: 'fixed' },
      { settlementMode: 'UNKNOWN' },
    ]) {
      expect(resolveFreightSettlementMode(form as never)).toBe(
        FREIGHT_SETTLEMENT_MODE_BY_TONNAGE,
      )
      expect(isFixedFreightSettlement(form as never)).toBe(false)
    }
  })

  it('识别固定运费（大小写与空白不宽容，避免把脏值当固定运费）', () => {
    expect(resolveFreightSettlementMode({ settlementMode: 'FIXED' })).toBe(
      FREIGHT_SETTLEMENT_MODE_FIXED,
    )
    expect(resolveFreightSettlementMode({ settlementMode: '  FIXED ' })).toBe(
      FREIGHT_SETTLEMENT_MODE_FIXED,
    )
    expect(isFixedFreightSettlement({ settlementMode: 'FIXED' })).toBe(true)
  })

  it('按吨位模式下固定运费金额必须为 null（用于清空库里遗留值）', () => {
    expect(
      resolveFixedFreightAmount({
        settlementMode: 'BY_TONNAGE',
        fixedFreightAmount: 1500,
      }),
    ).toBeNull()
    expect(resolveFixedFreightAmount({})).toBeNull()
  })

  it('固定运费模式下读取固定金额，非法值回落为 null', () => {
    expect(
      resolveFixedFreightAmount({
        settlementMode: 'FIXED',
        fixedFreightAmount: 1500.5,
      }),
    ).toBe(1500.5)
    expect(resolveFixedFreightAmount({ settlementMode: 'FIXED' })).toBeNull()
    expect(
      resolveFixedFreightAmount({
        settlementMode: 'FIXED',
        fixedFreightAmount: 'abc',
      }),
    ).toBeNull()
  })

  it('固定运费金额有效性：非空且严格大于 0', () => {
    expect(isValidFixedFreightAmount(0.01)).toBe(true)
    expect(isValidFixedFreightAmount('1500.00')).toBe(true)
    expect(isValidFixedFreightAmount(0)).toBe(false)
    expect(isValidFixedFreightAmount(-1)).toBe(false)
    expect(isValidFixedFreightAmount(null)).toBe(false)
    expect(isValidFixedFreightAmount(undefined)).toBe(false)
    expect(isValidFixedFreightAmount('')).toBe(false)
    expect(isValidFixedFreightAmount('abc')).toBe(false)
  })

  it('按吨位参考运费 = 单价 × 吨位合计，保留两位', () => {
    expect(
      resolveTonnageFreightAmount({ unitPrice: 100, totalWeight: 12.345 }),
    ).toBe(1234.5)
    expect(resolveTonnageFreightAmount({})).toBe(0)
    expect(
      resolveTonnageFreightAmount({ unitPrice: 'abc', totalWeight: 3 }),
    ).toBe(0)
  })
})
