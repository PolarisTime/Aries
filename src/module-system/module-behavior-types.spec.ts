import { describe, expect, it } from 'vitest'
import type { ModuleBehaviorConfig } from './module-behavior-types'

describe('ModuleBehaviorConfig', () => {
  it('accepts a minimal config', () => {
    const config: ModuleBehaviorConfig = {}
    expect(config).toBeDefined()
  })

  it('accepts status-related fields', () => {
    const config: ModuleBehaviorConfig = {
      defaultStatus: '草稿',
      auditStatus: '已核准',
      protectedEditStatuses: ['已完成'],
      protectedDeleteStatuses: ['已完成', '已核准'],
    }

    expect(config.defaultStatus).toBe('草稿')
    expect(config.auditStatus).toBe('已核准')
    expect(config.protectedEditStatuses).toEqual(['已完成'])
    expect(config.protectedDeleteStatuses).toEqual(['已完成', '已核准'])
  })

  it('accepts action kind mappings', () => {
    const config: ModuleBehaviorConfig = {
      actionKindsByLabel: { 确认: 'confirm' },
      actionKindsByKey: { confirm: '确认' },
    }

    expect(config.actionKindsByLabel?.确认).toBe('confirm')
    expect(config.actionKindsByKey?.confirm).toBe('确认')
  })

  it('accepts draft and editor configuration', () => {
    const config: ModuleBehaviorConfig = {
      defaultDraftValues: { status: '草稿' },
      supportsLineItems: true,
      computesAmounts: true,
      editableLockedFields: ['field1'],
      editableLockedItemColumns: ['col1'],
      readonlyItemColumns: ['col2'],
      readonlyEditorFields: ['field3'],
      parentImportedEditableFields: ['field4'],
      parentImportedItemEditableColumns: ['col3'],
    }

    expect(config.supportsLineItems).toBe(true)
    expect(config.computesAmounts).toBe(true)
    expect(config.editableLockedFields).toEqual(['field1'])
    expect(config.parentImportedEditableFields).toEqual(['field4'])
    expect(config.parentImportedItemEditableColumns).toEqual(['col3'])
  })

  it('accepts defaultDraftValues as function', () => {
    const config: ModuleBehaviorConfig = {
      defaultDraftValues: () => ({ status: '草稿' }),
    }

    expect(typeof config.defaultDraftValues).toBe('function')
  })

  it('accepts resolveReadonlyEditorFields function', () => {
    const config: ModuleBehaviorConfig = {
      resolveReadonlyEditorFields: (_record) => ['field1'],
    }

    expect(typeof config.resolveReadonlyEditorFields).toBe('function')
  })

  it('accepts line item lock configuration', () => {
    const config: ModuleBehaviorConfig = {
      locksLineItemsWhenRecordLocked: true,
      lineItemLockSourceModule: 'purchase-order',
      lineItemLockSourceField: 'sourceNo',
      lineItemLockTargetField: 'targetNo',
      lineItemLockStatuses: ['已完成'],
      lockedLineItemsNotice: 'Line items are locked',
    }

    expect(config.locksLineItemsWhenRecordLocked).toBe(true)
    expect(config.lineItemLockSourceModule).toBe('purchase-order')
  })

  it('accepts line item behavior flags', () => {
    const config: ModuleBehaviorConfig = {
      allowsManualLineItems: true,
      readonlyLineItems: false,
      lineItemTrimStrategy: 'purchaseOrderBlank',
    }

    expect(config.allowsManualLineItems).toBe(true)
    expect(config.readonlyLineItems).toBe(false)
    expect(config.lineItemTrimStrategy).toBe('purchaseOrderBlank')
  })

  it('accepts feature flags', () => {
    const config: ModuleBehaviorConfig = {
      supportsParentImport: true,
      supportsStatements: true,
      supportsInvoiceSync: false,
      supportsFreightPickup: true,
      supportsMaterialImport: true,
      statementLinkType: 'supplier',
    }

    expect(config.supportsParentImport).toBe(true)
    expect(config.statementLinkType).toBe('supplier')
  })

  it('accepts normalizeDraftRecord function', () => {
    const config: ModuleBehaviorConfig = {
      normalizeDraftRecord: (_record, _items, _ctx) => {},
    }

    expect(typeof config.normalizeDraftRecord).toBe('function')
  })

  it('accepts syncEditorForm function', () => {
    const config: ModuleBehaviorConfig = {
      syncEditorForm: (_editorForm, _ctx) => {},
    }

    expect(typeof config.syncEditorForm).toBe('function')
  })

  it('accepts miscellaneous fields', () => {
    const config: ModuleBehaviorConfig = {
      savePayloadLineItems: true,
      savePayloadChargeItems: true,
      extraScalarFields: ['field1'],
      includeAttachmentIds: true,
      supportsStatementLinking: 'receipt',
      showRoleLink: true,
      isSettingsModule: false,
      hasUploadRuleExpandedRow: true,
      alertActionLink: { text: 'View', to: '/view' },
      permissionCodesByActionKey: { save: ['code1'] },
      detailRoutePath: '/detail',
      defaultOperatorField: 'operator',
    }

    expect(config.savePayloadLineItems).toBe(true)
    expect(config.savePayloadChargeItems).toBe(true)
    expect(config.supportsStatementLinking).toBe('receipt')
    expect(config.alertActionLink?.text).toBe('View')
    expect(config.detailRoutePath).toBe('/detail')
  })
})
