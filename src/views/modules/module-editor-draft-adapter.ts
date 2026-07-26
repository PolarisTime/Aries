import type { ModuleKey } from '@/module-system/module-key'
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

export function toEditorFormState(
  draft: PersistedModuleEditorDraftFor<ModuleKey>,
): { values: EditorFormValues; items: ModuleLineItem[] } {
  const items = (draft.items || []).map((item) => ({
    ...copyDynamicFields(item),
    id: item.id,
  }))
  return {
    values: {
      ...copyDynamicFields(draft),
      id: draft.id,
      items,
    },
    items,
  }
}

export function buildEditorSubmissionDraft<Key extends ModuleKey>(
  moduleKey: Key,
  values: EditorFormValues,
  items: ModuleLineItem[],
): ModuleEditorDraftFor<Key>
export function buildEditorSubmissionDraft(
  _moduleKey: ModuleKey,
  values: EditorFormValues,
  items: ModuleLineItem[],
): object {
  return { ...values, items }
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
    case 'freight-bill': {
      const record = mainFlowDetailRecordSchemas[moduleKey].parse(detail)
      return { ...record, items: record.items.map((item) => ({ ...item })) }
    }
  }
}
