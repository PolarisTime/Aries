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
  /** 单据附加费用合计；提供时叠加进 totalAmount（货物 + 费用）。 */
  chargeTotal?: number
}) {
  const {
    moduleKey,
    record,
    items,
    primaryNoKey,
    currentOperatorName,
    sumLineItemsBy,
    chargeTotal,
  } = options

  applyFormFieldDefaultDraftValues(record, options.formFields)
  applyModuleDefaultEditorDraft(moduleKey, record, currentOperatorName)

  applyComputedTotals(moduleKey, record, items, sumLineItemsBy, {
    chargeTotal,
  })

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
  /** 单据附加费用合计；提供时叠加进 totalAmount（货物 + 费用）。 */
  chargeTotal?: number
}) {
  const { moduleKey, record, items, sumLineItemsBy, changedKeys, chargeTotal } =
    options

  applyComputedTotals(moduleKey, record, items, sumLineItemsBy, {
    chargeTotal,
  })

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
  options?: { chargeTotal?: number },
) {
  if (!hasBehavior(moduleKey, 'computesAmounts')) {
    return
  }
  record.totalWeight = Number(
    sumLineItemsBy(items, 'weightTon').toFixed(INTERNAL_WEIGHT_PRECISION),
  )
  // 单据总金额 = 货物小计 + 附加费用小计；费用通道未启用时 chargeTotal 缺省为 0，口径不变。
  const chargeTotal = options?.chargeTotal
  const chargeAmount =
    typeof chargeTotal === 'number' && Number.isFinite(chargeTotal)
      ? chargeTotal
      : 0
  record.totalAmount = Number(
    (sumLineItemsBy(items, 'amount') + chargeAmount).toFixed(2),
  )
}
