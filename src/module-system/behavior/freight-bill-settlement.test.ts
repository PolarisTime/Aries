import { describe, expect, it } from 'vitest'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'

/**
 * 物流单运费合计口径的回归测试。
 *
 * <p>`totalFreight` 就是本次结算金额（入账、对账单、财务概览、导出都读它）：
 * 按吨位模式 = 单价 × 吨位合计（历史数值必须**完全不变**）；
 * 固定运费模式 = 固定运费金额。同时钉住「按吨位模式必须把 fixedFreightAmount 落成 null」，
 * 因为后端把该模式下的非 null 金额视为互斥冲突（422），而 null 用于清空库里遗留值。</p>
 */

const normalizeDraftRecord = getBehaviorValue(
  'freight-bill',
  'normalizeDraftRecord',
)

const sumLineItemsBy = (items: ModuleLineItem[], key: string) =>
  items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)

const ITEMS = [
  { id: '1', weightTon: 10 },
  { id: '2', weightTon: 2.5 },
] as ModuleLineItem[]

function normalize(record: ModuleRecordInput): ModuleRecordInput {
  const draft: ModuleRecordInput = { ...record }
  normalizeDraftRecord?.(draft, ITEMS, {
    primaryNoKey: undefined,
    currentOperatorName: '',
    sumLineItemsBy,
  })
  return draft
}

describe('物流单运费合计按结算方式切换', () => {
  it('按吨位（缺省）：运费 = 单价 × 吨位合计，历史口径不变', () => {
    const draft = normalize({ unitPrice: 100 })

    expect(draft.totalWeight).toBe(12.5)
    expect(draft.totalFreight).toBe(1250)
    expect(draft.settlementMode).toBe('BY_TONNAGE')
    expect(draft.fixedFreightAmount).toBeNull()
  })

  it('按吨位但残留旧固定金额：结算金额仍按吨位，且把固定金额落成 null 清空', () => {
    const draft = normalize({
      unitPrice: 100,
      settlementMode: 'BY_TONNAGE',
      fixedFreightAmount: 1500,
    })

    expect(draft.totalFreight).toBe(1250)
    expect(draft.fixedFreightAmount).toBeNull()
  })

  it('固定运费：结算金额取固定金额，单价与吨位照旧保留', () => {
    const draft = normalize({
      unitPrice: 100,
      settlementMode: 'FIXED',
      fixedFreightAmount: 1500,
    })

    expect(draft.totalFreight).toBe(1500)
    expect(draft.fixedFreightAmount).toBe(1500)
    // 单价与吨位不在固定运费模式下被改写：它们仍要存储与展示。
    expect(draft.unitPrice).toBe(100)
    expect(draft.totalWeight).toBe(12.5)
  })

  it('固定运费但金额为空：不把旧运费留在结算金额上（提交前有校验拦截）', () => {
    const draft = normalize({ unitPrice: 100, settlementMode: 'FIXED' })

    expect(draft.fixedFreightAmount).toBeNull()
    expect(draft.totalFreight).toBe(0)
  })

  it('固定运费金额保留两位小数', () => {
    const draft = normalize({
      unitPrice: 100,
      settlementMode: 'FIXED',
      fixedFreightAmount: 1499.999,
    })

    expect(draft.totalFreight).toBe(1500)
  })
})
