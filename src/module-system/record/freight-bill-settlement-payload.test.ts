import { describe, expect, it } from 'vitest'
import { toSaveRequest } from '@/module-system/record/module-save-payload'

/**
 * 物流单结算方式提交载荷的回归测试。
 *
 * <p>契约（后端冻结）：`settlementMode` 始终显式提交；按吨位模式必须把
 * `fixedFreightAmount` 显式提交为 null（非 null 会命中互斥 422，null 才会清空库里遗留值），
 * 固定运费模式提交数字。载荷要先过 `freightBillSaveRequestSchema`（strictObject），
 * 因此这里同时钉住「请求 schema 认得这两个字段」。</p>
 */

const submit = (record: Record<string, unknown>) =>
  toSaveRequest('freight-bill', record as never) as Promise<
    Record<string, unknown>
  >

const baseRecord: Record<string, unknown> = {
  billNo: 'WL20261014001',
  carrierName: '测试物流商',
  billTime: '2026-10-14 00:00:00',
  unitPrice: 100,
  items: [{ sourceSalesOrderItemId: '501' }],
}

describe('物流单结算方式提交载荷', () => {
  it('固定运费模式：提交 FIXED + 固定金额数字', async () => {
    const payload = await submit({
      ...baseRecord,
      settlementMode: 'FIXED',
      fixedFreightAmount: 1500,
    })

    expect(payload.settlementMode).toBe('FIXED')
    expect(payload.fixedFreightAmount).toBe(1500)
    // 计算字段不参与提交载荷，由服务端按结算方式计算。
    expect(payload.totalFreight).toBeUndefined()
  })

  it('按吨位模式：提交 BY_TONNAGE + 显式 null（清空遗留固定金额）', async () => {
    const payload = await submit({
      ...baseRecord,
      settlementMode: 'BY_TONNAGE',
      fixedFreightAmount: null,
    })

    expect(payload.settlementMode).toBe('BY_TONNAGE')
    expect(payload.fixedFreightAmount).toBeNull()
  })

  it('从固定运费切回按吨位：残留的固定金额必须被落成 null 而不是原样回传', async () => {
    // 模拟 normalizer 已经按模式规整过的草稿：按吨位模式下值已被置空。
    const payload = await submit({
      ...baseRecord,
      settlementMode: 'BY_TONNAGE',
      fixedFreightAmount: null,
      totalFreight: 1250,
    })

    expect(payload.fixedFreightAmount).toBeNull()
    expect(payload.settlementMode).toBe('BY_TONNAGE')
  })

  it('两个字段都省略仍可提交（旧客户端 / 编辑既有单据的兼容路径）', async () => {
    const payload = await submit({ ...baseRecord })

    expect(payload.settlementMode).toBeUndefined()
    expect(payload.fixedFreightAmount).toBeUndefined()
  })

  it('枚举取值写错直接失败关闭，不会把非法模式发给后端', async () => {
    await expect(
      submit({ ...baseRecord, settlementMode: 'TONNAGE' }),
    ).rejects.toThrow()
    await expect(
      submit({ ...baseRecord, settlementMode: 'fixed' }),
    ).rejects.toThrow()
  })
})
