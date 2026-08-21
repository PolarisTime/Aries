import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import {
  getBehaviorValue,
  hasBehavior,
} from '@/module-system/behavior/module-behavior-registry'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
} from '@/module-system/editor/module-editor-access'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'

export function normalizeDraftRecordForModule(options: {
  moduleKey: string
  record: ModuleRecordInput
  items: ModuleLineItem[]
  primaryNoKey?: string
  currentOperatorName: string
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
  formFields?: Parameters<typeof applyFormFieldDefaultDraftValues>[1]
}) {
  const {
    moduleKey,
    record,
    items,
    primaryNoKey,
    currentOperatorName,
    sumLineItemsBy,
  } = options

  applyFormFieldDefaultDraftValues(record, options.formFields)
  applyModuleDefaultEditorDraft(moduleKey, record, currentOperatorName)

  applyComputedTotals(moduleKey, record, items, sumLineItemsBy)

  const normalizeFn = getBehaviorValue(moduleKey, 'normalizeDraftRecord')
  if (normalizeFn) {
    normalizeFn(record, items, {
      primaryNoKey,
      currentOperatorName,
      sumLineItemsBy,
    })
  }

  if (!record.status) {
    const defaultStatus = getBehaviorValue(moduleKey, 'defaultStatus')
    if (defaultStatus) {
      record.status = defaultStatus
    }
  }

  return record
}

export function syncDerivedEditorFormValuesForModule(options: {
  moduleKey: string
  record: ModuleRecordInput
  items: ModuleLineItem[]
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
  changedKeys?: ReadonlySet<string>
}) {
  const { moduleKey, record, items, sumLineItemsBy, changedKeys } = options

  applyComputedTotals(moduleKey, record, items, sumLineItemsBy)

  const normalizeFn = getBehaviorValue(moduleKey, 'normalizeDraftRecord')
  if (normalizeFn) {
    normalizeFn(record, items, {
      primaryNoKey: undefined,
      currentOperatorName: '',
      sumLineItemsBy,
    })
  }

  const syncEditorForm = getBehaviorValue(moduleKey, 'syncEditorForm')
  if (syncEditorForm) {
    syncEditorForm(record, {
      changedKeys: changedKeys || new Set<string>(),
    })
  }

  return record
}

function applyComputedTotals(
  moduleKey: string,
  record: ModuleRecordInput,
  items: ModuleLineItem[],
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number,
) {
  if (!hasBehavior(moduleKey, 'computesAmounts')) {
    return
  }
  record.totalWeight = Number(
    sumLineItemsBy(items, 'weightTon').toFixed(INTERNAL_WEIGHT_PRECISION),
  )
  record.totalAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
}
