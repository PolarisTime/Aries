import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { toSaveRequest } from '@/module-system/record/module-save-payload'

/**
 * 序列化入口按动态记录（dynamicFields）读取 chargeItems，
 * 这里放宽静态形状以覆盖 strictObject 契约场景。
 */
function submitRecord(moduleKey: string, record: Record<string, unknown>) {
  return toSaveRequest(moduleKey, record as never)
}

const freightBillBaseRecord: Record<string, unknown> = {
  carrierName: '测试物流商',
  billTime: '2026-08-21 00:00:00',
  unitPrice: 100,
  items: [{ sourceSalesOrderItemId: '501' }],
}

describe('serializeBusinessRecordForSave chargeItems 序列化通道', () => {
  it('freight-bill 输出 chargeItem 白名单字段并保留持久化行 ID', async () => {
    const payload = (await submitRecord('freight-bill', {
      ...freightBillBaseRecord,
      chargeItems: [
        {
          id: '9007199254740993',
          chargeName: '吊装费',
          materialId: '123',
          amount: 88.5,
          unit: '次',
          remark: '含税',
        },
        { chargeName: '过磅费', amount: 0 },
      ],
    })) as Record<string, unknown>

    expect(payload.chargeItems).toEqual([
      {
        id: '9007199254740993',
        chargeName: '吊装费',
        materialId: '123',
        amount: 88.5,
        unit: '次',
        remark: '含税',
      },
      { chargeName: '过磅费', amount: 0 },
    ])
    expect(payload.items).toEqual([{ sourceSalesOrderItemId: '501' }])
  })

  it('剔除前端临时行 ID，仅下发合法正整数 ID', async () => {
    const payload = (await submitRecord('freight-bill', {
      ...freightBillBaseRecord,
      chargeItems: [{ id: 'tmp-abc-123', chargeName: '吊装费', amount: 10 }],
    })) as Record<string, unknown>

    expect(payload.chargeItems).toEqual([{ chargeName: '吊装费', amount: 10 }])
  })

  it('未填写名称且无持久化 ID 的全新空行被过滤', async () => {
    const payload = (await submitRecord('freight-bill', {
      ...freightBillBaseRecord,
      chargeItems: [
        { chargeName: '', amount: 0 },
        { chargeName: '   ', amount: 5 },
        { chargeName: '有效费用', amount: 20 },
      ],
    })) as Record<string, unknown>

    expect(payload.chargeItems).toEqual([
      { chargeName: '有效费用', amount: 20 },
    ])
  })

  it('unit 与 remark 为空字符串时不下发该字段', async () => {
    const payload = (await submitRecord('freight-bill', {
      ...freightBillBaseRecord,
      chargeItems: [{ chargeName: '吊装费', amount: 10, unit: '', remark: '' }],
    })) as Record<string, unknown>

    expect(payload.chargeItems).toEqual([{ chargeName: '吊装费', amount: 10 }])
  })

  it('空数组保留键以表达清空全部附加费用', async () => {
    const payload = (await submitRecord('freight-bill', {
      ...freightBillBaseRecord,
      chargeItems: [],
    })) as Record<string, unknown>

    expect(payload.chargeItems).toEqual([])
  })

  it('非法 materialId 触发实体 ID 契约错误', async () => {
    await expect(
      submitRecord('freight-bill', {
        ...freightBillBaseRecord,
        chargeItems: [
          { chargeName: '吊装费', amount: 10, materialId: 'not-a-id' },
        ],
      }),
    ).rejects.toThrow()
  })

  it('receipt 保存载荷保留资金账户 accountId 并按实体 ID 契约输出字符串', async () => {
    const payload = (await submitRecord('receipt', {
      receiptNo: '1234567890123456789',
      amount: 100,
      accountId: '1932500000000000123',
    })) as Record<string, unknown>

    expect(payload.accountId).toBe('1932500000000000123')
  })

  it('payment 保存载荷保留资金账户 accountId 并按实体 ID 契约输出字符串', async () => {
    const payload = (await submitRecord('payment', {
      paymentNo: '1234567890123456790',
      amount: 200,
      accountId: '1932500000000000123',
    })) as Record<string, unknown>

    expect(payload.accountId).toBe('1932500000000000123')
  })

  it('supplier 保存载荷保留业务配置白名单内的 shortName 字段', async () => {
    const payload = (await submitRecord('supplier', {
      id: '9001',
      supplierCode: 'SUP0001',
      supplierName: '河北钢铁贸易',
      shortName: '河钢',
      contactName: '张伟',
      status: '正常',
    })) as Record<string, unknown>

    expect(payload.shortName).toBe('河钢')
  })

  it('project 保存载荷保留允许品牌/材质多值字段', async () => {
    const payload = (await submitRecord('project', {
      id: '9001',
      projectCode: 'XM001',
      projectName: '项目一',
      customerId: '1001',
      customerCode: 'KH001',
      settlementCompanyId: '2001',
      settlementCompanyName: '结算主体甲',
      status: '正常',
      allowedBrands: ['沙钢', '永钢'],
      allowedMaterials: ['HRB400'],
    })) as Record<string, unknown>

    expect(payload.allowedBrands).toEqual(['沙钢', '永钢'])
    expect(payload.allowedMaterials).toEqual(['HRB400'])
  })

  it('project 未配置允许品牌/材质时下发空数组（后端按不限制处理）', async () => {
    const payload = (await submitRecord('project', {
      id: '9001',
      projectCode: 'XM001',
      projectName: '项目一',
      customerId: '1001',
      customerCode: 'KH001',
      status: '正常',
      allowedBrands: [],
      allowedMaterials: [],
    })) as Record<string, unknown>

    expect(payload.allowedBrands).toEqual([])
    expect(payload.allowedMaterials).toEqual([])
  })

  it('未声明 chargeItem 白名单的模块（sales-outbound）不下发 chargeItems 键', async () => {
    const payload = (await submitRecord('sales-outbound', {
      customerName: '客户A',
      projectName: '项目A',
      outboundDate: '2026-08-21 00:00:00',
      items: [
        {
          sourceSalesOrderItemId: '601',
          quantity: 1,
          pieceWeightTon: 0.5,
          piecesPerBundle: 0,
          unitPrice: 100,
        },
      ],
      chargeItems: [{ chargeName: '吊装费', amount: 88.5 }],
    })) as Record<string, unknown>

    // strictObject 契约：salesOutboundSaveRequestSchema 不接受未知键。
    expect(payload).not.toHaveProperty('chargeItems')
  })

  it('freight-bill 行级保存下发部分导入数量, 重量由后端按来源件重换算', async () => {
    const payload = (await submitRecord('freight-bill', {
      ...freightBillBaseRecord,
      items: [
        {
          sourceSalesOrderItemId: '501',
          quantity: 4,
          weightTon: 2,
          brand: '品牌甲',
        },
      ],
    })) as Record<string, unknown>

    expect(payload.items).toEqual([
      { sourceSalesOrderItemId: '501', quantity: 4 },
    ])
  })
})

