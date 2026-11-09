import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'

/**
 * 上游单号列默认隐藏 + 关键字筛选提示来源单号（2026-11）。
 *
 * <p>上游单据列（采购订单号 / 销售订单号 / 对账单关联单号）默认显示但价值低：详情页表头
 * 已有该字段，后端 keyword 搜索也已覆盖来源单号。因此这些列改为「默认隐藏」，
 * 但仍保留在 columns 中，用户可通过列设置重新打开。本文件锁两件事：</p>
 * <ol>
 *   <li>6 个列表配置的 `defaultHiddenColumnKeys` 含对应上游单号列，且原有隐藏项未被覆盖；</li>
 *   <li>4 个关键字筛选的 placeholder 明确提示可搜来源单号，避免隐藏列后用户误以为搜不到。</li>
 * </ol>
 */

let purchaseInboundsPageConfig: ModulePageConfig
let salesOutboundsPageConfig: ModulePageConfig
let salesReturnsPageConfig: ModulePageConfig
let salesOrdersPageConfig: ModulePageConfig
let customerStatementPageConfig: ModulePageConfig
let freightStatementPageConfig: ModulePageConfig

beforeAll(async () => {
  await i18next.changeLanguage('zh-CN')
  ;({ purchaseInboundsPageConfig } = await import(
    '@/config/business-pages/operations/purchase-inbound-page'
  ))
  ;({ salesOutboundsPageConfig } = await import(
    '@/config/business-pages/operations/sales-outbound-page'
  ))
  ;({ salesReturnsPageConfig } = await import(
    '@/config/business-pages/operations/sales-return-page'
  ))
  ;({ salesOrdersPageConfig } = await import(
    '@/config/business-pages/operations/sales-order-page'
  ))
  ;({ customerStatementPageConfig } = await import(
    '@/config/business-pages/finance/customer-statement-page'
  ))
  ;({ freightStatementPageConfig } = await import(
    '@/config/business-pages/finance/freight-statement-page'
  ))
})

/** 初始可见性配置；缺省按空数组处理，缺失即视为没有默认隐藏列。 */
function hiddenKeys(config: ModulePageConfig): string[] {
  return config.defaultHiddenColumnKeys ?? []
}

function columnKeys(config: ModulePageConfig): string[] {
  return config.columns.map((column) => column.dataIndex)
}

function keywordPlaceholder(config: ModulePageConfig): string {
  return (
    config.filters.find((filter) => filter.key === 'keyword')?.placeholder ?? ''
  )
}

describe('上游单号列默认隐藏（不删除列）', () => {
  it('采购入库与销售订单默认隐藏采购订单号', () => {
    expect(hiddenKeys(purchaseInboundsPageConfig)).toEqual(
      expect.arrayContaining(['purchaseOrderNo']),
    )
    expect(hiddenKeys(salesOrdersPageConfig)).toEqual(
      expect.arrayContaining(['purchaseOrderNo']),
    )
  })

  it('销售出库与销售退货默认隐藏销售订单号', () => {
    expect(hiddenKeys(salesOutboundsPageConfig)).toEqual(
      expect.arrayContaining(['salesOrderNo']),
    )
    expect(hiddenKeys(salesReturnsPageConfig)).toEqual(
      expect.arrayContaining(['salesOrderNo']),
    )
  })

  it('客户对账单 / 物流对账单默认隐藏关联单号', () => {
    expect(hiddenKeys(customerStatementPageConfig)).toEqual(
      expect.arrayContaining(['sourceOrderNos']),
    )
    expect(hiddenKeys(freightStatementPageConfig)).toEqual(
      expect.arrayContaining(['sourceBillNos']),
    )
  })

  /*
   * 回归守卫：本次只是往现有数组里追加，不能把用户已经配置好的默认隐藏项（结算主体、
   * 备注、编码等）覆盖掉 —— 覆盖会让这些列重新冒出来，比新增隐藏更难被发现。
   */
  it('原有默认隐藏项保持不变', () => {
    expect(hiddenKeys(purchaseInboundsPageConfig)).toEqual(
      expect.arrayContaining([
        'settlementCompanyName',
        'totalWeightAdjustmentTon',
        'remark',
      ]),
    )
    expect(hiddenKeys(salesOutboundsPageConfig)).toContain('remark')
    expect(hiddenKeys(salesReturnsPageConfig)).toContain('remark')
    expect(hiddenKeys(salesOrdersPageConfig)).toEqual(
      expect.arrayContaining(['salesName', 'remark']),
    )
    expect(hiddenKeys(customerStatementPageConfig)).toEqual(
      expect.arrayContaining(['customerCode', 'remark']),
    )
    expect(hiddenKeys(freightStatementPageConfig)).toEqual(
      expect.arrayContaining(['carrierCode', 'remark']),
    )
  })

  /* 默认隐藏 ≠ 删除列：列定义必须仍在，否则用户无法通过列设置恢复。 */
  it('上游单号列仍保留在 columns 中', () => {
    const cases: Array<[ModulePageConfig, string]> = [
      [purchaseInboundsPageConfig, 'purchaseOrderNo'],
      [salesOrdersPageConfig, 'purchaseOrderNo'],
      [salesOutboundsPageConfig, 'salesOrderNo'],
      [salesReturnsPageConfig, 'salesOrderNo'],
      [customerStatementPageConfig, 'sourceOrderNos'],
      [freightStatementPageConfig, 'sourceBillNos'],
    ]
    for (const [config, key] of cases) {
      expect(columnKeys(config), `${config.key} 缺少列 ${key}`).toContain(key)
    }
  })
})

describe('关键字筛选提示可搜来源单号', () => {
  it('四个关键字筛选的占位文案包含上游单号中文', () => {
    expect(keywordPlaceholder(purchaseInboundsPageConfig)).toBe(
      '输入入库单号 / 采购订单号',
    )
    expect(keywordPlaceholder(salesOutboundsPageConfig)).toBe(
      '输入出库单号 / 销售订单号',
    )
    expect(keywordPlaceholder(salesReturnsPageConfig)).toBe(
      '输入退货单号 / 销售订单号',
    )
    expect(keywordPlaceholder(salesOrdersPageConfig)).toBe(
      '输入销售订单号 / 采购订单号',
    )
  })

  it('英文占位同步提示可搜来源单号', () => {
    expect(
      i18next.t('modules.pages.purchaseInbound.placeholderInboundNo', {
        lng: 'en-US',
      }),
    ).toContain('purchase order number')
    expect(
      i18next.t('modules.pages.salesOutbound.placeholderOutboundNo', {
        lng: 'en-US',
      }),
    ).toContain('sales order number')
    expect(
      i18next.t('modules.pages.salesReturn.placeholderReturnNo', {
        lng: 'en-US',
      }),
    ).toContain('sales order number')
    expect(
      i18next.t('modules.pages.salesOrder.placeholderOrderNo', {
        lng: 'en-US',
      }),
    ).toContain('purchase order number')
  })
})
