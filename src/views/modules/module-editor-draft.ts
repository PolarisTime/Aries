import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { applyModuleDefaultEditorDraft } from './module-editor-access'

export function normalizeDraftRecordForModule(options: {
  moduleKey: string
  record: ModuleRecord
  items: ModuleLineItem[]
  primaryNoKey?: string
  generatePrimaryNo: () => string
  currentOperatorName: string
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}) {
  const {
    moduleKey,
    record,
    items,
    primaryNoKey,
    generatePrimaryNo: createPrimaryNo,
    currentOperatorName,
    sumLineItemsBy,
  } = options

  if (primaryNoKey && !record[primaryNoKey]) {
    record[primaryNoKey] = createPrimaryNo()
  }

  applyModuleDefaultEditorDraft(moduleKey, record, currentOperatorName)

  if (hasBehavior(moduleKey, 'computesAmounts')) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
  }

  const normalizeFn = getBehaviorValue(moduleKey, 'normalizeDraftRecord')
  if (normalizeFn) {
    normalizeFn(record, items, {
      primaryNoKey,
      generatePrimaryNo: createPrimaryNo,
      currentOperatorName,
      sumLineItemsBy,
    })
  }

  if (!record.status) {
    const defaultStatus = getBehaviorValue(moduleKey, 'defaultStatus')
    if (defaultStatus) {
      record.status = defaultStatus as string
    }
  }

  return record
}

export function syncDerivedEditorFormValuesForModule(options: {
  moduleKey: string
  record: ModuleRecord
  items: ModuleLineItem[]
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}) {
  const { moduleKey, record, items, sumLineItemsBy } = options

  if (hasBehavior(moduleKey, 'computesAmounts')) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
  }

  const normalizeFn = getBehaviorValue(moduleKey, 'normalizeDraftRecord')
  if (normalizeFn) {
    normalizeFn(record, items, {
      primaryNoKey: undefined,
      generatePrimaryNo: () => '',
      currentOperatorName: '',
      sumLineItemsBy,
    })
  }

  const syncEditorForm = getBehaviorValue(moduleKey, 'syncEditorForm')
  if (syncEditorForm) {
    syncEditorForm(record)
  }

  return record
}