describe('serializeBusinessRecordForSave 交付核定取价快照', () => {
  const salesOrderBaseRecord: Record<string, unknown> = {
    customerName: '客户A',
    projectName: '项目A',
    orderDate: '2026-10-08 00:00:00',
    deliveryDate: '2026-10-09 00:00:00',
    salesName: '销售员',
    items: [
      {
        materialCode: 'M-1',
        brand: '中天',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: '12',
        unit: '吨',
        warehouseName: '一号库',
        quantity: 1,
        pieceWeightTon: 1,
        piecesPerBundle: 0,
        unitPrice: 3400,
      },
    ],
  }

  it('sales-order 保存载荷保留 7 个取价快照字段(与后端 DTO 同名)', async () => {
    const payload = (await submitRecord('sales-order', {
      ...salesOrderBaseRecord,
      priceTargetDate: '2026-10-09',
      priceQuoteDate: '2026-10-13',
      priceQuotePeriod: '中午',
      priceDateBasis: 'ORDER',
      priceDateOffsetDays: 2,
      // 延后 3 个交易日: 与默认「往前 1 个」不同值, 写反/漏写都会被测出来
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 3,
    })) as Record<string, unknown>

    expect(payload).toMatchObject({
      priceTargetDate: '2026-10-09',
      priceQuoteDate: '2026-10-13',
      priceQuotePeriod: '中午',
      priceDateBasis: 'ORDER',
      priceDateOffsetDays: 2,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 3,
    })
  })

  it('sales-order 报单日期进入保存载荷（新建默认值为 dayjs 时按契约格式化）', async () => {
    const payload = (await submitRecord('sales-order', {
      ...salesOrderBaseRecord,
      // 新建草稿的 orderDate 默认值由 defaultDraftValues 提供，此处是 dayjs 对象而非字符串。
      orderDate: dayjs('2026-10-08'),
    })) as Record<string, unknown>

    expect(payload.orderDate).toBe('2026-10-08 00:00:00')

    const persisted = (await submitRecord(
      'sales-order',
      salesOrderBaseRecord,
    )) as Record<string, unknown>

    expect(persisted.orderDate).toBe('2026-10-08 00:00:00')
  })

  it('未取价的单据不下发快照键(后端按「未记录取价过程」清空)', async () => {
    const payload = (await submitRecord(
      'sales-order',
      salesOrderBaseRecord,
    )) as Record<string, unknown>

    expect(payload).not.toHaveProperty('priceTargetDate')
    expect(payload).not.toHaveProperty('priceQuotePeriod')
    expect(payload).not.toHaveProperty('priceDateOffsetDays')
    expect(payload).not.toHaveProperty('priceClosedSettleDirection')
    expect(payload).not.toHaveProperty('priceClosedSettleDays')
  })

  it('顺延交易日数越过 0..30 契约时被拒绝', async () => {
    await expect(
      submitRecord('sales-order', {
        ...salesOrderBaseRecord,
        priceTargetDate: '2026-10-09',
        priceQuoteDate: '2026-10-13',
        priceQuotePeriod: '中午',
        priceDateBasis: 'ORDER',
        priceDateOffsetDays: 31,
      }),
    ).rejects.toThrow()
  })
})
