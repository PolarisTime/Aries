import { describe, it, expect } from 'vitest'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import {
  getModuleBehavior,
  getBehaviorValue,
  hasBehavior,
  isDeleteBlockedByStatus,
  type NormalizeDraftContext,
} from '../module-behavior-registry'

describe('module-behavior-registry', () => {
  describe('getModuleBehavior', () => {
    it('returns config for a registered module', () => {
      const config = getModuleBehavior('freight-bills')
      expect(config.supportsLineItems).toBe(true)
      expect(config.defaultStatus).toBe('未审核')
      expect(config.auditStatus).toBe('已审核')
    })

    it('returns empty object for unknown module', () => {
      const config = getModuleBehavior('nonexistent-module')
      expect(config).toEqual({})
    })

    it('merges multiple registrations', () => {
      const config = getModuleBehavior('freight-statements')
      expect(config.supportsLineItems).toBe(true)
      expect(config.includeAttachmentIds).toBe(true)
      expect(config.normalizeDraftRecord).toBeDefined()
    })

    it('configures confirm workflow for statement modules', () => {
      expect(getModuleBehavior('customer-statements').defaultStatus).toBe('待确认')
      expect(getModuleBehavior('customer-statements').auditStatus).toBe('已确认')
      expect(getModuleBehavior('supplier-statements').defaultStatus).toBe('待确认')
      expect(getModuleBehavior('supplier-statements').auditStatus).toBe('已确认')
    })
  })

  describe('hasBehavior', () => {
    it('returns true for registered boolean flags', () => {
      expect(hasBehavior('purchase-orders', 'supportsLineItems')).toBe(true)
      expect(hasBehavior('purchase-orders', 'computesAmounts')).toBe(true)
    })

    it('returns false for unregistered flags', () => {
      expect(hasBehavior('materials', 'computesAmounts')).toBe(false)
    })

    it('returns false for unknown module', () => {
      expect(hasBehavior('nonexistent', 'supportsLineItems')).toBe(false)
    })

    it('supports new Phase 0 flags', () => {
      expect(hasBehavior('freight-statements', 'includeAttachmentIds')).toBe(true)
      expect(hasBehavior('receipts', 'supportsStatementLinking')).toBe(true)
      expect(hasBehavior('payments', 'supportsStatementLinking')).toBe(true)
      expect(hasBehavior('receipts', 'allowsEmptyLineItems')).toBe(true)
      expect(hasBehavior('payments', 'allowsEmptyLineItems')).toBe(true)
      expect(hasBehavior('role-settings', 'showRoleLink')).toBe(true)
      expect(hasBehavior('general-settings', 'hasUploadRuleExpandedRow')).toBe(true)
      expect(hasBehavior('permission-management', 'alertActionLink')).toBe(true)
      expect(hasBehavior('departments', 'isSettingsModule')).toBe(true)
    })
  })

  describe('getBehaviorValue', () => {
    it('returns typed value for registered config', () => {
      const actionKinds = getBehaviorValue('supplier-statements', 'actionKindsByLabel')
      expect(actionKinds).toEqual({ 生成对账单: 'openSupplierStatementGenerator' })
    })

    it('returns undefined for unregistered flag', () => {
      const value = getBehaviorValue('materials', 'auditStatus')
      expect(value).toBeUndefined()
    })

    it('returns undefined for unknown module', () => {
      const value = getBehaviorValue('nonexistent', 'defaultStatus')
      expect(value).toBeUndefined()
    })

    it('returns string[] for extraScalarFields', () => {
      const extras = getBehaviorValue('freight-statements', 'extraScalarFields')
      expect(extras).toEqual(['attachment'])
    })

    it('returns alertActionLink with correct shape', () => {
      const link = getBehaviorValue('permission-management', 'alertActionLink')
      expect(link).toEqual({ text: '前往角色权限配置 →', to: '/role-action-editor' })
    })

    it('returns custom line-item amount summary key for finance allocations', () => {
      expect(getBehaviorValue('receipts', 'lineItemAmountSummaryKey')).toBe('allocatedAmount')
      expect(getBehaviorValue('payments', 'lineItemAmountSummaryKey')).toBe('allocatedAmount')
    })
  })

  describe('isDeleteBlockedByStatus', () => {
    it('blocks audited and completed document statuses', () => {
      expect(isDeleteBlockedByStatus('已审核')).toBe(true)
      expect(isDeleteBlockedByStatus('待完善')).toBe(true)
      expect(isDeleteBlockedByStatus('完成销售')).toBe(true)
      expect(isDeleteBlockedByStatus('已收款')).toBe(true)
    })

    it('allows draft and master-data active statuses', () => {
      expect(isDeleteBlockedByStatus('草稿')).toBe(false)
      expect(isDeleteBlockedByStatus('正常')).toBe(false)
      expect(isDeleteBlockedByStatus(undefined)).toBe(false)
    })
  })

  describe('normalizeDraftRecord callbacks', () => {
    const createCtx = (overrides?: Partial<NormalizeDraftContext>): NormalizeDraftContext => ({
      primaryNoKey: undefined,
      generatePrimaryNo: () => 'TEST-001',
      currentOperatorName: '测试操作员',
      sumLineItemsBy: (items, key) => {
        if (key === 'weightTon') return items.reduce((sum, i) => sum + (Number(i.weightTon) || 0), 0)
        if (key === 'amount') return items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
        if (key === 'allocatedAmount') return items.reduce((sum, i) => sum + (Number(i.allocatedAmount) || 0), 0)
        return 0
      },
      ...overrides,
    })

    it('freight-bills: computes totals and derives hidden header fields from imported items', () => {
      const config = getModuleBehavior('freight-bills')
      const record: ModuleRecord = { id: '1', unitPrice: '200' }
      const items: ModuleLineItem[] = [
        { id: 'item-1', sourceNo: 'SO-OUT-001', customerName: '客户甲', projectName: '项目A', weightTon: 5 },
        { id: 'item-2', weightTon: 3 },
      ]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.outboundNo).toBe('SO-OUT-001')
      expect(record.customerName).toBe('客户甲')
      expect(record.projectName).toBe('项目A')
      expect(record.totalWeight).toBe(8)
      expect(record.totalFreight).toBe(1600)
      expect(record.deliveryStatus).toBe('未送达')
    })

    it('supplier-statements: computes purchaseAmount and keeps paymentAmount in closingAmount', () => {
      const config = getModuleBehavior('supplier-statements')
      const record: ModuleRecord = { id: '1', paymentAmount: 120 }
      const items: ModuleLineItem[] = [
        { id: 'item-1', amount: 100, sourceNo: 'INB-001' },
        { id: 'item-2', amount: 200, sourceNo: 'INB-002' },
      ]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.purchaseAmount).toBe(300)
      expect(record.closingAmount).toBe(180)
      expect(record.paymentAmount).toBe(120)
    })

    it('customer-statements: computes salesAmount and keeps receiptAmount in closingAmount', () => {
      const config = getModuleBehavior('customer-statements')
      const record: ModuleRecord = { id: '1', receiptAmount: 200 }
      const items: ModuleLineItem[] = [{ id: 'item-1', amount: 500, sourceNo: 'ORD-001' }]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.salesAmount).toBe(500)
      expect(record.closingAmount).toBe(300)
      expect(record.receiptAmount).toBe(200)
    })

    it('supplier-statements: keeps full-payment state aligned with recomputed amount', () => {
      const config = getModuleBehavior('supplier-statements')
      const record: ModuleRecord = { id: '1', purchaseAmount: 300, paymentAmount: 300, closingAmount: 0 }
      const items: ModuleLineItem[] = [
        { id: 'item-1', amount: 100, sourceNo: 'INB-001' },
        { id: 'item-2', amount: 260, sourceNo: 'INB-002' },
      ]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.purchaseAmount).toBe(360)
      expect(record.paymentAmount).toBe(360)
      expect(record.closingAmount).toBe(0)
    })

    it('customer-statements: keeps full-receipt state aligned with recomputed amount', () => {
      const config = getModuleBehavior('customer-statements')
      const record: ModuleRecord = { id: '1', salesAmount: 500, receiptAmount: 500, closingAmount: 0 }
      const items: ModuleLineItem[] = [{ id: 'item-1', amount: 620, sourceNo: 'ORD-001' }]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.salesAmount).toBe(620)
      expect(record.receiptAmount).toBe(620)
      expect(record.closingAmount).toBe(0)
    })

    it('invoice-receipts: computes amount and sourcePurchaseOrderNos', () => {
      const config = getModuleBehavior('invoice-receipts')
      const record: ModuleRecord = { id: '1' }
      const items: ModuleLineItem[] = [
        { id: 'item-1', amount: 300, sourceNo: 'PO-001' },
        { id: 'item-2', amount: 150, sourceNo: 'PO-002' },
      ]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.amount).toBe(450)
      expect(record.sourcePurchaseOrderNos).toBe('PO-001, PO-002')
    })

    it('invoice-issues: computes amount and sourceSalesOrderNos', () => {
      const config = getModuleBehavior('invoice-issues')
      const record: ModuleRecord = { id: '1' }
      const items: ModuleLineItem[] = [{ id: 'item-1', amount: 200, sourceNo: 'SO-001' }]
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.amount).toBe(200)
      expect(record.sourceSalesOrderNos).toBe('SO-001')
    })

    it('receipts: computes amount from allocations and derives legacy sourceStatementId', () => {
      const receiptRecord: ModuleRecord = { id: '1', sourceStatementId: 99 }
      getModuleBehavior('receipts').normalizeDraftRecord!(receiptRecord, [
        { id: 'a', sourceStatementId: 12, allocatedAmount: 150.2 },
        { id: 'b', sourceStatementId: 13, allocatedAmount: 49.85 },
      ], createCtx())
      expect(receiptRecord.amount).toBe(200.05)
      expect(receiptRecord.sourceStatementId).toBeUndefined()
    })

    it('payments: derive legacy sourceStatementId from allocation items', () => {
      const paymentRecord: ModuleRecord = { id: '2', sourceStatementId: 88 }
      getModuleBehavior('payments').normalizeDraftRecord!(paymentRecord, [], createCtx())
      expect(paymentRecord.sourceStatementId).toBeUndefined()
    })

    it('receipts: keeps single sourceStatementId when only one allocation exists', () => {
      const receiptRecord: ModuleRecord = { id: '1', sourceStatementId: 99 }
      getModuleBehavior('receipts').normalizeDraftRecord!(receiptRecord, [{ id: 'a', sourceStatementId: 12 }], createCtx())
      expect(receiptRecord.sourceStatementId).toBe(12)
    })

    it('role-settings: normalizes permissionCodes', () => {
      const config = getModuleBehavior('role-settings')
      const record: ModuleRecord = { id: '1', permissionCodes: ['perm:a', 'perm:b'] }
      config.normalizeDraftRecord!(record, [], createCtx())
      expect(record.permissionCodes).toEqual(['perm:a', 'perm:b'])
      expect(record.permissionCount).toBe(2)
    })

    it('user-accounts: normalizes roleNames', () => {
      const config = getModuleBehavior('user-accounts')
      const record: ModuleRecord = { id: '1', roleNames: '管理员, 采购' }
      config.normalizeDraftRecord!(record, [], createCtx())
      expect(record.roleNames).toEqual(['管理员', '采购'])
    })
  })

  describe('syncEditorForm callbacks', () => {
    it('role-settings: syncs permissionCodes and permissionCount', () => {
      const config = getModuleBehavior('role-settings')
      const form: Record<string, unknown> = { permissionCodes: ['perm:x', 'perm:y', 'perm:z'] }
      config.syncEditorForm!(form)
      expect(form.permissionCodes).toEqual(['perm:x', 'perm:y', 'perm:z'])
      expect(form.permissionCount).toBe(3)
    })

    it('user-accounts: syncs roleNames and permissionSummary', () => {
      const config = getModuleBehavior('user-accounts')
      const form: Record<string, unknown> = { roleNames: ['管理员', '财务'] }
      config.syncEditorForm!(form)
      expect(form.roleNames).toEqual(['管理员', '财务'])
      expect(form.permissionSummary).toBe('管理员、财务')
    })
  })

  describe('savePayload flags', () => {
    it('lineItem payload modules have savePayloadLineItems', () => {
      const modules = ['purchase-orders', 'purchase-inbounds', 'sales-orders', 'sales-outbounds',
        'freight-bills', 'freight-statements', 'purchase-contracts', 'sales-contracts',
        'supplier-statements', 'customer-statements', 'invoice-receipts', 'invoice-issues',
        'receipts', 'payments']
      modules.forEach((key) => {
        expect(hasBehavior(key, 'savePayloadLineItems')).toBe(true)
      })
    })

    it('non-lineItem modules do not have savePayloadLineItems', () => {
      expect(hasBehavior('materials', 'savePayloadLineItems')).toBe(false)
      expect(hasBehavior('departments', 'savePayloadLineItems')).toBe(false)
    })

    it('freight-statements has includeAttachmentIds', () => {
      expect(hasBehavior('freight-statements', 'includeAttachmentIds')).toBe(true)
    })

    it('purchase modules have extraScalarFields with buyerName', () => {
      expect(getBehaviorValue('purchase-orders', 'extraScalarFields')).toContain('buyerName')
      expect(getBehaviorValue('purchase-inbounds', 'extraScalarFields')).toContain('buyerName')
    })

    it('sales modules have extraScalarFields with salesName', () => {
      expect(getBehaviorValue('sales-orders', 'extraScalarFields')).toContain('salesName')
      expect(getBehaviorValue('sales-outbounds', 'extraScalarFields')).toContain('salesName')
    })
  })
})
