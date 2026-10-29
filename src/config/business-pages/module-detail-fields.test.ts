import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { freightStatementPageConfig } from './finance/freight-statement-page'
import { paymentsPageConfig } from './finance/payment-page'
import { receiptsPageConfig } from './finance/receipt-page'
import { freightOperationsPageConfigs } from './operations/freight-operations'
import { purchaseOrdersPageConfig } from './operations/purchase-order-page'
import { salesOutboundsPageConfig } from './operations/sales-outbound-page'
import { salesReturnsPageConfig } from './operations/sales-return-page'

/**
 * 详情表头（`detailFields`）补齐与枚举展示的守卫。
 *
 * <p>「后端有、详情页没展示」的字段只存在于配置层：响应已返回、中文文案已有，
 * 漏配 `detailFields` 时界面静默少一行，`tsc` 与既有测试都不会报错。本文件锁住两件事：</p>
 * <ol>
 *   <li>本次补齐的字段确实进了对应模块的 `detailFields`（按 key 断言，不按顺序）；</li>
 *   <li>枚举字段（结算方式 / 收款用途 / 付款用途）的中文映射覆盖后端全部取值 —— 详情渲染器
 *       只复用「同 dataIndex 列的 render」，所以这些列必须默认隐藏，且 title 与详情 label 同源。</li>
 * </ol>
 */

const freightBillConfig = freightOperationsPageConfigs['freight-bill']

/** 详情字段 key 清单：按 key 断言，避免顺序调整（表头顺序在持续调整）时误红。 */
function detailFieldKeys(config: ModulePageConfig) {
  return config.detailFields.map((field) => field.key)
}

function detailField(config: ModulePageConfig, key: string) {
  return config.detailFields.find((field) => field.key === key)
}

function columnOf(config: ModulePageConfig, key: string) {
  return config.columns.find((column) => column.dataIndex === key)
}

function hiddenColumns(config: ModulePageConfig) {
  return config.defaultHiddenColumnKeys ?? []
}

/** 记录只用于 render 的第二个入参；纯文本映射不读它。 */
const EMPTY_RECORD = {} as ModuleRecord

describe('详情表头字段补齐', () => {
  it('物流对账单展示未付金额，销售出库/退货展示仓库名称', () => {
    expect(detailFieldKeys(freightStatementPageConfig)).toContain(
      'unpaidAmount',
    )
    expect(detailFieldKeys(salesOutboundsPageConfig)).toContain('warehouseName')
    expect(detailFieldKeys(salesReturnsPageConfig)).toContain('warehouseName')
  })

  it('物流单补结算方式、固定运费与附加费用合计', () => {
    expect(detailFieldKeys(freightBillConfig)).toEqual(
      expect.arrayContaining([
        'settlementMode',
        'fixedFreightAmount',
        'totalExpenseAmount',
      ]),
    )
  })

  it('收款单补收款用途与关联项目名称，付款单补付款用途', () => {
    expect(detailFieldKeys(receiptsPageConfig)).toEqual(
      expect.arrayContaining(['receiptPurpose', 'projectName']),
    )
    expect(detailFieldKeys(paymentsPageConfig)).toContain('paymentPurpose')
  })

  it('采购订单补 4 个只读派生量，备注仍单独占末行', () => {
    const derivedKeys = [
      'totalActualAmount',
      'totalAmountDifference',
      'totalReceivedQuantity',
      'totalRemainingQuantity',
    ]
    expect(detailFieldKeys(purchaseOrdersPageConfig)).toEqual(
      expect.arrayContaining(derivedKeys),
    )
    const rows = purchaseOrdersPageConfig.detailFields.map(
      (field) => field.row ?? 0,
    )
    expect(detailField(purchaseOrdersPageConfig, 'remark')?.row).toBe(
      Math.max(...rows),
    )
  })
})

describe('枚举字段的中文展示覆盖后端全部取值', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
  })

  it('物流单结算方式覆盖 FreightSettlementMode 的 2 个值，未知值原样回退', () => {
    const render = columnOf(freightBillConfig, 'settlementMode')?.render
    expect(render).toBeTypeOf('function')
    expect(render?.('BY_TONNAGE', EMPTY_RECORD)).toBe('按吨位结算')
    expect(render?.('FIXED', EMPTY_RECORD)).toBe('固定运费')
    expect(render?.('LEGACY_MODE', EMPTY_RECORD)).toBe('LEGACY_MODE')
    expect(render?.(null, EMPTY_RECORD)).toBe('-')
  })

  it('收款用途覆盖 ReceiptPurposes 的 3 个值，未知值原样回退', () => {
    const render = columnOf(receiptsPageConfig, 'receiptPurpose')?.render
    expect(render).toBeTypeOf('function')
    expect(render?.('CUSTOMER_STATEMENT_SETTLEMENT', EMPTY_RECORD)).toBe(
      '客户结算收款',
    )
    expect(render?.('SUPPLIER_PREPAYMENT_REFUND', EMPTY_RECORD)).toBe(
      '供应商预付款退款',
    )
    expect(render?.('SUPPLIER_OTHER_RECEIPT', EMPTY_RECORD)).toBe(
      '供应商其他收款',
    )
    expect(render?.('LEGACY_PURPOSE', EMPTY_RECORD)).toBe('LEGACY_PURPOSE')
  })

  it('付款用途覆盖 PaymentPurposes 的 3 个值，未知值原样回退', () => {
    const render = columnOf(paymentsPageConfig, 'paymentPurpose')?.render
    expect(render).toBeTypeOf('function')
    expect(render?.('STATEMENT_SETTLEMENT', EMPTY_RECORD)).toBe('对账结算')
    expect(render?.('PURCHASE_PREPAYMENT', EMPTY_RECORD)).toBe('采购预付款')
    expect(render?.('SUPPLIER_PAYMENT', EMPTY_RECORD)).toBe('供应商总额付款')
    expect(render?.('LEGACY_PURPOSE', EMPTY_RECORD)).toBe('LEGACY_PURPOSE')
  })

  it('承担展示口径的列必须默认隐藏，且列 title 与详情 label 同源', () => {
    const cases: Array<[ModulePageConfig, string]> = [
      [freightBillConfig, 'settlementMode'],
      [receiptsPageConfig, 'receiptPurpose'],
      [paymentsPageConfig, 'paymentPurpose'],
    ]
    for (const [config, key] of cases) {
      const column = columnOf(config, key)
      expect(column).toBeDefined()
      expect(hiddenColumns(config)).toContain(key)
      expect(detailField(config, key)?.label).toBe(column?.title)
    }
  })
})
