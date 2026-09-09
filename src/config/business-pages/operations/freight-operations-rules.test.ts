import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildFreightBillOverview,
  buildFreightBillParentFilters,
  transformSalesOrderItemsToFreightBillItems,
  validateFreightBillBeforeOpen,
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

  describe('validateFreightBillBeforeOpen', () => {
    it('未选物流商返回提示', () => {
      expect(validateFreightBillBeforeOpen({})).toBe(
        '请先选择物流商，再选择销售订单',
      )
      expect(validateFreightBillBeforeOpen({ carrierId: '   ' })).toBe(
        '请先选择物流商，再选择销售订单',
      )
    })

    it('已选物流商返回 null', () => {
      expect(
        validateFreightBillBeforeOpen({
          carrierId: '1932500000000000001',
        }),
      ).toBeNull()
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
  })
})
