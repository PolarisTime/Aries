import type { Dayjs } from 'dayjs'
import type {
  MainFlowModuleKey,
  ModuleListRecordMap,
  ModuleRecordMap,
  ModuleSaveRequestMap,
} from '@/shared/schemas/module-record'
import type { EntityId } from '@/types/entity-id'

/** 尚未迁移到精确契约的动态模块表单值。 */
export type LegacyModuleRecordInput = {
  id?: EntityId
  items?: LegacyModuleLineItem[]
  [key: string]: unknown
}

/** 尚未迁移到精确契约的动态模块行项目。 */
export type LegacyModuleLineItem = {
  id: EntityId
  [key: string]: unknown
}

/** 尚未迁移到精确契约的 API/页面记录。 */
export type LegacyModuleRecord = {
  id: EntityId
  items?: LegacyModuleLineItem[]
  [key: string]: unknown
}

type KeysOfUnion<Value> = Value extends Value ? keyof Value : never

type ValueAtKey<Value, Key extends PropertyKey> = Value extends Value
  ? Key extends keyof Value
    ? Value[Key]
    : never
  : never

type EditorFieldValue<Key extends PropertyKey, Value> = Key extends string
  ? Key extends `${string}Date` | `${string}Time`
    ? Value | Dayjs
    : Value
  : Value

type EditorDraftFields<Value> = {
  [Key in KeysOfUnion<Value>]?: EditorFieldValue<Key, ValueAtKey<Value, Key>>
}

type MainFlowDetailLineItem<Key extends MainFlowModuleKey> =
  ModuleRecordMap[Key]['items'][number]

type MainFlowSaveLineItem<Key extends MainFlowModuleKey> =
  ModuleSaveRequestMap[Key]['items'][number]

interface MainFlowEditorLineItemMetadata {
  _maxImportAmount?: number
  _maxImportQuantity?: number
  _maxImportWeightTon?: number
  _parentRelationId?: EntityId
  _parentRelationNo?: string
  _sourcePieceWeightTon?: number
  _sourceTotalQuantity?: number
  _sourceTotalWeightTon?: number
  _sourceWeighWeightTon?: number
  maxImportAmount?: number
  maxImportQuantity?: number
  maxImportWeightTon?: number
  remainingAmount?: number
}

interface PurchaseOrderEditorLineItemFields {
  materialName?: string | null
  settlementMode?: string | null
  weightAdjustmentAmount?: number | string | null
  weightAdjustmentTon?: number | string | null
}

type MainFlowEditorLineItemFields<Key extends MainFlowModuleKey> =
  Key extends 'purchase-order'
    ? PurchaseOrderEditorLineItemFields
    : Record<never, never>

type MainFlowEditorLineItemFor<Key extends MainFlowModuleKey> = Omit<
  EditorDraftFields<MainFlowDetailLineItem<Key> | MainFlowSaveLineItem<Key>>,
  'id'
> &
  MainFlowEditorLineItemMetadata & {
    id: EntityId
  } & MainFlowEditorLineItemFields<Key>

type MainFlowEditorDraftFor<Key extends MainFlowModuleKey> = Omit<
  EditorDraftFields<
    | Omit<ModuleRecordMap[Key], 'items'>
    | Omit<ModuleSaveRequestMap[Key], 'items'>
  >,
  'id'
> & {
  id?: EntityId
  attachmentIds?: EntityId[]
  items?: MainFlowEditorLineItemFor<Key>[]
  sourceOrderNos?: string
}

export type MainFlowEditorLineItemMap = {
  [Key in MainFlowModuleKey]: MainFlowEditorLineItemFor<Key>
}

export type MainFlowEditorDraftMap = {
  [Key in MainFlowModuleKey]: MainFlowEditorDraftFor<Key>
}

export type MainFlowListRecord<Key extends MainFlowModuleKey> =
  ModuleListRecordMap[Key]

export type MainFlowDetailRecord<Key extends MainFlowModuleKey> =
  ModuleRecordMap[Key]

export type MainFlowEditorLineItem<Key extends MainFlowModuleKey> =
  MainFlowEditorLineItemMap[Key]

export type MainFlowEditorDraft<Key extends MainFlowModuleKey> =
  MainFlowEditorDraftMap[Key]

export type MainFlowSaveRequest<Key extends MainFlowModuleKey> =
  ModuleSaveRequestMap[Key]

export type ModuleListRecordFor<Key extends string> =
  Key extends MainFlowModuleKey ? ModuleListRecordMap[Key] : LegacyModuleRecord

export type ModuleDetailRecordFor<Key extends string> =
  Key extends MainFlowModuleKey ? ModuleRecordMap[Key] : LegacyModuleRecord

export type ModuleEditorDraftFor<Key extends string> =
  Key extends MainFlowModuleKey
    ? MainFlowEditorDraftMap[Key]
    : LegacyModuleRecordInput

export type PersistedModuleEditorDraftFor<Key extends string> =
  ModuleEditorDraftFor<Key> & { id: EntityId }

export type ModuleSaveRequestFor<Key extends string> =
  Key extends MainFlowModuleKey
    ? ModuleSaveRequestMap[Key]
    : LegacyModuleRecordInput

/** @deprecated 动态模块兼容别名；精确主流程请使用 MainFlowEditorDraft。 */
export type ModuleRecordInput = LegacyModuleRecordInput

/** @deprecated 动态模块兼容别名；精确主流程请使用 MainFlowEditorLineItem。 */
export type ModuleLineItem = LegacyModuleLineItem

/** @deprecated 动态模块兼容别名；精确主流程请使用映射后的记录类型。 */
export type ModuleRecord = LegacyModuleRecord
