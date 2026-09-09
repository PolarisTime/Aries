import { describe, expect, it } from 'vitest'
import {
  getPrintItemColumnAlign,
  getPrintItemFields,
  isStatementPrintModule,
  supportsSalesOrderPrintOption,
} from './print-module-config'

describe('getPrintItemFields', () => {
  it('客户对账单返回对账单字段（含计量单位）', () => {
    const fields = getPrintItemFields('customer-statement')
    expect(fields.map(({ key }) => key)).toContain('quantityUnit')
    expect(fields.map(({ key }) => key)).toContain('amount')
  })

  it('销售订单返回全量字段（含单价/金额）', () => {
    const keys = getPrintItemFields('sales-order').map(({ key }) => key)
    expect(keys).toContain('unitPrice')
    expect(keys).toContain('amount')
  })

  it('普通单据模块隐藏单价/金额', () => {
    const keys = getPrintItemFields('purchase-order').map(({ key }) => key)
    expect(keys).not.toContain('unitPrice')
    expect(keys).not.toContain('amount')
  })

  it('未知模块 key 回退为非销售字段集合', () => {
    const keys = getPrintItemFields('unknown-module').map(({ key }) => key)
    expect(keys).not.toContain('unitPrice')
    expect(keys).not.toContain('amount')
  })
})

describe('getPrintItemColumnAlign', () => {
  const brandField = {
    key: 'brand' as const,
    labelKey: 'modules.print.itemBrand',
  }

  it('客户对账单品牌列居中，其余模块沿用默认对齐', () => {
    expect(getPrintItemColumnAlign(brandField, 'customer-statement')).toBe(
      'center',
    )
    expect(getPrintItemColumnAlign(brandField, 'purchase-order')).toBe('left')
    expect(getPrintItemColumnAlign(brandField)).toBe('left')
  })

  it('未知模块 key 回退为默认对齐', () => {
    expect(getPrintItemColumnAlign(brandField, 'unknown-module')).toBe('left')
  })
})

describe('print option gating', () => {
  it('仅销售订单支持销售订单打印选项', () => {
    expect(supportsSalesOrderPrintOption('sales-order')).toBe(true)
    expect(supportsSalesOrderPrintOption('purchase-order')).toBe(false)
    expect(supportsSalesOrderPrintOption('unknown-module')).toBe(false)
  })

  it('仅对账单模块按对账单分组渲染', () => {
    expect(isStatementPrintModule('customer-statement')).toBe(true)
    expect(isStatementPrintModule('freight-statement')).toBe(true)
    expect(isStatementPrintModule('sales-order')).toBe(false)
    expect(isStatementPrintModule('unknown-module')).toBe(false)
  })
})
