import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { freightOperationsPageConfigs } from './freight-operations'
import {
  buildFreightBillOverview,
  buildFreightBillParentFilters,
  transformSalesOrderItemsToFreightBillItems,
} from './freight-operations-rules'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: '1932500000000000001', ...overrides }
}

describe('freight-operations-rules', () => {
  describe('buildFreightBillOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildFreightBillOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
        true,
      )
    })
  })

  describe('buildFreightBillParentFilters', () => {
    it('无当前记录 ID 时输出 undefined', () => {
      expect(buildFreightBillParentFilters({})).toEqual({
        currentRecordId: undefined,
      })
      expect(
        buildFreightBillParentFilters({ id: '1932500000000000001' }),
      ).toEqual({ currentRecordId: '1932500000000000001' })
    })
  })

  describe('选择销售订单导入的前置条件', () => {
    /*
     * 业务确认：选择销售订单 **不需要** 先选物流商。
     * 导入明细的结算主体取自上级销售订单行（见 transformSalesOrderItemsToFreightBillItems），
     * 与物流商无关；此前的"请先选择物流商"门槛会让"先导入、后补物流商"的正常顺序走不通。
     * 这里钉住"没有前置校验"，防止它被重新加回来。
     */
    it('不设置 validateBeforeOpen（先导入后补物流商也应可用）', () => {
      const parentImport =
        freightOperationsPageConfigs['freight-bill']?.parentImport
      expect(parentImport).toBeDefined()
      expect(parentImport?.validateBeforeOpen).toBeUndefined()
    })
  })

  describe('transformSalesOrderItemsToFreightBillItems', () => {
    it('父单无明细返回空数组', () => {
      expect(
        transformSalesOrderItemsToFreightBillItems(recordWith({})),
      ).toEqual([])
    })

    it('写入来源与结算主体快照', () => {
      const items = transformSalesOrderItemsToFreightBillItems(
        recordWith({
          orderNo: ' SO-9 ',
          customerName: ' 客户甲 ',
          projectName: ' 项目A ',
          settlementCompanyName: ' 主体一 ',
          customerId: '1932500000000000002',
          projectId: '1932500000000000003',
          settlementCompanyId: '1932500000000000004',
          items: [
            {
              id: '1932500000000000005',
              brand: ' 品牌甲 ',
              settlementCompanyId: '1932500000000000008',
              settlementCompanyName: ' 主体明细 ',
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        id: 'SO-9-1932500000000000005',
        sourceNo: 'SO-9',
        sourceSalesOrderItemId: '1932500000000000005',
        materialName: '品牌甲',
        customerId: '1932500000000000002',
        customerName: '客户甲',
        projectId: '1932500000000000003',
        projectName: '项目A',
        settlementCompanyId: '1932500000000000008',
        settlementCompanyName: '主体明细',
      })
    })

    it('明细缺失结算主体时回退父单', () => {
      const items = transformSalesOrderItemsToFreightBillItems(
        recordWith({
          orderNo: 'SO-9',
          customerId: '1932500000000000002',
          projectId: '1932500000000000003',
          settlementCompanyId: '1932500000000000004',
          settlementCompanyName: '主体一',
          items: [{ id: '1932500000000000005', brand: '品牌甲' }],
        }),
      )
      expect(items[0]).toMatchObject({
        settlementCompanyId: '1932500000000000004',
        settlementCompanyName: '主体一',
      })
    })

    it('以行级 remainingQuantity 作为默认数量并按件重换算重量金额与上限', () => {
      const items = transformSalesOrderItemsToFreightBillItems(
        recordWith({
          orderNo: 'SO-9',
          items: [
            {
              id: '1932500000000000005',
              brand: '品牌甲',
              quantity: 10,
              remainingQuantity: 4,
              pieceWeightTon: 0.5,
              unitPrice: 100,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        quantity: 4,
        weightTon: 2,
        amount: 200,
        remainingQuantity: 4,
        remainingWeightTon: 2,
        remainingAmount: 200,
      })
    })

    it('remainingQuantity 为 0 时默认数量为 0 并保留上限交由导入逻辑过滤', () => {
      const items = transformSalesOrderItemsToFreightBillItems(
        recordWith({
          items: [
            {
              id: '1932500000000000006',
              quantity: 3,
              remainingQuantity: 0,
              pieceWeightTon: 1,
              unitPrice: 10,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        quantity: 0,
        remainingQuantity: 0,
        remainingWeightTon: 0,
        remainingAmount: 0,
      })
    })

    it('缺少 remainingQuantity 时回退来源数量且不追加派生字段', () => {
      const items = transformSalesOrderItemsToFreightBillItems(
        recordWith({
          orderNo: 'SO-9',
          items: [
            {
              id: '1932500000000000007',
              brand: '品牌甲',
              quantity: 8,
              pieceWeightTon: 2,
              weightTon: 16,
              unitPrice: 5,
              amount: 80,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        quantity: 8,
        weightTon: 16,
        amount: 80,
      })
      expect(items[0].remainingQuantity).toBeUndefined()
      expect(items[0].remainingWeightTon).toBeUndefined()
    })
  })
})
