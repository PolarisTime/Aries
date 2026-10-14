// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { applyRowLock, unlinkPurchaseOrderPatch } from './core'
import type { Brand, PriceRow, PriceSheet } from './types'
import { buildItemPayload, itemSignature } from './useSheetsStore'

/**
 * 「解除关联」在保存载荷上的契约(回归: 点「清除关联」保存后关联还在)。
 *
 * <p>后端语义(`8c918fa4`)是「未携带 purchaseOrderLinks = 不改关联, 显式 `[]` = 清空」。
 * 本地只清三列而把集合留成 `undefined`, 载荷就会省略该字段 ⇒ 旧关联被原样保留, 服务端
 * 随后把旧关联镜像回三列, 用户看到的是"清除了又自己长回来"。</p>
 */

const sheet: PriceSheet = {
  id: 's1',
  name: '批次 1',
  status: '报价',
  projectId: 'p1',
  projectName: '项目',
  orderDate: '2026-09-10',
  refDate: '2026-09-10',
  refPeriod: '9:30 上午',
  lengthPremium: 30,
  inputs: {},
  rows: [],
}

const brands: Brand[] = [{ name: '中天', freight: 30 }]

/** 完整商品行(可落库): category/material/spec/length 齐全。 */
const baseRow: PriceRow = {
  id: '7001',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 130,
}

/** 一行挂两张订单明细行(60 + 70)。 */
const linkedRow: PriceRow = {
  ...baseRow,
  locked: true,
  purchaseOrderId: '88',
  purchaseOrderNo: 'PO-88',
  purchaseOrderItemId: '301',
  purchaseOrderLinks: [
    {
      purchaseOrderId: '88',
      purchaseOrderNo: 'PO-88',
      purchaseOrderItemId: '301',
      allocatedTon: 60,
    },
    {
      purchaseOrderId: '99',
      purchaseOrderNo: 'PO-99',
      purchaseOrderItemId: '302',
      allocatedTon: 70,
    },
  ],
}

describe('解除关联的保存载荷', () => {
  it('有 2 条关联的行清除后: 载荷显式下发 [], 旧三列字段缺席', () => {
    const cleared = { ...linkedRow, ...unlinkPurchaseOrderPatch(linkedRow) }
    const payload = buildItemPayload(sheet, cleared, brands)
    expect(payload).not.toBeNull()
    // 显式 [] 才能表达"清空"(省略 = 后端不改关联)
    expect(payload).toHaveProperty('purchaseOrderLinks')
    expect(payload?.purchaseOrderLinks).toEqual([])
    expect(payload).not.toHaveProperty('purchaseOrderId')
    expect(payload).not.toHaveProperty('purchaseOrderItemId')
  })

  it('从未关联过的行: 载荷不含 purchaseOrderLinks 字段(不塞空数组)', () => {
    const payload = buildItemPayload(sheet, baseRow, brands)
    expect(payload).not.toBeNull()
    expect(payload).not.toHaveProperty('purchaseOrderLinks')
  })

  it('解锁已关联的行: 本地镜像同步清空关联集合, 载荷表达清空', () => {
    const unlocked = applyRowLock(linkedRow, false)
    expect(unlocked.locked).toBe(false)
    expect(unlocked.purchaseOrderId).toBeUndefined()
    expect(unlocked.purchaseOrderNo).toBeUndefined()
    expect(unlocked.purchaseOrderItemId).toBeUndefined()
    expect(unlocked.purchaseOrderLinks).toEqual([])

    const payload = buildItemPayload(sheet, unlocked, brands)
    expect(payload?.purchaseOrderLinks).toEqual([])
  })

  it('解锁从未关联过的行: 保持 undefined, 载荷继续省略该字段', () => {
    const unlocked = applyRowLock({ ...baseRow, locked: true }, false)
    expect(unlocked.purchaseOrderLinks).toBeUndefined()
    expect(buildItemPayload(sheet, unlocked, brands)).not.toHaveProperty(
      'purchaseOrderLinks',
    )
  })

  it('行指纹能感知"关联被清空", 从而触发保存', () => {
    const cleared = { ...linkedRow, ...unlinkPurchaseOrderPatch(linkedRow) }
    expect(itemSignature(cleared, {})).not.toBe(itemSignature(linkedRow, {}))

    // 只清三列、保留旧集合(旧实现的错误中间态)与真正清空必须可区分:
    // 否则"清空集合"这一步在脏检查里会被吞掉, 保存不发。
    const columnsOnly: PriceRow = {
      ...linkedRow,
      purchaseOrderId: undefined,
      purchaseOrderNo: undefined,
      purchaseOrderItemId: undefined,
    }
    expect(itemSignature(columnsOnly, {})).not.toBe(itemSignature(cleared, {}))
    expect(itemSignature(columnsOnly, {})).not.toBe(
      itemSignature({ ...baseRow, locked: true }, {}),
    )
  })
})
