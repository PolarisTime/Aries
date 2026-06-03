import { describe, expect, it, beforeEach } from 'vitest'
import {
  isModuleLineItemsLocked,
  canManageEditorLineItems,
  applyModuleDefaultEditorDraft,
  applyFormFieldDefaultDraftValues,
  isEditorFieldDisabledForModule,
  isEditorItemColumnEditableForModule,
} from './module-editor-access'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'

beforeEach(() => {
  moduleBehaviorRegistry.clear()
})

function register(key: string, config: Record<string, any>) {
  moduleBehaviorRegistry.set(key, config as any)
}

describe('isModuleLineItemsLocked', () => {
  it('returns false when no lineItemLockStatuses registered', () => {
    expect(isModuleLineItemsLocked('unknown', ['已审核'])).toBe(false)
  })

  it('returns false when no statuses match', () => {
    register('test', { lineItemLockStatuses: ['已审核'] })
    expect(isModuleLineItemsLocked('test', ['草稿'])).toBe(false)
  })

  it('returns true when a status matches', () => {
    register('test', { lineItemLockStatuses: ['已审核'] })
    expect(isModuleLineItemsLocked('test', ['草稿', '已审核'])).toBe(true)
  })
})

describe('canManageEditorLineItems', () => {
  it('returns true when all conditions met', () => {
    expect(canManageEditorLineItems('test', true, true, false)).toBe(true)
  })

  it('returns false when canEditLineItems is false', () => {
    expect(canManageEditorLineItems('test', false, true, false)).toBe(false)
  })

  it('returns false when canSaveCurrentEditor is false', () => {
    expect(canManageEditorLineItems('test', true, false, false)).toBe(false)
  })

  it('returns false when record is locked and module locks items', () => {
    register('test', { locksLineItemsWhenRecordLocked: true })
    expect(canManageEditorLineItems('test', true, true, true)).toBe(false)
  })

  it('returns true when record is locked but module does not lock items', () => {
    expect(canManageEditorLineItems('test', true, true, true)).toBe(true)
  })
})

describe('applyModuleDefaultEditorDraft', () => {
  it('applies object defaultDraftValues', () => {
    register('test', { defaultDraftValues: { priceMode: '按吨' } })
    const draft = { id: '' } as any
    applyModuleDefaultEditorDraft('test', draft, '张三')
    expect(draft.priceMode).toBe('按吨')
  })

  it('applies function defaultDraftValues', () => {
    register('test', { defaultDraftValues: () => ({ orderDate: '2026-01-01' }) })
    const draft = { id: '' } as any
    applyModuleDefaultEditorDraft('test', draft, '张三')
    expect(draft.orderDate).toBe('2026-01-01')
  })

  it('sets defaultOperatorField', () => {
    register('test', { defaultOperatorField: 'buyerName' })
    const draft = { id: '' } as any
    applyModuleDefaultEditorDraft('test', draft, '张三')
    expect(draft.buyerName).toBe('张三')
  })

  it('skips setting when defaultOperatorField is not a string', () => {
    register('test', { defaultOperatorField: true })
    const draft = { id: '' } as any
    applyModuleDefaultEditorDraft('test', draft, '张三')
    expect(draft.buyerName).toBeUndefined()
  })

  it('handles missing defaultDraftValues', () => {
    const draft = { id: '' } as any
    applyModuleDefaultEditorDraft('test', draft, '张三')
    expect(draft.id).toBe('')
  })
})

describe('applyFormFieldDefaultDraftValues', () => {
  it('sets default values for fields', () => {
    const draft = { id: '' } as any
    const fields = [
      { key: 'status', label: '状态', type: 'select', defaultValue: '正常' },
      { key: 'sortOrder', label: '排序', type: 'number', defaultValue: 0 },
    ] as any
    applyFormFieldDefaultDraftValues(draft, fields)
    expect(draft.status).toBe('正常')
    expect(draft.sortOrder).toBe(0)
  })

  it('skips fields without defaultValue', () => {
    const draft = { id: '' } as any
    const fields = [{ key: 'status', label: '状态', type: 'select' }] as any
    applyFormFieldDefaultDraftValues(draft, fields)
    expect(draft.status).toBeUndefined()
  })

  it('skips fields where draft already has a value', () => {
    const draft = { id: '', status: '禁用' } as any
    const fields = [
      { key: 'status', label: '状态', type: 'select', defaultValue: '正常' },
    ] as any
    applyFormFieldDefaultDraftValues(draft, fields)
    expect(draft.status).toBe('禁用')
  })

  it('handles empty fields array', () => {
    const draft = { id: '' } as any
    applyFormFieldDefaultDraftValues(draft, [])
    expect(draft.id).toBe('')
  })

  it('handles undefined fields', () => {
    const draft = { id: '' } as any
    applyFormFieldDefaultDraftValues(draft, undefined)
    expect(draft.id).toBe('')
  })
})

