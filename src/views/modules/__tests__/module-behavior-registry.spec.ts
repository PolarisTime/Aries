import { describe, it, expect } from 'vitest'
import {
  getModuleBehavior,
  getBehaviorValue,
  hasBehavior,
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
  })

  describe('normalizeDraftRecord callbacks', () => {
    const createCtx = (overrides?: Partial<NormalizeDraftContext>): NormalizeDraftContext => ({
      primaryNoKey: undefined,
      generatePrimaryNo: () => 'TEST-001',
      currentOperatorName: '测试操作员',
      sumLineItemsBy: (items, key) => {
        if (key === 'weightTon') return items.reduce((sum, i) => sum + (Number(i.weightTon) || 0), 0)
        if (key === 'amount') return items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
        return 0
      },
      ...overrides,
    })

    it('freight-bills: computes totalWeight, totalFreight, deliveryStatus', () => {
      const config = getModuleBehavior('freight-bills')
      const record: any ={ id: 1, unitPrice: '200' }
      const items = [{ weightTon: 5 }, { weightTon: 3 }] as any
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.totalWeight).toBe(8)
      expect(record.totalFreight).toBe(1600)
      expect(record.deliveryStatus).toBe('未送达')
    })

    it('supplier-statements: computes purchaseAmount and closingAmount', () => {
      const config = getModuleBehavior('supplier-statements')
      const record: any ={ id: 1 }
      const items = [{ amount: 100, sourceNo: 'INB-001' }, { amount: 200, sourceNo: 'INB-002' }] as any
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.purchaseAmount).toBe(300)
      expect(record.closingAmount).toBe(300)
      expect(record.paymentAmount).toBe(0)
    })

    it('customer-statements: computes salesAmount and closingAmount', () => {
      const config = getModuleBehavior('customer-statements')
      const record: any ={ id: 1 }
      const items = [{ amount: 500, sourceNo: 'ORD-001' }] as any
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.salesAmount).toBe(500)
      expect(record.closingAmount).toBe(500)
      expect(record.receiptAmount).toBe(0)
    })

    it('invoice-receipts: computes amount and sourcePurchaseOrderNos', () => {
      const config = getModuleBehavior('invoice-receipts')
      const record: any ={ id: 1 }
      const items = [{ amount: 300, sourceNo: 'PO-001' }, { amount: 150, sourceNo: 'PO-002' }] as any
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.amount).toBe(450)
      expect(record.sourcePurchaseOrderNos).toBe('PO-001, PO-002')
    })

    it('invoice-issues: computes amount and sourceSalesOrderNos', () => {
      const config = getModuleBehavior('invoice-issues')
      const record: any ={ id: 1 }
      const items = [{ amount: 200, sourceNo: 'SO-001' }] as any
      config.normalizeDraftRecord!(record, items, createCtx())
      expect(record.amount).toBe(200)
      expect(record.sourceSalesOrderNos).toBe('SO-001')
    })

    it('role-settings: normalizes permissionCodes', () => {
      const config = getModuleBehavior('role-settings')
      const record: any ={ id: 1, permissionCodes: ['perm:a', 'perm:b'] }
      config.normalizeDraftRecord!(record, [], createCtx())
      expect(record.permissionCodes).toEqual(['perm:a', 'perm:b'])
      expect(record.permissionCount).toBe(2)
    })

    it('user-accounts: normalizes roleNames', () => {
      const config = getModuleBehavior('user-accounts')
      const record: any ={ id: 1, roleNames: '管理员, 采购' }
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
        'supplier-statements', 'customer-statements', 'invoice-receipts', 'invoice-issues']
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
