import { beforeEach, describe, expect, it } from 'vitest'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'
import {
  normalizeDraftRecordForModule,
  syncDerivedEditorFormValuesForModule,
} from './module-editor-draft'

const sumLineItemsBy = (_items: any[], key: string) => {
  return (_items as any[]).reduce(
    (s: number, item: any) => s + Number(item[key] || 0),
    0,
  )
}

beforeEach(() => {
  moduleBehaviorRegistry.clear()
})

function register(key: string, config: Record<string, any>) {
  moduleBehaviorRegistry.set(key, config as any)
}

describe('normalizeDraftRecordForModule', () => {
  it('applies form field default values to new drafts', () => {
    const formFields: ModuleFormFieldDefinition[] = [
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
      },
      {
        key: 'sortOrder',
        label: '排序',
        type: 'number',
        defaultValue: 0,
      },
    ]
    const record = { id: '' }

    normalizeDraftRecordForModule({
      moduleKey: 'supplier',
      record,
      items: [],
      currentOperatorName: 'tester',
      sumLineItemsBy,
      formFields,
    })

    expect(record.status).toBe('正常')
    expect(record.sortOrder).toBe(0)
  })

  it('keeps explicit draft values before applying defaults', () => {
    const formFields: ModuleFormFieldDefinition[] = [
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
      },
    ]
    const record = { id: '', status: '禁用' }

    normalizeDraftRecordForModule({
      moduleKey: 'supplier',
      record,
      items: [],
      currentOperatorName: 'tester',
      sumLineItemsBy,
      formFields,
    })

    expect(record.status).toBe('禁用')
  })

  it('computes amounts when module has computesAmounts behavior', () => {
    register('test', { computesAmounts: true })
    const record = { id: '' }
    const items = [
      { weightTon: 10.1234, amount: 500 },
      { weightTon: 20.5678, amount: 1000 },
    ] as any

    normalizeDraftRecordForModule({
      moduleKey: 'test',
      record,
      items,
      currentOperatorName: 'tester',
      sumLineItemsBy,
    })

    expect(record.totalWeight).toBe(30.6912)
    expect(record.totalAmount).toBe(1500)
  })

  it('executes normalizeDraftRecord behavior if registered', () => {
    const normalizeFn = vi.fn()
    register('test', { normalizeDraftRecord: normalizeFn })
    const record = { id: '' }
    const items = [{ id: '1' }] as any

    normalizeDraftRecordForModule({
      moduleKey: 'test',
      record,
      items,
      currentOperatorName: 'tester',
      sumLineItemsBy,
    })

    expect(normalizeFn).toHaveBeenCalledWith(record, items, {
      primaryNoKey: undefined,
      currentOperatorName: 'tester',
      sumLineItemsBy,
    })
  })

  it('sets default status when record.status is empty and defaultStatus is registered', () => {
    register('test', { defaultStatus: '草稿' })
    const record = { id: '' }

    normalizeDraftRecordForModule({
      moduleKey: 'test',
      record,
      items: [],
      currentOperatorName: 'tester',
      sumLineItemsBy,
    })

    expect(record.status).toBe('草稿')
  })

  it('does not override existing status', () => {
    register('test', { defaultStatus: '草稿' })
    const record = { id: '', status: '已审核' }

    normalizeDraftRecordForModule({
      moduleKey: 'test',
      record,
      items: [],
      currentOperatorName: 'tester',
      sumLineItemsBy,
    })

    expect(record.status).toBe('已审核')
  })
})

describe('syncDerivedEditorFormValuesForModule', () => {
  it('computes amounts when module has computesAmounts behavior', () => {
    register('test', { computesAmounts: true })
    const record = { id: '' }
    const items = [
      { weightTon: 10, amount: 500 },
      { weightTon: 20, amount: 1000 },
    ] as any

    syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items,
      sumLineItemsBy,
    })

    expect(record.totalWeight).toBe(30)
    expect(record.totalAmount).toBe(1500)
  })

  it('executes normalizeDraftRecord if registered', () => {
    const normalizeFn = vi.fn()
    register('test', { normalizeDraftRecord: normalizeFn })
    const record = { id: '' }
    const items = [{ id: '1' }] as any

    syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items,
      sumLineItemsBy,
    })

    expect(normalizeFn).toHaveBeenCalledWith(record, items, {
      primaryNoKey: undefined,
      currentOperatorName: '',
      sumLineItemsBy,
    })
  })

  it('executes syncEditorForm if registered', () => {
    const syncFn = vi.fn()
    register('test', { syncEditorForm: syncFn })
    const record = { id: '' }
    const items = [{ id: '1' }] as any

    syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items,
      sumLineItemsBy,
      changedKeys: new Set(['signDate']),
    })

    expect(syncFn).toHaveBeenCalledWith(record, {
      changedKeys: new Set(['signDate']),
    })
  })

  it('passes empty Set when changedKeys is undefined', () => {
    const syncFn = vi.fn()
    register('test', { syncEditorForm: syncFn })
    const record = { id: '' }
    const items = [{ id: '1' }] as any

    syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items,
      sumLineItemsBy,
    })

    expect(syncFn).toHaveBeenCalledWith(record, { changedKeys: new Set() })
  })

  it('returns the record', () => {
    const record = { id: 'test' } as any
    const result = syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items: [],
      sumLineItemsBy,
    })
    expect(result).toBe(record)
  })

  it('does not call normalizeDraftRecord when not registered', () => {
    const record = { id: '' }
    const items = [{ id: '1', weightTon: 10, amount: 500 }] as any

    const result = syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items,
      sumLineItemsBy,
    })

    expect(result.id).toBe('')
  })

  it('does not call syncEditorForm when not registered', () => {
    const record = { id: '' }
    const items = [{ id: '1' }] as any

    const result = syncDerivedEditorFormValuesForModule({
      moduleKey: 'test',
      record,
      items,
      sumLineItemsBy,
    })

    expect(result.id).toBe('')
  })
})