describe('isEditorFieldDisabledForModule', () => {
  it('returns true when canSaveCurrentEditor is false', () => {
    expect(isEditorFieldDisabledForModule('test', 'name', false, false, false)).toBe(true)
  })

  it('returns true when fieldDisabled is true', () => {
    expect(isEditorFieldDisabledForModule('test', 'name', true, true, false)).toBe(true)
  })

  it('returns true when parentFieldKey matches fieldKey', () => {
    expect(isEditorFieldDisabledForModule('test', 'name', false, true, false, undefined, 'name')).toBe(true)
  })

  it('returns true when field is in readonlyEditorFields', () => {
    register('test', { readonlyEditorFields: ['name'] })
    expect(isEditorFieldDisabledForModule('test', 'name', false, true, false)).toBe(true)
  })

  it('returns true when resolveReadonlyEditorFields includes fieldKey', () => {
    register('test', {
      resolveReadonlyEditorFields: (record: any) => ['name'],
    })
    expect(isEditorFieldDisabledForModule('test', 'name', false, true, false, undefined, undefined, { id: '1' } as any)).toBe(true)
  })

  it('returns true when record locked and field not in editableLockedFields', () => {
    register('test', {
      locksLineItemsWhenRecordLocked: true,
      editableLockedFields: ['remark'],
    })
    expect(isEditorFieldDisabledForModule('test', 'name', false, true, true)).toBe(true)
  })

  it('returns false when record locked and field is in editableLockedFields', () => {
    register('test', {
      locksLineItemsWhenRecordLocked: true,
      editableLockedFields: ['remark'],
    })
    expect(isEditorFieldDisabledForModule('test', 'remark', false, true, true)).toBe(false)
  })

  it('returns false when all conditions pass', () => {
    expect(isEditorFieldDisabledForModule('test', 'remark', false, true, false)).toBe(false)
  })
})

describe('isEditorItemColumnEditableForModule', () => {
  it('returns false when canEditLineItems is false', () => {
    expect(isEditorItemColumnEditableForModule('test', 'col', false, false)).toBe(false)
  })

  it('returns false when column is in readonlyItemColumns', () => {
    register('test', { readonlyItemColumns: ['col'] })
    expect(isEditorItemColumnEditableForModule('test', 'col', true, false)).toBe(false)
  })

  it('returns false when readonlyLineItems is true', () => {
    register('test', { readonlyLineItems: true })
    expect(isEditorItemColumnEditableForModule('test', 'col', true, false)).toBe(false)
  })

  it('returns false for derived readonly columns', () => {
    expect(isEditorItemColumnEditableForModule('test', 'sourceNo', true, false)).toBe(false)
  })

  it('returns true for weightTon on purchase-inbound', () => {
    expect(isEditorItemColumnEditableForModule('purchase-inbound', 'weightTon', true, false)).toBe(true)
  })

  it('returns false for batchNo on purchase-inbound', () => {
    expect(isEditorItemColumnEditableForModule('purchase-inbound', 'batchNo', true, false)).toBe(false)
  })

  it('returns false for batchNo on purchase-order', () => {
    expect(isEditorItemColumnEditableForModule('purchase-order', 'batchNo', true, false)).toBe(false)
  })

  it('returns true for batchNo on sales-order', () => {
    expect(isEditorItemColumnEditableForModule('sales-order', 'batchNo', true, false)).toBe(true)
  })

  it('returns false when locked and column not in editableLockedItemColumns', () => {
    register('test', {
      locksLineItemsWhenRecordLocked: true,
      editableLockedItemColumns: ['col1'],
    })
    expect(isEditorItemColumnEditableForModule('test', 'col2', true, true)).toBe(false)
  })

  it('returns true when locked and column is in editableLockedItemColumns', () => {
    register('test', {
      locksLineItemsWhenRecordLocked: true,
      editableLockedItemColumns: ['col1'],
    })
    expect(isEditorItemColumnEditableForModule('test', 'col1', true, true)).toBe(true)
  })

  it('returns true by default', () => {
    expect(isEditorItemColumnEditableForModule('test', 'col', true, false)).toBe(true)
  })

  it('returns false for derived readonly column sourceNo', () => {
    expect(isEditorItemColumnEditableForModule('test', 'sourceNo', true, false)).toBe(false)
  })

  it('returns false for derived readonly column amount', () => {
    expect(isEditorItemColumnEditableForModule('test', 'amount', true, false)).toBe(false)
  })
})
