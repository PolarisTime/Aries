import { describe, expect, it } from 'vitest'
import type { ModuleKey } from '@/module-system/core/module-key'
import { getPrintJobLayout, PRINT_JOB_LAYOUTS } from '@/utils/print-job-layout'
import {
  getPrintItemFields,
  isStatementPrintModule,
  supportsSalesOrderPrintOption,
} from '@/utils/print-module-config'

/**
 * 打印作业「模块 → 布局」矩阵的契约测试。
 *
 * <p>这里的断言就是 10 个打印目标的布局规格：明细列、默认隐藏列、汇总条字段、
 * Header 往来对象、打印选项。改布局先改本测试，避免配置被无意改掉。</p>
 */
describe('打印作业模块布局', () => {
  it('10 个打印目标都有布局声明', () => {
    const targets = [
      'purchase-order',
      'purchase-inbound',
      'sales-order',
      'sales-outbound',
      'sales-return',
      'freight-bill',
      'customer-statement',
      'freight-statement',
      'receipt',
      'payment',
    ]
    for (const key of targets) {
      expect(PRINT_JOB_LAYOUTS[key as ModuleKey], key).toBeDefined()
    }
  })

  it('补齐默认模板后 10 个打印目标都提供入口', () => {
    const targets = [
      'purchase-order',
      'purchase-inbound',
      'sales-order',
      'sales-outbound',
      'sales-return',
      'freight-bill',
      'customer-statement',
      'freight-statement',
      'receipt',
      'payment',
    ]
    for (const key of targets) {
      expect(getPrintJobLayout(key as ModuleKey).printable, key).toBe(true)
    }
  })

  it('采购/入库/出库的单价金额能力已支持但默认隐藏', () => {
    for (const key of [
      'purchase-order',
      'purchase-inbound',
      'sales-outbound',
    ]) {
      const layout = getPrintJobLayout(key)
      expect(layout.itemFields, key).toEqual(
        expect.arrayContaining(['unitPrice', 'amount']),
      )
      expect(layout.hiddenItemFields, key).toEqual(
        expect.arrayContaining(['unitPrice', 'amount']),
      )
      expect(
        getPrintItemFields(key).map((field) => field.key),
        key,
      ).not.toContain('unitPrice')
    }
    // 销售退货虽暂不提供入口，但字段能力与销售订单一致（补模板后可直接打印）。
    expect(
      getPrintItemFields('sales-return').map((field) => field.key),
    ).toContain('unitPrice')
  })

  it('销售订单与对账单显示单价金额与数量单位', () => {
    expect(getPrintItemFields('sales-order').map((field) => field.key)).toEqual(
      expect.arrayContaining(['unitPrice', 'amount', 'quantityUnit']),
    )
    expect(
      getPrintItemFields('customer-statement').map((field) => field.key),
    ).toContain('quantityUnit')
  })

  it('汇总条日期按单据类型取值，对账单为起止区间', () => {
    expect(getPrintJobLayout('sales-order').summary.date?.fields).toEqual([
      'deliveryDate',
    ])
    expect(getPrintJobLayout('purchase-order').summary.date?.fields).toEqual([
      'orderDate',
    ])
    expect(getPrintJobLayout('purchase-inbound').summary.date?.fields).toEqual([
      'inboundDate',
    ])
    expect(getPrintJobLayout('customer-statement').summary.date).toMatchObject({
      mode: 'range',
      fields: ['startDate', 'endDate'],
    })
  })

  it('物流单/对账单合计金额取表头总运费，收付款单不显示件数重量', () => {
    expect(
      getPrintJobLayout('freight-bill').summary.amount?.headerFields,
    ).toEqual(['totalFreight'])
    expect(getPrintJobLayout('payment').summary.quantity).toBe(false)
    expect(getPrintJobLayout('payment').summary.weight).toBe(false)
    expect(getPrintJobLayout('payment').summary.amount?.headerFields).toEqual([
      'amount',
    ])
  })

  it('Header 往来对象覆盖收付款单的 counterpartyName', () => {
    expect(getPrintJobLayout('payment').counterpartyFields).toContain(
      'counterpartyName',
    )
    expect(getPrintJobLayout('receipt').counterpartyFields).toContain(
      'counterpartyName',
    )
    expect(getPrintJobLayout('sales-order').counterpartyFields).toEqual([
      'customerName',
    ])
  })

  it('拆分/合并选项只对销售订单开放', () => {
    expect(getPrintJobLayout('sales-order').options.split).toBe(true)
    expect(getPrintJobLayout('sales-order').options.merge).toBe(true)
    expect(getPrintJobLayout('customer-statement').options.split).toBe(false)
    expect(supportsSalesOrderPrintOption('sales-order')).toBe(true)
    expect(supportsSalesOrderPrintOption('customer-statement')).toBe(false)
  })

  it('对账单按来源单/项目分组渲染', () => {
    expect(isStatementPrintModule('customer-statement')).toBe(true)
    expect(isStatementPrintModule('freight-statement')).toBe(true)
    expect(isStatementPrintModule('sales-order')).toBe(false)
  })

  it('未配置模块回退默认布局', () => {
    const layout = getPrintJobLayout('unknown-module')
    expect(layout.itemFields).not.toContain('unitPrice')
    expect(layout.summary.date).toBeNull()
    expect(layout.hiddenItemFields).toEqual([])
  })
})
