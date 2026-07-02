import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'

describe('module-behavior-editor', () => {
  it('registers carrier with priceMode default', () => {
    const config = moduleBehaviorRegistry.get('carrier')
    expect(config?.defaultDraftValues).toEqual({ priceMode: '按吨' })
  })

  it('registers sales-order with editableLockedFields', () => {
    const config = moduleBehaviorRegistry.get('sales-order')
    expect(config?.editableLockedFields).toEqual(['deliveryDate', 'remark'])
    expect(config?.editableLockedItemColumns).toEqual(['unitPrice'])
    expect(config?.protectedEditStatuses).toEqual(['完成销售'])
    expect(config?.defaultOperatorField).toBe('salesName')
    expect(hasBehavior('sales-order', 'supportsStatements')).toBe(true)
    expect(hasBehavior('sales-order', 'supportsFreightPickup')).toBe(true)
  })

  it('registers purchase-order with defaultOperatorField', () => {
    expect(getBehaviorValue('purchase-order', 'defaultOperatorField')).toBe(
      'buyerName',
    )
    expect(hasBehavior('purchase-order', 'lineItemTrimStrategy')).toBe(true)
  })

  it('purchase-order defaultDraftValues returns current date', () => {
    const config = moduleBehaviorRegistry.get('purchase-order')
    const values = (config!.defaultDraftValues as () => any)()
    expect(values.orderDate).toBeDefined()
    expect(dayjs.isDayjs(values.orderDate)).toBe(true)
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

  it('purchase-inbound locks supplier and settlement company after purchase order import', () => {
    const config = moduleBehaviorRegistry.get('purchase-inbound')
    const resolveReadonly = config!.resolveReadonlyEditorFields as (
      record: any,
    ) => string[]

    expect(resolveReadonly({ purchaseOrderNo: 'PO202600001' })).toEqual([
      'supplierName',
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
      'supplierName',
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
    expect(config?.lineItemLockStatuses).toEqual(['已审核'])
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
