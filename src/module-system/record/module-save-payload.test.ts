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
})
