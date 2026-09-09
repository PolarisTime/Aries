import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findProjectOption: vi.fn(),
}))

vi.mock('@/module-system/core/module-option-resolvers', () => ({
  findProjectOption: mocks.findProjectOption,
}))

import type { ModuleRecord } from '@/types/module-page'
import {
  buildCustomerStatementOverview,
  buildCustomerStatementParentFilters,
  mapSalesOrderToCustomerStatementDraft,
  transformSalesOrderItemsToCustomerStatementItems,
  validateCustomerStatementBeforeOpen,
  validateCustomerStatementParentImport,
} from './customer-statement-rules'

const entityId = '1932500000000000001'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: entityId, ...overrides }
}

describe('customer-statement-rules', () => {
  beforeEach(() => {
    mocks.findProjectOption.mockReset()
  })

  describe('buildCustomerStatementOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildCustomerStatementOverview([])
      expect(overview).toHaveLength(4)
      expect(overview.map((item) => item.value)).toEqual([
        '0',
        '0.00',
        '0.00',
        '0.00',
      ])
    })
  })

  describe('buildCustomerStatementParentFilters', () => {
    it('空值字段输出 undefined，便于后端忽略筛选', () => {
      const filters = buildCustomerStatementParentFilters({})
      expect(filters.customerId).toBeUndefined()
      expect(filters.projectId).toBeUndefined()
      expect(filters.currentRecordId).toBeUndefined()
    })

    it('非法雪花 ID 抛错', () => {
      expect(() =>
        buildCustomerStatementParentFilters({
          customerId: 'abc',
        }),
      ).toThrow()
    })
  })

  describe('validateCustomerStatementBeforeOpen', () => {
    it('未选客户返回提示', () => {
      expect(validateCustomerStatementBeforeOpen({})).toBe(
        '请先选择客户，再选择销售订单',
      )
    })

    it('已选客户返回 null', () => {
      expect(
        validateCustomerStatementBeforeOpen({ customerId: entityId }),
      ).toBeNull()
    })
  })

  describe('mapSalesOrderToCustomerStatementDraft', () => {
    it('映射父单基础字段并回退项目结算主体', () => {
      mocks.findProjectOption.mockReturnValue({
        settlementCompanyId: 'sc-1',
        settlementCompanyName: '主体一',
      })
      const draft = mapSalesOrderToCustomerStatementDraft(
        recordWith({
          customerId: entityId,
          customerCode: ' C001 ',
          customerName: '客户甲',
          projectId: '1932500000000000002',
          projectName: '项目A',
          deliveryDate: '2026-01-01',
        }),
      )
      expect(draft).toMatchObject({
        customerCode: 'C001',
        customerName: '客户甲',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        receiptAmount: 0,
        status: '待确认',
        settlementCompanyId: 'sc-1',
        settlementCompanyName: '主体一',
      })
    })

    it('无项目选项时结算主体为空', () => {
      mocks.findProjectOption.mockReturnValue(undefined)
      const draft = mapSalesOrderToCustomerStatementDraft(
        recordWith({ customerId: entityId }),
      )
      expect(draft.settlementCompanyId).toBeUndefined()
      expect(draft.settlementCompanyName).toBe('')
    })
  })

  describe('validateCustomerStatementParentImport', () => {
    const base = {
      currentParentNos: [],
    }

    it('客户不一致返回错误', () => {
      const error = validateCustomerStatementParentImport({
        ...base,
        currentRecord: { customerId: entityId },
        currentItems: [],
        parentRecord: recordWith({
          customerId: '1932500000000000009',
        }),
      })
      expect(error).toBe('只能选择同一客户的销售订单生成客户对账单')
    })

    it('当前未选客户返回错误', () => {
      const error = validateCustomerStatementParentImport({
        ...base,
        currentRecord: {},
        currentItems: [],
        parentRecord: recordWith({ customerId: entityId }),
      })
      expect(error).toBe('只能选择同一客户的销售订单生成客户对账单')
    })

    it('已有项目且父单项目不在其中返回错误', () => {
      const error = validateCustomerStatementParentImport({
        ...base,
        currentRecord: {
          customerId: entityId,
          projectId: '1932500000000000002',
        },
        currentItems: [],
        parentRecord: recordWith({
          customerId: entityId,
          projectId: '1932500000000000003',
        }),
      })
      expect(error).toBe('只能选择同一项目的销售订单生成客户对账单')
    })

    it('明细项目与父单项目一致时通过', () => {
      const error = validateCustomerStatementParentImport({
        ...base,
        currentRecord: {
          customerId: entityId,
          projectId: '1932500000000000002',
        },
        currentItems: [
          { id: entityId, projectId: '1932500000000000003' },
        ] as never,
        parentRecord: recordWith({
          customerId: entityId,
          projectId: '1932500000000000003',
        }),
      })
      expect(error).toBeNull()
    })

    it('无既有项目约束时通过', () => {
      const error = validateCustomerStatementParentImport({
        ...base,
        currentRecord: { customerId: entityId },
        currentItems: [],
        parentRecord: recordWith({ customerId: entityId }),
      })
      expect(error).toBeNull()
    })
  })

  describe('transformSalesOrderItemsToCustomerStatementItems', () => {
    it('父单无明细返回空数组', () => {
      expect(
        transformSalesOrderItemsToCustomerStatementItems(recordWith({})),
      ).toEqual([])
    })

    it('补全来源字段并回退客户/项目', () => {
      const items = transformSalesOrderItemsToCustomerStatementItems(
        recordWith({
          orderNo: ' SO-1 ',
          customerId: entityId,
          projectId: '1932500000000000002',
          deliveryDate: '2026-02-01',
          items: [{ id: '1932500000000000003', weightTon: 1.5 }],
        }),
      )
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        id: 'SO-1-1932500000000000003',
        sourceNo: 'SO-1',
        sourceSalesOrderItemId: '1932500000000000003',
        customerId: entityId,
        projectId: '1932500000000000002',
        warehouseId: undefined,
        _parentBillTime: '2026-02-01',
      })
    })

    it('无单号时回退 sales-order 前缀', () => {
      const items = transformSalesOrderItemsToCustomerStatementItems(
        recordWith({
          items: [{ id: '1932500000000000003' }],
        }),
      )
      expect(items[0].id).toBe('sales-order-1932500000000000003')
    })

    it('明细缺失 id 时使用序号回退', () => {
      const items = transformSalesOrderItemsToCustomerStatementItems(
        recordWith({
          orderNo: 'SO-2',
          items: [{ weightTon: 2 }],
        }),
      )
      expect(items[0].id).toBe('SO-2-0')
    })
  })
})
