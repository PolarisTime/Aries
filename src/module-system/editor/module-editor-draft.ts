import {
  getBehaviorValue,
  hasBehavior,
} from '@/module-system/behavior/module-behavior-registry'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
} from '@/module-system/editor/module-editor-access'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'
import { roundWeight, sumAmounts } from '@/utils/money'

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
  const totals = computeDraftTotals(
    moduleKey,
    items,
    sumLineItemsBy,
    options?.chargeTotal,
  )
  if (!totals) {
    return
  }
  record.totalWeight = totals.totalWeight
  record.totalAmount = totals.totalAmount
}

/** 单据合计口径的计算结果。 */
export interface DraftComputedTotals {
  /** 单据总金额 = 货物小计 + 附加费用小计（2 位）。 */
  totalAmount: number
  /** 单据总吨位 = 明细 weightTon 之和（INTERNAL_WEIGHT_PRECISION 位）。 */
  totalWeight: number
}

/**
 * 单据合计口径的**唯一计算出口**（货物 + 附加费用）。
 *
 * <p>调用方分两类，必须共用这一处，不得各写一份求和：</p>
 * <ol>
 *   <li>表单联动 —— {@link applyComputedTotals} 把结果写回 `totalWeight` / `totalAmount`，
 *     这就是保存载荷里的合计；</li>
 *   <li>「项目数据」面板 —— 编辑器里把同一结果当作 `pendingAmount` / `pendingTonnage`
 *     发给 `GET /api/v2/projects/{id}/sales-summary`。若面板自己 reduce 一遍，
 *     「含本单」的金额/吨位就会与保存后的实际值分叉。</li>
 * </ol>
 *
 * <p>返回 `null` 表示该模块不计算金额（`computesAmounts` 行为未注册），
 * 调用方应保持原值不变（本函数不写 record）。</p>
 */
export function computeDraftTotals(
  moduleKey: string,
  items: ModuleLineItem[],
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number,
  chargeTotal?: number,
): DraftComputedTotals | null {
  if (!hasBehavior(moduleKey, 'computesAmounts')) {
    return null
  }
  const totalWeight = roundWeight(sumLineItemsBy(items, 'weightTon'))
  // 单据总金额 = 货物小计 + 附加费用小计；费用通道未启用时 chargeTotal 缺省为 0，口径不变。
  const chargeAmount =
    typeof chargeTotal === 'number' && Number.isFinite(chargeTotal)
      ? chargeTotal
      : 0
  const totalAmount = sumAmounts([
    sumLineItemsBy(items, 'amount'),
    chargeAmount,
  ])
  return { totalAmount, totalWeight }
}
