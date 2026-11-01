import type { ModuleKey } from '@/module-system/core/module-key'
import {
  isMainFlowModuleKey,
  type MainFlowModuleKey,
  mainFlowDetailRecordSchemas,
} from '@/shared/schemas/module-record'
import type { EntityId } from '@/types/entity-id'
import type { ModuleLineItem } from '@/types/module-page'
import type {
  LegacyModuleRecordInput,
  MainFlowDetailRecord,
  MainFlowEditorDraft,
  ModuleDetailRecordFor,
  ModuleEditorDraftFor,
  PersistedModuleEditorDraftFor,
} from '@/types/module-record'
import type { EditorFormValues } from '@/views/modules/module-editor-workspace-support'

interface EditorDraftSource {
  id: EntityId
  items?: readonly (object & { id: EntityId })[]
}

function copyDynamicFields(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value))
}

export function toLegacyEditorDraft(
  detail: EditorDraftSource,
): LegacyModuleRecordInput {
  return {
    ...detail,
    items: detail.items?.map((item) => ({ ...item })),
  }
}

export interface DocumentChargeItemDraft {
  id?: EntityId
  chargeName: string
  materialId?: EntityId
  amount: number
  unit?: string
  remark?: string
}

/**
 * 附加费用合计：金额非法按 0 计；两位舍入由 applyComputedTotals 统一处理。
 *
 * <p>只要求 `amount` 一个字段（`Pick`），因此「编辑器附加节点」这类只需要费用合计的
 * 调用方不必构造完整的费用行，也不会因为多出一个费用行类型而产生第二份求和。</p>
 */
export function sumChargeItemAmount(
  items: readonly Pick<DocumentChargeItemDraft, 'amount'>[],
) {
  return items.reduce((sum, item) => {
    const amount = Number(item.amount)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

export function toEditorFormState(
  draft: PersistedModuleEditorDraftFor<ModuleKey>,
): {
  values: EditorFormValues
  items: ModuleLineItem[]
  chargeItems: DocumentChargeItemDraft[]
} {
  const items = (draft.items || []).map((item) => ({
    ...copyDynamicFields(item),
    id: item.id,
  }))
  // 附加费用行走独立通道：detail schema 已声明 chargeItems 才有值
  const rawChargeItems =
    (draft as { chargeItems?: readonly object[] }).chargeItems || []
  const chargeItems: DocumentChargeItemDraft[] = rawChargeItems.map((item) => {
    // 附加费用行来自后端 JSON, 字段类型未知: 逐个字段显式转换,
    // 不做「整体强转成 Draft」——缺字段/改类型时由这里兜住, 而不是静默带进表单。
    const row = copyDynamicFields(item)
    return {
      ...(row.id != null ? { id: String(row.id) } : {}),
      chargeName: String(row.chargeName ?? ''),
      ...(row.materialId != null ? { materialId: String(row.materialId) } : {}),
      amount: Number(row.amount ?? 0),
      ...(row.unit ? { unit: String(row.unit) } : {}),
      ...(row.remark ? { remark: String(row.remark) } : {}),
    }
  })
  return {
    values: {
      ...copyDynamicFields(draft),
      id: draft.id,
      items,
    },
    items,
    chargeItems,
  }
}

export function buildEditorSubmissionDraft<Key extends ModuleKey>(
  moduleKey: Key,
  values: EditorFormValues,
  items: ModuleLineItem[],
  chargeItems?: DocumentChargeItemDraft[],
): ModuleEditorDraftFor<Key>
export function buildEditorSubmissionDraft(
  _moduleKey: ModuleKey,
  values: EditorFormValues,
  items: ModuleLineItem[],
  chargeItems?: DocumentChargeItemDraft[],
): object {
  // chargeItems 来自工作区独立通道（表单 values 不包含），显式并入保存草稿。
  return { ...values, items, ...(chargeItems ? { chargeItems } : {}) }
}

export function toEditorDraft<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  detail: MainFlowDetailRecord<Key>,
): MainFlowEditorDraft<Key>
export function toEditorDraft<Key extends string>(
  moduleKey: Key,
  detail: ModuleDetailRecordFor<Key>,
): ModuleEditorDraftFor<Key>
export function toEditorDraft(
  moduleKey: string,
  detail: EditorDraftSource,
): LegacyModuleRecordInput | MainFlowEditorDraft<MainFlowModuleKey> {
  if (!isMainFlowModuleKey(moduleKey)) {
    return toLegacyEditorDraft(detail)
  }

  switch (moduleKey) {
    case 'purchase-order': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
    case 'purchase-inbound': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
    case 'sales-order': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
    case 'sales-outbound': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
    case 'sales-return': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
    case 'freight-bill': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
  }
}
