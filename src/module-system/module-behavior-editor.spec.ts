import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'

const {
  getSettlementCompanyOptionsMock,
  findCustomerOptionMock,
  findProjectOptionMock,
  findCarrierOptionMock,
  findSupplierOptionMock,
} = vi.hoisted(() => ({
  getSettlementCompanyOptionsMock: vi.fn(),
  findCustomerOptionMock: vi.fn(),
  findProjectOptionMock: vi.fn(),
  findCarrierOptionMock: vi.fn(),
  findSupplierOptionMock: vi.fn(),
}))

vi.mock('@/api/company-settings', () => ({
  getSettlementCompanyOptions: getSettlementCompanyOptionsMock,
}))

vi.mock('@/api/customer-options', () => ({
  findCustomerOption: findCustomerOptionMock,
}))

vi.mock('@/api/project-options', () => ({
  findProjectOption: findProjectOptionMock,
}))

vi.mock('@/api/carrier-options', () => ({
  findCarrierOption: findCarrierOptionMock,
}))

vi.mock('@/api/supplier-options', () => ({
  findSupplierOption: findSupplierOptionMock,
}))

const settlementCompanyOptions = [
  { id: '9', value: ' 9 ', label: '主体A', companyName: '主体A' },
  { id: '10', value: '10', label: '主体B', companyName: '主体B' },
]

type SyncEditorForm = (
  form: Record<string, unknown>,
  ctx: { changedKeys: Set<string> },
) => void

function getSyncEditorForm(moduleKey: string) {
  const syncEditorForm = moduleBehaviorRegistry.get(moduleKey)?.syncEditorForm

  expect(syncEditorForm).toBeTypeOf('function')

  return syncEditorForm as SyncEditorForm
}

