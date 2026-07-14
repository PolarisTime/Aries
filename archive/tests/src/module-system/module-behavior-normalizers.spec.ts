import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'
import './module-behavior-normalizers'

function makeItem(overrides: Partial<ModuleLineItem> = {}): ModuleLineItem {
  return {
    id: 'item-1',
    materialCode: '',
    brand: '',
    category: '',
    material: '',
    spec: '',
    length: '',
    unit: '吨',
    batchNo: '',
    quantityUnit: '件',
    pieceWeightTon: 0,
    piecesPerBundle: 0,
    quantity: 0,
    weightTon: 0,
    weighWeightTon: undefined,
    weightAdjustmentTon: 0,
    weightAdjustmentAmount: 0,
    unitPrice: 0,
    amount: 0,
    ...overrides,
  }
}

const stubCtx = {
  sumLineItemsBy: (_items: ModuleLineItem[], _field: string) => 100,
}

describe('module-behavior-normalizers', () => {
  it('registers freight-bill normalizeDraftRecord', () => {
    const config = moduleBehaviorRegistry.get('freight-bill')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({
        sourceNo: 'SO001',
        customerName: '客户A',
        projectName: '项目X',
        weightTon: 10,
      }),
      makeItem({
        sourceNo: 'SO002',
        customerName: '客户B',
        projectName: '项目Y',
        weightTon: 20,
      }),
    ]
    const record: any = { unitPrice: 2 }
    normalize(record, items, stubCtx)

    expect(record.outboundNo).toBe('SO001, SO002')
    expect(record.customerName).toBe('多客户')
    expect(record.projectName).toBe('多项目')
    expect(record.totalWeight).toBe(100)
    expect(record.totalFreight).toBe(200)
  })

  it('freight-bill normalize handles single customer and project', () => {
    const config = moduleBehaviorRegistry.get('freight-bill')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({
        sourceNo: 'SO001',
        customerName: '客户A',
        projectName: '项目X',
      }),
    ]
    const record: any = {}
    normalize(record, items, { sumLineItemsBy: () => 50 } as any)

    expect(record.customerName).toBe('客户A')
    expect(record.projectName).toBe('项目X')
    expect(record.outboundNo).toBe('SO001')
  })

  it('freight-bill normalize handles empty items without sourceNo', () => {
    const config = moduleBehaviorRegistry.get('freight-bill')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [makeItem({})]
    const record: any = { outboundNo: 'EXISTING' }
    normalize(record, items, { sumLineItemsBy: () => 0 } as any)

    expect(record.outboundNo).toBe('EXISTING')
    expect(record.customerName).toBeUndefined()
    expect(record.projectName).toBeUndefined()
  })

  it('registers freight-statement normalizeDraftRecord', () => {
    const config = moduleBehaviorRegistry.get('freight-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({
        sourceNo: 'FB001',
        _parentTotalFreight: 500,
        _parentBillTime: '2026-01-01',
      }),
      makeItem({
        sourceNo: 'FB002',
        _parentTotalFreight: 300,
        _parentBillTime: '2026-01-15',
      }),
    ]
    const record: any = { paidAmount: 400 }
    normalize(record, items, stubCtx)

    expect(record.sourceBillNos).toBe('FB001, FB002')
    expect(record.totalWeight).toBe(100)
    expect(record.totalFreight).toBe(800)
    expect(record.startDate).toBe('2026-01-01')
    expect(record.endDate).toBe('2026-01-15')
    expect(record.paidAmount).toBe(400)
    expect(record.unpaidAmount).toBe(400)
  })

  it('freight-statement normalize handles empty items', () => {
    const config = moduleBehaviorRegistry.get('freight-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = {}
    normalize(record, [], stubCtx)
    expect(record.paidAmount).toBe(0)
    expect(record.unpaidAmount).toBe(0)
  })

  it('freight-statement normalize handles attachments', () => {
    const config = moduleBehaviorRegistry.get('freight-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = {
      attachments: [{ name: 'file1.pdf' }, { name: 'file2.pdf' }, { name: '' }],
    }
    normalize(record, [], stubCtx)
    expect(record.attachment).toBe('file1.pdf, file2.pdf')
  })

  it('registers supplier-statement normalizeDraftRecord', () => {
    const config = moduleBehaviorRegistry.get('supplier-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({
        sourceNo: 'RK001',
        _parentBillTime: '2026-01-01',
        amount: 1000,
      }),
      makeItem({
        sourceNo: 'RK002',
        _parentBillTime: '2026-01-31',
        amount: 2000,
      }),
    ]
    const record: any = { paymentAmount: 1500 }
    normalize(record, items, { sumLineItemsBy: () => 3000 } as any)

    expect(record.purchaseAmount).toBe(3000)
    expect(record.sourceInboundNos).toBe('RK001, RK002')
    expect(record.startDate).toBe('2026-01-01')
    expect(record.endDate).toBe('2026-01-31')
    expect(record.paymentAmount).toBe(1500)
    expect(record.closingAmount).toBe(3000)
  })

  it('registers customer-statement normalizeDraftRecord', () => {
    const config = moduleBehaviorRegistry.get('customer-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({
        sourceNo: 'XS001',
        _parentBillTime: '2026-02-01',
        amount: 5000,
      }),
    ]
    const record: any = { receiptAmount: 3000 }
    normalize(record, items, { sumLineItemsBy: () => 5000 } as any)

    expect(record.salesAmount).toBe(5000)
    expect(record.sourceOrderNos).toBe('XS001')
    expect(record.startDate).toBe('2026-02-01')
    expect(record.endDate).toBe('2026-02-01')
    expect(record.receiptAmount).toBe(3000)
    expect(record.closingAmount).toBe(5000)
  })

  it('registers invoice-receipt normalizeDraftRecord', () => {
    const config = moduleBehaviorRegistry.get('invoice-receipt')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = {}
    normalize(record, [makeItem({ sourceNo: 'PO001' })], {
      sumLineItemsBy: () => 2000,
    } as any)
    expect(record.amount).toBe(2000)
    expect(record.sourcePurchaseOrderNos).toBe('PO001')
  })

  it('registers invoice-issue normalizeDraftRecord', () => {
    const config = moduleBehaviorRegistry.get('invoice-issue')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = {}
    normalize(record, [makeItem({ sourceNo: 'SO001' })], {
      sumLineItemsBy: () => 3000,
    } as any)
    expect(record.amount).toBe(3000)
    expect(record.sourceSalesOrderNos).toBe('SO001')
  })

  it('handles empty items in invoice normalizers', () => {
    for (const key of ['invoice-receipt', 'invoice-issue']) {
      const config = moduleBehaviorRegistry.get(key)
      const normalize = config!.normalizeDraftRecord as (
        record: any,
        items: ModuleLineItem[],
        ctx: any,
      ) => void
      const record: any = {}
      normalize(record, [], { sumLineItemsBy: () => 0 } as any)
      expect(record.amount).toBeUndefined()
    }
  })

  it('freight-statement normalize handles items without sourceNo', () => {
    const config = moduleBehaviorRegistry.get('freight-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [makeItem({ sourceNo: '' })]
    const record: any = {}
    normalize(record, items, stubCtx)
    expect(record.sourceBillNos).toBeUndefined()
    expect(record.paidAmount).toBe(0)
    expect(record.unpaidAmount).toBe(0)
  })

  it('freight-statement normalize handles non-array attachments', () => {
    const config = moduleBehaviorRegistry.get('freight-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = { attachments: 'not-an-array' }
    normalize(record, [], stubCtx)
    expect(record.attachment).toBeUndefined()
  })

  it('supplier-statement normalize handles empty items', () => {
    const config = moduleBehaviorRegistry.get('supplier-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = { paymentAmount: 500 }
    normalize(record, [], stubCtx)
    expect(record.purchaseAmount).toBeUndefined()
    expect(record.sourceInboundNos).toBeUndefined()
    expect(record.paymentAmount).toBe(500)
    expect(record.closingAmount).toBe(0)
  })

  it('customer-statement normalize handles empty items', () => {
    const config = moduleBehaviorRegistry.get('customer-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = { receiptAmount: 300 }
    normalize(record, [], stubCtx)
    expect(record.salesAmount).toBeUndefined()
    expect(record.sourceOrderNos).toBeUndefined()
    expect(record.receiptAmount).toBe(300)
    expect(record.closingAmount).toBe(0)
  })

  it('freight-bill normalize handles empty sourceNo items with existing outboundNo', () => {
    const config = moduleBehaviorRegistry.get('freight-bill')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({ sourceNo: '', customerName: '', projectName: '' }),
    ]
    const record: any = { outboundNo: 'EXISTING', unitPrice: 3 }
    normalize(record, items, { sumLineItemsBy: () => 0 } as any)
    expect(record.outboundNo).toBe('EXISTING')
    expect(record.totalFreight).toBe(0)
  })

  it('freight-bill normalize falls back to the first source item when collected source numbers are empty', () => {
    const config = moduleBehaviorRegistry.get('freight-bill')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const item = makeItem({ customerName: '', projectName: '' })
    let sourceNoReadCount = 0
    Object.defineProperty(item, 'sourceNo', {
      configurable: true,
      get() {
        sourceNoReadCount += 1
        return sourceNoReadCount === 2 ? '' : 'SO-FALLBACK'
      },
    })
    const record: any = {}
    normalize(record, [item], { sumLineItemsBy: () => 0 } as any)

    expect(record.outboundNo).toBe('SO-FALLBACK')
    expect(record.totalFreight).toBe(0)
  })

  it('freight-bill normalize handles no customer/project names', () => {
    const config = moduleBehaviorRegistry.get('freight-bill')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [makeItem({})]
    const record: any = {}
    normalize(record, items, { sumLineItemsBy: () => 0 } as any)
    expect(record.customerName).toBeUndefined()
    expect(record.projectName).toBeUndefined()
  })

  it('freight-statement normalize ignores duplicate source freight and missing bill dates', () => {
    const config = moduleBehaviorRegistry.get('freight-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const items = [
      makeItem({ sourceNo: 'FB001' }),
      makeItem({ sourceNo: 'FB001', _parentTotalFreight: 300 }),
    ]
    const record: any = {}
    normalize(record, items, { sumLineItemsBy: () => 12.3456 } as any)

    expect(record.sourceBillNos).toBe('FB001')
    expect(record.totalFreight).toBe(0)
    expect(record.startDate).toBeUndefined()
    expect(record.endDate).toBeUndefined()
  })

  it('supplier-statement normalize handles items without source dates or payment amount', () => {
    const config = moduleBehaviorRegistry.get('supplier-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = {}
    normalize(record, [makeItem({ sourceNo: 'RK001', _parentBillTime: '' })], {
      sumLineItemsBy: () => 120,
    } as any)

    expect(record.purchaseAmount).toBe(120)
    expect(record.sourceInboundNos).toBe('RK001')
    expect(record.startDate).toBeUndefined()
    expect(record.endDate).toBeUndefined()
    expect(record.paymentAmount).toBe(0)
    expect(record.closingAmount).toBe(120)
  })

  it('customer-statement normalize handles items without source dates or receipt amount', () => {
    const config = moduleBehaviorRegistry.get('customer-statement')
    const normalize = config!.normalizeDraftRecord as (
      record: any,
      items: ModuleLineItem[],
      ctx: any,
    ) => void

    const record: any = {}
    normalize(record, [makeItem({ sourceNo: 'XS001', _parentBillTime: '' })], {
      sumLineItemsBy: () => 240,
    } as any)

    expect(record.salesAmount).toBe(240)
    expect(record.sourceOrderNos).toBe('XS001')
    expect(record.startDate).toBeUndefined()
    expect(record.endDate).toBeUndefined()
    expect(record.receiptAmount).toBe(0)
    expect(record.closingAmount).toBe(240)
  })
})
