import { describe, expect, it } from 'vitest'
import type { ModuleParentImportDefinition } from '@/types/module-page'
import { isParentImportVisible } from './use-module-editor-item-controls'

/**
 * 「导入上级单据」入口的可见性判定。
 *
 * <p>业务背景（2026-11-19 用户反馈）：销售订单进入「交付核定」后明细已锁定，但页面仍然
 * 显示「导入采购订单明细」按钮，看起来像还能改明细。判定必须同时支持两个维度：</p>
 * <ol>
 *   <li>表单字段维度（`visibleWhen`，如未选客户时不可导入）；</li>
 *   <li>单据状态维度（`hiddenStatuses`）—— 状态不在表单里注册，`visibleWhen` 拿不到，
 *       曾经因此只能写成「永远可见」。</li>
 * </ol>
 */

const DEFINITION: ModuleParentImportDefinition = {
  parentModuleKey: 'purchase-order',
  label: '采购订单',
  parentFieldKey: 'purchaseOrderNo',
  parentDisplayFieldKey: 'orderNo',
  buttonText: '导入采购订单明细',
}

describe('isParentImportVisible', () => {
  it('模块没有声明 parentImport 时不渲染入口', () => {
    expect(isParentImportVisible(undefined, {}, 'DRAFT')).toBe(false)
  })

  it('默认（无 visibleWhen / 无 hiddenStatuses）可见', () => {
    expect(isParentImportVisible(DEFINITION, {}, 'DRAFT')).toBe(true)
  })

  it('visibleWhen 返回 false 时隐藏（表单字段维度）', () => {
    const definition = {
      ...DEFINITION,
      visibleWhen: (record: Record<string, unknown>) => Boolean(record.customerId),
    }
    expect(isParentImportVisible(definition, {}, 'DRAFT')).toBe(false)
    expect(isParentImportVisible(definition, { customerId: '1' }, 'DRAFT')).toBe(
      true,
    )
  })

  it('hiddenStatuses 命中时隐藏（单据状态维度）', () => {
    const definition = {
      ...DEFINITION,
      hiddenStatuses: ['DELIVERY_VERIFICATION', 'SALES_COMPLETED'],
    }
    expect(
      isParentImportVisible(definition, {}, 'DELIVERY_VERIFICATION'),
    ).toBe(false)
    expect(isParentImportVisible(definition, {}, 'SALES_COMPLETED')).toBe(false)
    expect(isParentImportVisible(definition, {}, 'DRAFT')).toBe(true)
    expect(isParentImportVisible(definition, {}, 'AUDITED')).toBe(true)
  })

  it('recordStatus 缺省（新建态）不误伤：只按 visibleWhen 判定', () => {
    const definition = { ...DEFINITION, hiddenStatuses: ['DELIVERY_VERIFICATION'] }
    expect(isParentImportVisible(definition, {}, undefined)).toBe(true)
    expect(isParentImportVisible(definition, {}, '')).toBe(true)
  })

  it('visibleWhen 与 hiddenStatuses 同时存在时，任一不满足即隐藏', () => {
    const definition = {
      ...DEFINITION,
      visibleWhen: () => true,
      hiddenStatuses: ['DELIVERY_VERIFICATION'],
    }
    expect(isParentImportVisible(definition, {}, 'DELIVERY_VERIFICATION')).toBe(
      false,
    )
  })
})