describe('module-behavior-editor', () => {
  beforeEach(() => {
    getSettlementCompanyOptionsMock.mockReset()
    getSettlementCompanyOptionsMock.mockReturnValue(settlementCompanyOptions)
    findCustomerOptionMock.mockReset()
    findProjectOptionMock.mockReset()
    findCarrierOptionMock.mockReset()
    findSupplierOptionMock.mockReset()
  })

  it('registers carrier with priceMode default', () => {
    const config = moduleBehaviorRegistry.get('carrier')
    expect(config?.defaultDraftValues).toEqual({ priceMode: '按吨' })
  })

  it('carrier syncEditorForm snapshots the default settlement company name', () => {
    const syncEditorForm = getSyncEditorForm('carrier')

    const unchangedForm = {
      defaultSettlementCompanyId: '9',
      defaultSettlementCompanyName: '保留主体',
    }
    syncEditorForm(unchangedForm, { changedKeys: new Set(['carrierName']) })
    expect(unchangedForm.defaultSettlementCompanyName).toBe('保留主体')
    expect(getSettlementCompanyOptionsMock).not.toHaveBeenCalled()

    const changedForm = {
      defaultSettlementCompanyId: '9',
      defaultSettlementCompanyName: '',
    }
    syncEditorForm(changedForm, {
      changedKeys: new Set(['defaultSettlementCompanyId']),
    })
    expect(changedForm.defaultSettlementCompanyName).toBe('主体A')
    expect(getSettlementCompanyOptionsMock).toHaveBeenCalledTimes(1)
  })

  it('customer syncEditorForm clears the default settlement company name when id is blank', () => {
    const syncEditorForm = getSyncEditorForm('customer')

    const unchangedForm = {
      defaultSettlementCompanyId: '9',
      defaultSettlementCompanyName: '保留主体',
    }
    syncEditorForm(unchangedForm, { changedKeys: new Set(['customerName']) })
    expect(unchangedForm.defaultSettlementCompanyName).toBe('保留主体')
    expect(getSettlementCompanyOptionsMock).not.toHaveBeenCalled()

    const blankIdForm = {
      defaultSettlementCompanyId: '   ',
      defaultSettlementCompanyName: '旧主体',
    }
    syncEditorForm(blankIdForm, {
      changedKeys: new Set(['defaultSettlementCompanyId']),
    })
    expect(blankIdForm.defaultSettlementCompanyName).toBe('')
    expect(getSettlementCompanyOptionsMock).not.toHaveBeenCalled()
  })

  it('registers sales-order with editableLockedFields', () => {
    const config = moduleBehaviorRegistry.get('sales-order')
    expect(config?.editableLockedFields).toEqual(['deliveryDate', 'remark'])
    expect(config?.editableLockedItemColumns).toEqual(['unitPrice'])
    expect(config?.partiallyEditableStatuses).toEqual(['交付核定'])
    expect(config?.defaultOperatorField).toBe('salesName')
    expect(hasBehavior('sales-order', 'supportsStatements')).toBe(true)
    expect(hasBehavior('sales-order', 'supportsFreightPickup')).toBe(true)
  })

  it('sales-order atomically snapshots a selected customer identity', () => {
    findCustomerOptionMock.mockReturnValue({
      id: '1',
      customerCode: 'C001',
      customerName: '客户A',
      defaultSettlementCompanyId: 9,
      defaultSettlementCompanyName: '主体A',
    })
    const form = {
      customerId: '1',
      customerCode: 'OLD',
      customerName: '旧客户',
      projectId: '101',
      projectName: '旧项目',
    } as Record<string, unknown>

    getSyncEditorForm('sales-order')(form, {
      changedKeys: new Set(['customerId']),
    })

    expect(findCustomerOptionMock).toHaveBeenCalledWith('1')
    expect(form.customerCode).toBe('C001')
    expect(form.customerName).toBe('客户A')
    expect(form.projectId).toBe('')
    expect(form.projectName).toBe('')
    expect(form.settlementCompanyId).toBe('9')
    expect(form.settlementCompanyName).toBe('主体A')
  })

  it('sales-order snapshots a selected project only within its customer', () => {
    findProjectOptionMock.mockReturnValue({
      id: '101',
      customerId: '1',
      projectCode: 'P001',
      projectName: '项目A',
    })
    const form = {
      customerId: '1',
      projectId: '101',
      projectName: '旧项目',
    } as Record<string, unknown>

    getSyncEditorForm('sales-order')(form, {
      changedKeys: new Set(['projectId']),
    })

    expect(findProjectOptionMock).toHaveBeenCalledWith('101', '1')
    expect(form.projectId).toBe('101')
    expect(form.projectName).toBe('项目A')
  })

  it('invoice-issue snapshots stable customer and project identities', () => {
    findCustomerOptionMock.mockReturnValue({
      id: '700520000000000001',
      customerCode: 'C001',
      customerName: '客户A',
      defaultSettlementCompanyId: '9',
      defaultSettlementCompanyName: '主体A',
    })
    const form = {
      customerId: '700520000000000001',
      customerName: '旧客户',
      projectId: '700520000000000002',
      projectName: '旧项目',
    } as Record<string, unknown>
    const syncEditorForm = getSyncEditorForm('invoice-issue')

    syncEditorForm(form, { changedKeys: new Set(['customerId']) })

    expect(form).toMatchObject({
      customerId: '700520000000000001',
      customerCode: 'C001',
      customerName: '客户A',
      projectId: '',
      projectName: '',
      settlementCompanyId: '9',
      settlementCompanyName: '主体A',
    })

    findProjectOptionMock.mockReturnValue({
      id: '700520000000000002',
      customerId: '700520000000000001',
      projectCode: 'P001',
      projectName: '项目A',
    })
    form.projectId = '700520000000000002'
    syncEditorForm(form, { changedKeys: new Set(['projectId']) })

    expect(findProjectOptionMock).toHaveBeenCalledWith(
      '700520000000000002',
      '700520000000000001',
    )
    expect(form.projectName).toBe('项目A')
  })

  it('receipt atomically snapshots customer identity and clears dependent identity', () => {
    findCustomerOptionMock.mockReturnValue({
      id: '1',
      customerCode: 'C001',
      customerName: '客户A',
      defaultSettlementCompanyId: '9',
      defaultSettlementCompanyName: '主体A',
    })
    const form = {
      customerId: '1',
      customerCode: 'OLD',
      customerName: '旧客户',
      projectId: '101',
      projectName: '旧项目',
      sourceCustomerStatementId: '701',
    } as Record<string, unknown>

    getSyncEditorForm('receipt')(form, {
      changedKeys: new Set(['customerId']),
    })

    expect(form).toMatchObject({
      customerId: '1',
      customerCode: 'C001',
      customerName: '客户A',
      projectId: '',
      projectName: '',
      sourceCustomerStatementId: '',
      settlementCompanyId: '9',
      settlementCompanyName: '主体A',
    })
  })

  it('receipt snapshots project identity and clears the stale statement source', () => {
    findProjectOptionMock.mockReturnValue({
      id: '101',
      customerId: '1',
      projectCode: 'P001',
      projectName: '项目A',
    })
    const form = {
      customerId: '1',
      projectId: '101',
      projectName: '旧项目',
      sourceCustomerStatementId: '701',
    } as Record<string, unknown>

    getSyncEditorForm('receipt')(form, {
      changedKeys: new Set(['projectId']),
    })

    expect(form.projectId).toBe('101')
    expect(form.projectName).toBe('项目A')
    expect(form.sourceCustomerStatementId).toBe('')
  })

  it('payment clears counterparty identity and both statement sources when type changes', () => {
    const form = {
      counterpartyType: '物流商',
      counterpartyId: '401',
      counterpartyCode: 'SUP-001',
      counterpartyName: '供应商A',
      sourceSupplierStatementId: '701',
      sourceFreightStatementId: '702',
    } as Record<string, unknown>

    getSyncEditorForm('payment')(form, {
      changedKeys: new Set(['counterpartyType']),
    })

    expect(form).toMatchObject({
      counterpartyId: '',
      counterpartyCode: '',
      counterpartyName: '',
      sourceSupplierStatementId: '',
      sourceFreightStatementId: '',
    })
  })

  it('payment snapshots the selected supplier by id and clears the stale source', () => {
    findSupplierOptionMock.mockReturnValue({
      id: '401',
      supplierCode: 'SUP-001',
      supplierName: '供应商A',
      value: '401',
      label: 'SUP-001 / 供应商A',
    })
    const form = {
      counterpartyType: '供应商',
      counterpartyId: '401',
      sourceSupplierStatementId: '701',
      sourceFreightStatementId: '702',
    } as Record<string, unknown>

    getSyncEditorForm('payment')(form, {
      changedKeys: new Set(['counterpartyId']),
    })

    expect(findSupplierOptionMock).toHaveBeenCalledWith('401')
    expect(form).toMatchObject({
      counterpartyId: '401',
      counterpartyCode: 'SUP-001',
      counterpartyName: '供应商A',
      sourceSupplierStatementId: '',
      sourceFreightStatementId: '',
    })
  })

  it('ledger adjustment snapshots a customer by id', () => {
    findCustomerOptionMock.mockReturnValue({
      id: '501',
      customerCode: 'CUS-001',
      customerName: '客户A',
    })
    const form = {
      counterpartyType: '客户',
      counterpartyId: '501',
      counterpartyCode: '',
      counterpartyName: '',
    } as Record<string, unknown>

    getSyncEditorForm('ledger-adjustment')(form, {
      changedKeys: new Set(['counterpartyId']),
    })

    expect(findCustomerOptionMock).toHaveBeenCalledWith('501')
    expect(form).toMatchObject({
      counterpartyId: '501',
      counterpartyCode: 'CUS-001',
      counterpartyName: '客户A',
      customerId: '501',
    })
  })

  it('ledger adjustment snapshots a project within the selected customer', () => {
    findProjectOptionMock.mockReturnValue({
      id: '601',
      customerId: '501',
      projectCode: 'P001',
      projectName: '项目A',
    })
    const form = {
      counterpartyType: '客户',
      counterpartyId: '501',
      customerId: '501',
      projectId: '601',
      projectName: '旧项目',
    } as Record<string, unknown>

    getSyncEditorForm('ledger-adjustment')(form, {
      changedKeys: new Set(['projectId']),
    })

    expect(findProjectOptionMock).toHaveBeenCalledWith('601', '501')
    expect(form.projectId).toBe('601')
    expect(form.projectName).toBe('项目A')
  })

  it('freight-bill uses the selected carrier default settlement company', () => {
    findCarrierOptionMock.mockReturnValue({
      carrierCode: ' WL-001 ',
      carrierName: '物流甲',
      defaultSettlementCompanyId: 10,
      defaultSettlementCompanyName: '主体B',
    })
    const form = { carrierName: '700520000000000001' } as Record<
      string,
      unknown
    >

    getSyncEditorForm('freight-bill')(form, {
      changedKeys: new Set(['carrierName']),
    })

    expect(findCarrierOptionMock).toHaveBeenCalledWith('700520000000000001')
    expect(form.carrierName).toBe('物流甲')
    expect(form.carrierCode).toBe('WL-001')
    expect(form.settlementCompanyId).toBe('10')
    expect(form.settlementCompanyName).toBe('主体B')
  })

  it('freight-bill clears a stale carrier code when the carrier is unknown', () => {
    findCarrierOptionMock.mockReturnValue(undefined)
    const form = {
      carrierName: '未知物流商',
      carrierCode: 'WL-OLD',
    } as Record<string, unknown>

    getSyncEditorForm('freight-bill')(form, {
      changedKeys: new Set(['carrierName']),
    })

    expect(form.carrierCode).toBe('')
  })

  it('freight-statement snapshots the selected carrier code', () => {
    findCarrierOptionMock.mockReturnValue({
      carrierCode: ' WL-002 ',
      value: '物流乙',
    })
    const form = { carrierName: '物流乙' } as Record<string, unknown>

    getSyncEditorForm('freight-statement')(form, {
      changedKeys: new Set(['carrierName']),
    })

    expect(findCarrierOptionMock).toHaveBeenCalledWith('物流乙')
    expect(form.carrierCode).toBe('WL-002')
  })

  it('freight-statement clears a stale code when the carrier is unknown', () => {
    findCarrierOptionMock.mockReturnValue(undefined)
    const form = {
      carrierName: '未知物流商',
      carrierCode: 'WL-OLD',
    } as Record<string, unknown>

    getSyncEditorForm('freight-statement')(form, {
      changedKeys: new Set(['carrierName']),
    })

    expect(form.carrierCode).toBe('')
  })

  it('registers purchase-order with defaultOperatorField', () => {
    expect(getBehaviorValue('purchase-order', 'defaultOperatorField')).toBe(
      'buyerName',
    )
    expect(hasBehavior('purchase-order', 'lineItemTrimStrategy')).toBe(true)
  })

  it('registers purchase-refund as an authoritative readonly source document', () => {
    const config = moduleBehaviorRegistry.get('purchase-refund')
    expect(config?.defaultOperatorField).toBe('operatorName')
    expect(config?.allowsManualLineItems).toBe(false)
    expect(config?.readonlyLineItems).toBe(true)
    expect(config?.defaultDraftValues).toBeTypeOf('function')
    const values = (
      config!.defaultDraftValues as () => Record<string, unknown>
    )()
    expect(dayjs.isDayjs(values.refundDate)).toBe(true)
  })

  it('registers supplier refund receipt operator and receipt date defaults', () => {
    const config = moduleBehaviorRegistry.get('supplier-refund-receipt')

    expect(config?.defaultOperatorField).toBe('operatorName')
    expect(config?.defaultDraftValues).toBeTypeOf('function')
    const values = (
      config!.defaultDraftValues as () => Record<string, unknown>
    )()
    expect(dayjs.isDayjs(values.receiptDate)).toBe(true)
    expect((values.receiptDate as dayjs.Dayjs).format('YYYY-MM-DD')).toBe(
      dayjs().format('YYYY-MM-DD'),
    )
  })

  it('purchase-order defaultDraftValues returns current date', () => {
    const config = moduleBehaviorRegistry.get('purchase-order')
    const values = (config!.defaultDraftValues as () => any)()
    expect(values.orderDate).toBeDefined()
    expect(dayjs.isDayjs(values.orderDate)).toBe(true)
  })

  it('supplier modules atomically snapshot the selected stable supplier identity', () => {
    findSupplierOptionMock.mockReturnValue({
      id: '700520000000000001',
      supplierCode: 'SUP-001',
      supplierName: '供应商甲',
      value: '700520000000000001',
      label: '供应商甲',
    })
    const moduleKeys = [
      'purchase-order',
      'purchase-inbound',
      'purchase-contract',
      'invoice-receipt',
      'supplier-statement',
    ]

    for (const moduleKey of moduleKeys) {
      const form = {
        supplierId: '700520000000000001',
        supplierName: '旧供应商',
        supplierCode: 'OLD',
      } as Record<string, unknown>

      getSyncEditorForm(moduleKey)(form, {
        changedKeys: new Set(['supplierId']),
      })

      expect(form.supplierId).toBe('700520000000000001')
      expect(form.supplierCode).toBe('SUP-001')
      expect(form.supplierName).toBe('供应商甲')
    }
    expect(findSupplierOptionMock).toHaveBeenCalledTimes(moduleKeys.length)
    expect(findSupplierOptionMock).toHaveBeenCalledWith('700520000000000001')
  })

  it('supplier selection fails closed when the stable id has no option', () => {
    const form = {
      supplierId: 'not-an-id',
      supplierName: '旧供应商',
      supplierCode: 'OLD',
    } as Record<string, unknown>

    getSyncEditorForm('purchase-order')(form, {
      changedKeys: new Set(['supplierId']),
    })

    expect(form).toMatchObject({
      supplierId: '',
      supplierCode: '',
      supplierName: '',
    })
  })

  it('purchase-order syncEditorForm snapshots settlement company name changes', () => {
    const syncEditorForm = getSyncEditorForm('purchase-order')

    const unchangedForm = {
      settlementCompanyId: '9',
      settlementCompanyName: '保留主体',
    }
    syncEditorForm(unchangedForm, { changedKeys: new Set(['orderNo']) })
    expect(unchangedForm.settlementCompanyName).toBe('保留主体')
    expect(getSettlementCompanyOptionsMock).not.toHaveBeenCalled()

    const unmatchedForm = {
      settlementCompanyId: 'missing',
      settlementCompanyName: '旧主体',
    }
    syncEditorForm(unmatchedForm, {
      changedKeys: new Set(['settlementCompanyId']),
    })
    expect(unmatchedForm.settlementCompanyName).toBe('')
    expect(getSettlementCompanyOptionsMock).toHaveBeenCalledTimes(1)
  })

  it('snapshot modules sync settlement company names while preserving existing fallback names', () => {
    const snapshotModules = [
      'purchase-inbound',
      'sales-order',
      'sales-outbound',
      'freight-bill',
      'supplier-statement',
      'customer-statement',
      'freight-statement',
      'receipt',
      'invoice-issue',
    ]

    for (const moduleKey of snapshotModules) {
      const syncEditorForm = getSyncEditorForm(moduleKey)
      const form = {
        settlementCompanyId: '10',
        settlementCompanyName: '',
      }

      syncEditorForm(form, { changedKeys: new Set(['settlementCompanyId']) })
      expect(form.settlementCompanyName).toBe('主体B')
    }

    const syncEditorForm = getSyncEditorForm('sales-outbound')
    const unchangedForm = {
      settlementCompanyId: '10',
      settlementCompanyName: '保留主体',
    }
    syncEditorForm(unchangedForm, { changedKeys: new Set(['outboundNo']) })
    expect(unchangedForm.settlementCompanyName).toBe('保留主体')

    const fallbackForm = {
      settlementCompanyId: 'missing',
      settlementCompanyName: '原主体',
    }
    syncEditorForm(fallbackForm, {
      changedKeys: new Set(['settlementCompanyId']),
    })
    expect(fallbackForm.settlementCompanyName).toBe('原主体')
  })

  it('ledger adjustment snapshots the selected settlement company name', () => {
    const form = {
      settlementCompanyId: '10',
      settlementCompanyName: '',
    }

    getSyncEditorForm('ledger-adjustment')(form, {
      changedKeys: new Set(['settlementCompanyId']),
    })

    expect(form.settlementCompanyName).toBe('主体B')
    expect(getSettlementCompanyOptionsMock).toHaveBeenCalledTimes(1)
  })

  it('purchase-inbound defaultDraftValues returns inboundDate', () => {
    const config = moduleBehaviorRegistry.get('purchase-inbound')
    expect(config?.readonlyItemColumns).toContain('warehouseName')
    const values = (config!.defaultDraftValues as () => any)()
    expect(dayjs.isDayjs(values.inboundDate)).toBe(true)
  })

  it('sales-outbound defaultDraftValues returns outboundDate for today', () => {
    const config = moduleBehaviorRegistry.get('sales-outbound')
    const values = (config!.defaultDraftValues as () => any)()

    expect(dayjs.isDayjs(values.outboundDate)).toBe(true)
    expect(values.outboundDate.format('YYYY-MM-DD')).toBe(
      dayjs().format('YYYY-MM-DD'),
    )
  })

  it('sales-order defaultDraftValues returns deliveryDate for today', () => {
    const config = moduleBehaviorRegistry.get('sales-order')
    const values = (config!.defaultDraftValues as () => any)()

    expect(dayjs.isDayjs(values.deliveryDate)).toBe(true)
    expect(values.deliveryDate.format('YYYY-MM-DD')).toBe(
      dayjs().format('YYYY-MM-DD'),
    )
  })

  it('sales-outbound only keeps outbound date, remark and quantity editable after parent import', () => {
    const config = moduleBehaviorRegistry.get('sales-outbound')

    expect(config?.parentImportedEditableFields).toEqual([
      'outboundDate',
      'remark',
    ])
    expect(config?.parentImportedItemEditableColumns).toEqual(['quantity'])
  })

  it('purchase-inbound locks supplier and settlement company after purchase order import', () => {
    const config = moduleBehaviorRegistry.get('purchase-inbound')
    const resolveReadonly = config!.resolveReadonlyEditorFields as (
      record: any,
    ) => string[]

    expect(resolveReadonly({ purchaseOrderNo: 'PO202600001' })).toEqual([
      'supplierId',
      'settlementCompanyId',
    ])
    expect(resolveReadonly({ purchaseOrderNo: '   ' })).toEqual([])
  })

  it('purchase-contract syncEditorForm handles signDate changes', () => {
    const config = moduleBehaviorRegistry.get('purchase-contract')
    expect(config?.readonlyLineItems).toBe(true)

    const resolveReadonly = config!.resolveReadonlyEditorFields as (
      record: any,
    ) => string[]
    expect(resolveReadonly({ sourcePurchaseOrderNos: 'PO001' })).toEqual([
      'supplierId',
    ])
    expect(resolveReadonly({ sourcePurchaseOrderNos: '' })).toEqual([])

    const defaultValues = (config!.defaultDraftValues as () => any)()
    expect(dayjs.isDayjs(defaultValues.signDate)).toBe(true)
    expect(dayjs.isDayjs(defaultValues.effectiveDate)).toBe(true)
    expect(dayjs.isDayjs(defaultValues.expireDate)).toBe(true)

    const syncEditorForm = config!.syncEditorForm as (
      form: any,
      ctx: { changedKeys: Set<string> },
    ) => void

    const form1: any = { signDate: dayjs('2026-06-01') }
    syncEditorForm(form1, { changedKeys: new Set(['signDate']) })
    expect(dayjs.isDayjs(form1.effectiveDate)).toBe(true)
    expect(form1.effectiveDate.format('YYYY-MM-DD')).toBe('2026-06-01')
    expect(form1.expireDate.format('YYYY-MM-DD')).toBe('2027-06-01')

    const form2: any = {
      signDate: dayjs('2026-06-01'),
      effectiveDate: dayjs('2026-07-01'),
      expireDate: dayjs('2026-12-31'),
    }
    syncEditorForm(form2, { changedKeys: new Set(['signDate']) })
    expect(form2.effectiveDate.format('YYYY-MM-DD')).toBe('2026-06-01')
    expect(form2.expireDate.format('YYYY-MM-DD')).toBe('2027-06-01')

    const form3: any = {}
    syncEditorForm(form3, { changedKeys: new Set() })
    expect(form3.effectiveDate).toBeUndefined()

    const form4: any = {
      signDate: dayjs('2026-06-01'),
      effectiveDate: dayjs('2026-07-01'),
    }
    syncEditorForm(form4, { changedKeys: new Set(['signDate']) })
    expect(form4.effectiveDate.format('YYYY-MM-DD')).toBe('2026-06-01')

    const form5: any = { signDate: '2026-06-01' }
    syncEditorForm(form5, { changedKeys: new Set(['signDate']) })
    expect(dayjs.isDayjs(form5.effectiveDate)).toBe(true)
    expect(form5.effectiveDate.format('YYYY-MM-DD')).toBe('2026-06-01')

    const form6: any = { signDate: 'invalid-date' }
    syncEditorForm(form6, { changedKeys: new Set(['signDate']) })
    expect(form6.effectiveDate).toBeUndefined()
    expect(form6.expireDate).toBeUndefined()

    const form7: any = { signDate: null }
    syncEditorForm(form7, { changedKeys: new Set(['signDate']) })
    expect(form7.effectiveDate).toBeUndefined()
    expect(form7.expireDate).toBeUndefined()

    const form8: any = {
      signDate: dayjs('2026-06-01'),
      effectiveDate: dayjs('2026-07-01'),
      expireDate: dayjs('2026-12-31'),
    }
    syncEditorForm(form8, { changedKeys: new Set() })
    expect(form8.effectiveDate.format('YYYY-MM-DD')).toBe('2026-07-01')
    expect(form8.expireDate.format('YYYY-MM-DD')).toBe('2026-12-31')

    const form9: any = {
      signDate: '2026-06-01',
      effectiveDate: 'invalid',
      expireDate: 'invalid',
    }
    syncEditorForm(form9, { changedKeys: new Set() })
    expect(dayjs.isDayjs(form9.effectiveDate)).toBe(true)
    expect(dayjs.isDayjs(form9.expireDate)).toBe(true)

    const form10: any = { signDate: dayjs('2026-06-01') }
    syncEditorForm(form10, { changedKeys: new Set() })
    expect(form10.effectiveDate.format('YYYY-MM-DD')).toBe('2026-06-01')
    expect(form10.expireDate.format('YYYY-MM-DD')).toBe('2027-06-01')
  })

  it('registers operator name modules', () => {
    for (const key of [
      'receipt',
      'payment',
      'invoice-receipt',
      'invoice-issue',
      'ledger-adjustment',
    ]) {
      expect(getBehaviorValue(key, 'defaultOperatorField')).toBe('operatorName')
    }
  })

  it('registers ledger adjustment editor defaults', () => {
    const config = moduleBehaviorRegistry.get('ledger-adjustment')
    const values = (config!.defaultDraftValues as () => any)()

    expect(config?.defaultOperatorField).toBe('operatorName')
    expect(dayjs.isDayjs(values.adjustmentDate)).toBe(true)
    expect(values.adjustmentDate.hour()).toBe(0)
    expect(values.adjustmentDate.minute()).toBe(0)
    expect(values.adjustmentDate.second()).toBe(0)
  })

  it('ledger adjustment clears stale counterparty values', () => {
    const config = moduleBehaviorRegistry.get('ledger-adjustment')
    const syncEditorForm = config!.syncEditorForm as (
      form: any,
      ctx: { changedKeys: Set<string> },
    ) => void

    const typeChangedForm: any = {
      counterpartyType: '供应商',
      counterpartyName: '客户A',
      counterpartyCode: 'C001',
    }
    syncEditorForm(typeChangedForm, {
      changedKeys: new Set(['counterpartyType']),
    })
    expect(typeChangedForm.counterpartyName).toBe('')
    expect(typeChangedForm.counterpartyCode).toBe('')

    const nameChangedForm: any = {
      counterpartyType: '客户',
      counterpartyName: '客户B',
      counterpartyCode: 'C001',
    }
    syncEditorForm(nameChangedForm, {
      changedKeys: new Set(['counterpartyName']),
    })
    expect(nameChangedForm.counterpartyName).toBe('客户B')
    expect(nameChangedForm.counterpartyCode).toBe('')

    const unchangedForm: any = {
      counterpartyType: '客户',
      counterpartyName: '客户C',
      counterpartyCode: 'C003',
    }
    syncEditorForm(unchangedForm, {
      changedKeys: new Set(['remark']),
    })
    expect(unchangedForm.counterpartyName).toBe('客户C')
    expect(unchangedForm.counterpartyCode).toBe('C003')
  })

  it('registers positive line item modules', () => {
    expect(getBehaviorValue('invoice-receipt', 'lineItemTrimStrategy')).toBe(
      'positiveWeightOrAmount',
    )
    expect(getBehaviorValue('invoice-issue', 'lineItemTrimStrategy')).toBe(
      'positiveWeightOrAmount',
    )
    expect(hasBehavior('invoice-issue', 'allowsManualLineItems')).toBe(false)
  })

  it('registers freight-bill behaviors', () => {
    expect(hasBehavior('freight-bill', 'allowsManualLineItems')).toBe(false)
    expect(hasBehavior('freight-bill', 'readonlyLineItems')).toBe(true)
    expect(hasBehavior('freight-bill', 'supportsStatements')).toBe(true)
    expect(getBehaviorValue('freight-bill', 'statementLinkType')).toBe(
      'freight',
    )
  })

  it('registers statement readonly line items', () => {
    for (const key of [
      'freight-statement',
      'supplier-statement',
      'customer-statement',
    ]) {
      expect(hasBehavior(key, 'allowsManualLineItems')).toBe(false)
      expect(hasBehavior(key, 'readonlyLineItems')).toBe(true)
    }
  })

  it('registers invoice sync behaviors', () => {
    expect(hasBehavior('invoice-receipt', 'supportsInvoiceSync')).toBe(true)
    expect(hasBehavior('invoice-issue', 'supportsInvoiceSync')).toBe(true)
  })

  it('registers module type flags', () => {
    expect(hasBehavior('department', 'isSettingsModule')).toBe(true)
    expect(hasBehavior('general-setting', 'isSettingsModule')).toBe(true)
    expect(hasBehavior('general-setting', 'hasUploadRuleExpandedRow')).toBe(
      true,
    )
    expect(hasBehavior('material', 'supportsMaterialImport')).toBe(true)
    expect(hasBehavior('permission', 'alertActionLink')).toBe(true)
  })

  it('registers sales-order with locksLineItemsWhenRecordLocked', () => {
    const config = moduleBehaviorRegistry.get('sales-order')
    expect(config?.locksLineItemsWhenRecordLocked).toBe(true)
    expect(config?.lineItemLockSourceModule).toBe('sales-outbound')
    expect(config?.lineItemLockSourceField).toBe('salesOrderNo')
    expect(config?.lineItemLockTargetField).toBe('orderNo')
    expect(config?.lineItemLockStatuses).toEqual(['已审核', '交付核定'])
  })

  it('registers purchase-inbound with readonlyItemColumns', () => {
    const config = moduleBehaviorRegistry.get('purchase-inbound')
    expect(config?.readonlyItemColumns).toContain('warehouseName')
    expect(config?.readonlyItemColumns).toContain('quantity')
    expect(config?.readonlyItemColumns).toContain('weightTon')
    expect(config?.readonlyItemColumns).toContain('unitPrice')
    expect(config?.readonlyItemColumns).toContain('settlementMode')
    expect(config?.readonlyItemColumns).toContain('amount')
  })

  it('registers purchase-contract with readonlyLineItems', () => {
    const config = moduleBehaviorRegistry.get('purchase-contract')
    expect(config?.readonlyLineItems).toBe(true)
    expect(config?.defaultOperatorField).toBe('buyerName')
  })

  it('purchase-contract syncEditorForm handles string signDate', () => {
    const config = moduleBehaviorRegistry.get('purchase-contract')
    const syncEditorForm = config!.syncEditorForm as (
      form: any,
      ctx: { changedKeys: Set<string> },
    ) => void

    const form: any = { signDate: '2026-06-01', effectiveDate: '2026-07-01' }
    syncEditorForm(form, { changedKeys: new Set(['signDate']) })
    expect(dayjs.isDayjs(form.effectiveDate)).toBe(true)
    expect(form.effectiveDate.format('YYYY-MM-DD')).toBe('2026-06-01')
    expect(dayjs.isDayjs(form.expireDate)).toBe(true)
    expect(form.expireDate.format('YYYY-MM-DD')).toBe('2027-06-01')
  })

  it('purchase-contract resolveReadonlyEditorFields returns empty for whitespace sourcePurchaseOrderNos', () => {
    const config = moduleBehaviorRegistry.get('purchase-contract')
    const resolveReadonly = config!.resolveReadonlyEditorFields as (
      record: any,
    ) => string[]
    expect(resolveReadonly({ sourcePurchaseOrderNos: '   ' })).toEqual([])
  })
})
