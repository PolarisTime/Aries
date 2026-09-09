import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildSalesOutboundOverview,
  buildSalesOutboundParentFilters,
  mapSalesOrderToOutboundDraft,
  transformSalesOrderItemsToOutboundItems,
} from './sales-outbound-rules'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: '1932500000000000001', ...overrides }
}

describe('sales-outbound-rules', () => {
  describe('buildSalesOutboundOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildSalesOutboundOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
        true,
      )
    })
  })

  describe('buildSalesOutboundParentFilters', () => {
    it('透传当前记录 ID', () => {
      expect(
        buildSalesOutboundParentFilters({ id: '1932500000000000001' }),
      ).toEqual({ currentRecordId: '1932500000000000001' })
    })
  })

  describe('mapSalesOrderToOutboundDraft', () => {
    it('映射客户与项目快照，缺省回退空串', () => {
      const draft = mapSalesOrderToOutboundDraft(
        recordWith({
          customerId: '1932500000000000002',
          customerName: '客户甲',
          projectId: '1932500000000000003',
          projectName: '项目A',
          settlementCompanyId: '1932500000000000004',
          settlementCompanyName: '主体一',
        }),
      )
      expect(draft).toEqual({
        customerId: '1932500000000000002',
        customerName: '客户甲',
        projectId: '1932500000000000003',
        projectName: '项目A',
        settlementCompanyId: '1932500000000000004',
        settlementCompanyName: '主体一',
      })
      expect(mapSalesOrderToOutboundDraft(recordWith({}))).toMatchObject({
        customerName: '',
        projectName: '',
        settlementCompanyName: '',
      })
    })
  })

  describe('transformSalesOrderItemsToOutboundItems', () => {
    it('父单无明细返回空数组', () => {
      expect(transformSalesOrderItemsToOutboundItems(recordWith({}))).toEqual(
        [],
      )
    })

    it('写入来源单号与来源明细 ID', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          orderNo: ' SO-3 ',
          items: [{ id: '1932500000000000002', weightTon: 1 }],
        }),
      )
      expect(items[0]).toMatchObject({
        sourceNo: ' SO-3 ',
        sourceSalesOrderItemId: '1932500000000000002',
        weightTon: 1,
      })
    })

    it('无单号时来源为空串', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          items: [{ id: '1932500000000000002' }],
        }),
      )
      expect(items[0].sourceNo).toBe('')
    })
  })
})
