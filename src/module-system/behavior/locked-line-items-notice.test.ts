import { describe, expect, it } from 'vitest'
import {
  contributeEditorBehaviors,
  editableLockedFieldsNotice,
  SALES_ORDER_LOCKED_FIELD_KEYS,
  SALES_ORDER_LOCKED_ITEM_COLUMN_KEYS,
} from '@/module-system/behavior/module-behavior-editor'
import { assembleModuleBehaviors } from '@/module-system/behavior/module-behavior-registry-core'

/**
 * 「关联销售出库已审核」提示文案与白名单一致性回归。
 *
 * <p>背景：`editableLockedFields` 已包含 `orderDate`（取价基准 ORDER 的锚点，交付核定下必须可改），
 * 但 `lockedLineItemsNotice` 仍是早先硬编码的「仅允许调整送货日期、备注和单价」。
 * 用户在交付核定界面看到的说明与真实可编辑范围相反。</p>
 *
 * <p>用例口径：断言文案由白名单**派生**且逐项覆盖白名单，而不是断言某一句固定中文——
 * 后者在白名单再次变更时同样会分叉。</p>
 */

const salesOrderBehavior = assembleModuleBehaviors(
  contributeEditorBehaviors,
).get('sales-order')

describe('销售订单交付核定提示文案与白名单一致', () => {
  it('提示文案等于白名单派生结果（文案不再是游离的第二份口径）', () => {
    expect(salesOrderBehavior?.lockedLineItemsNotice).toBe(
      editableLockedFieldsNotice(
        salesOrderBehavior?.editableLockedFields ?? [],
        salesOrderBehavior?.editableLockedItemColumns ?? [],
      ),
    )
  })

  it('白名单为「送货日期、报单日期、备注」+「单价」', () => {
    expect(salesOrderBehavior?.editableLockedFields).toEqual([
      'deliveryDate',
      'orderDate',
      'remark',
    ])
    expect(salesOrderBehavior?.editableLockedItemColumns).toEqual(['unitPrice'])
  })

  it('文案逐项覆盖白名单里的全部字段（含报单日期）', () => {
    const notice = String(salesOrderBehavior?.lockedLineItemsNotice)

    // 修复前文案缺「报单日期」，该断言在修复前必红。
    expect(notice).toContain('报单日期')
    for (const label of ['送货日期', '备注', '单价']) {
      expect(notice).toContain(label)
    }
  })

  it('白名单字段都有界面文案映射，不允许回退成字段键', () => {
    const notice = String(salesOrderBehavior?.lockedLineItemsNotice)
    const whitelistKeys = [
      ...(salesOrderBehavior?.editableLockedFields ?? []),
      ...(salesOrderBehavior?.editableLockedItemColumns ?? []),
    ]

    expect(whitelistKeys.length).toBeGreaterThan(0)
    for (const key of whitelistKeys) {
      expect(notice, `${key} 缺中文文案映射`).not.toContain(key)
    }
  })

  it('派生函数跟随白名单变化（加字段即加文案，删字段即删文案）', () => {
    // 只有送货日期 + 备注时，正是修复前漏掉报单日期的那句文案。
    expect(
      editableLockedFieldsNotice(['deliveryDate', 'remark'], ['unitPrice']),
    ).toBe(
      '关联销售出库已审核，当前仅允许调整送货日期、备注、单价，以及明细行顺序。',
    )

    expect(editableLockedFieldsNotice(SALES_ORDER_LOCKED_FIELD_KEYS)).toBe(
      '关联销售出库已审核，当前仅允许调整送货日期、报单日期、备注，以及明细行顺序。',
    )

    expect(
      editableLockedFieldsNotice(
        SALES_ORDER_LOCKED_FIELD_KEYS,
        SALES_ORDER_LOCKED_ITEM_COLUMN_KEYS,
      ),
    ).not.toBe('关联销售出库已审核，当前仅允许调整送货日期、备注和单价。')
  })

  it('锁定态提示必须说明「行序仍可调」—— 行序与字段锁定解耦', () => {
    // 交付核定锁的是行内字段值（单价等），而拖动只重排数组下标、不改字段值。
    // 提示若不提行序，用户会以为整张明细都动不了。
    expect(editableLockedFieldsNotice(SALES_ORDER_LOCKED_FIELD_KEYS)).toContain(
      '明细行顺序',
    )
  })
})
