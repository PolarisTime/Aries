import { describe, expect, it } from 'vitest'
import { invoiceIssuePageConfig } from './invoice-issue-page'

describe('invoiceIssuePageConfig', () => {
  const pi = invoiceIssuePageConfig.parentImport!

  it('has required config fields', () => {
    expect(invoiceIssuePageConfig.key).toBe('invoice-issue')
    expect(invoiceIssuePageConfig.title).toBeTruthy()
    expect(invoiceIssuePageConfig.primaryNoKey).toBeTruthy()
    expect(Array.isArray(invoiceIssuePageConfig.columns)).toBe(true)
    expect(invoiceIssuePageConfig.buildOverview).toBeTypeOf('function')
  })

  describe('parentImport', () => {
    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        customerName: '客户A',
        projectName: '项目X',
        settlementCompanyId: 8,
        settlementCompanyName: '主体B',
      } as any)
      expect(draft).toEqual({
        customerName: '客户A',
        projectName: '项目X',
        settlementCompanyId: 8,
        settlementCompanyName: '主体B',
      })
    })

    it('mapParentToDraft handles missing fields', () => {
      const draft = pi.mapParentToDraft!({} as any)
      expect(draft.customerName).toBe('')
      expect(draft.projectName).toBe('')
      expect(draft.settlementCompanyId).toBeUndefined()
      expect(draft.settlementCompanyName).toBe('')
    })

    it('validateParentImport rejects mismatched settlement company', () => {
      const result = pi.validateParentImport!({
        currentRecord: { settlementCompanyId: 1 },
        currentItems: [],
        parentRecord: { settlementCompanyId: 2 },
      } as any)

      expect(result).toContain('结算主体')
    })

    it('validateParentImport rejects mismatched customer', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A' },
        currentItems: [],
        parentRecord: { customerName: '客户B' },
      } as any)

      expect(result).toBe('只能选择同一客户的销售订单生成开票单')
    })

    it('validateParentImport rejects mismatched project', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A', projectName: '项目A' },
        currentItems: [],
        parentRecord: { customerName: ' 客户A ', projectName: '项目B' },
      } as any)

      expect(result).toBe('只能选择同一项目的销售订单生成开票单')
    })

    it('validateParentImport accepts matching parent record', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          customerName: '客户A',
          projectName: '项目A',
          settlementCompanyId: 1,
        },
        currentItems: [],
        parentRecord: {
          customerName: ' 客户A ',
          projectName: ' 项目A ',
          settlementCompanyId: '1',
        },
      } as any)

      expect(result).toBeNull()
    })

    it('transformItems maps items with invoice-issue fields', () => {
      const items = pi.transformItems!({
        orderNo: 'SO-001',
        id: 5,
        items: [
          {
            id: 1,
            materialName: '螺纹钢',
            weightTon: 10,
            amount: 5000,
            quantity: 100,
          },
        ],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('invoice-issue-item-5-1')
      expect(items[0].sourceNo).toBe('SO-001')
      expect(items[0].sourceSalesOrderItemId).toBe(1)
      expect(items[0]._maxImportWeightTon).toBe(10)
      expect(items[0]._maxImportAmount).toBe(5000)
      expect(items[0].maxImportQuantity).toBe(100)
    })

    it('transformItems falls back to empty source number', () => {
      const items = pi.transformItems!({
        id: 5,
        items: [{ id: 1 }],
      } as any)

      expect(items[0].sourceNo).toBe('')
    })

    it('transformItems returns empty array when no items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })

  it('buildOverview delegates amount overview generation', () => {
    const overview = invoiceIssuePageConfig.buildOverview([
      { amount: 1200, status: '草稿' },
      { amount: 300, status: '已开票' },
    ] as any)

    expect(overview.map((item) => item.value)).toContain('1500.00')
  })
})
