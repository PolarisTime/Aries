import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import {
  isPurchaseInbound,
  isPurchaseModule,
  isPurchaseOrder,
  isSalesOutbound,
} from '@/module-system/core/module-category'
import { isModuleKey, type ModuleKey } from '@/module-system/core/module-key'
import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import { DERIVED_READONLY_ITEM_COLUMN_KEYS } from '@/module-system/editor/module-editor-shared'
import type {
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export function isModuleLineItemsLocked(moduleKey: string, statuses: string[]) {
  const lockedStatuses = getBehaviorValue(moduleKey, 'lineItemLockStatuses')
  if (!lockedStatuses?.length) {
    return false
  }
  const lockedStatusSet = new Set(lockedStatuses)
  return statuses.some((status) => lockedStatusSet.has(status))
}

export function canManageEditorLineItems(
  moduleKey: string,
  canEditLineItems: boolean,
  canSaveCurrentEditor: boolean,
  lineItemsLocked: boolean,
) {
  if (getBehaviorValue(moduleKey, 'readonlyLineItems') === true) {
    return false
  }

  return (
    canEditLineItems &&
    canSaveCurrentEditor &&
    !(
      Boolean(getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked')) &&
      lineItemsLocked
    )
  )
}

/**
 * 明细**行序**是否可调整(整行长按拖动 / 上移下移按钮 / Alt+↑↓)。
 *
 * <p>与 {@link canManageEditorLineItems}(行内字段是否可编辑 / 能否增删行)
 * <b>刻意分开</b>, 原因是两者锁的不是一回事:</p>
 *
 * <ul>
 *   <li>「交付核定」这类锁定态锁的是**行内字段值** —— 销售订单锁 `unitPrice`
 *       等白名单列(见 `SALES_ORDER_LOCKED_ITEM_COLUMN_KEYS`);</li>
 *   <li>拖动排序**不碰任何字段值**, 只重排数组下标; 服务端保存时按
 *       `line_no = 下标 + 1` 重编, 分配量与来源关系一个都不动;</li>
 *   <li>因此「字段锁了」不等于「行序也锁了」。把两者绑在一起会让交付核定状态
 *       连行序都不能调(用户报的问题: 处于交付核定状态下单据无法拖拽调整顺序)。</li>
 * </ul>
 *
 * <p>仍然保留两道必要的闸:</p>
 * <ol>
 *   <li>`readonlyLineItems` —— 模块设计上明细整体只读;</li>
 *   <li>`canSaveCurrentEditor` —— 单据本身不可保存时, 改了顺序也存不下去,
 *       此时不提供拖动更能避免"拖了但白拖"的错觉。</li>
 * </ol>
 *
 * <p>模块**设计性**禁拖(物流单/运费对账单, 行序由上游决定)仍由
 * `canReorderModuleEditorItems` 的 `disablesItemReorder` 把关, 不在本函数里判。</p>
 */
export function canReorderEditorLineItems(
  moduleKey: string,
  canEditLineItems: boolean,
  canSaveCurrentEditor: boolean,
) {
  if (getBehaviorValue(moduleKey, 'readonlyLineItems') === true) {
    return false
  }

  return canEditLineItems && canSaveCurrentEditor
}

export function applyModuleDefaultEditorDraft(
  moduleKey: string,
  draft: ModuleRecordInput,
  currentOperatorName: string,
) {
  const defaultDraftValues = getBehaviorValue(moduleKey, 'defaultDraftValues')
  if (defaultDraftValues) {
    const resolvedDraftValues =
      typeof defaultDraftValues === 'function'
        ? defaultDraftValues()
        : defaultDraftValues
    for (const [key, value] of Object.entries(resolvedDraftValues)) {
      if (draft[key] === undefined) {
        draft[key] = value
      }
    }
  }

  const defaultOperatorField = getBehaviorValue(
    moduleKey,
    'defaultOperatorField',
  )
  if (
    typeof defaultOperatorField === 'string' &&
    draft[defaultOperatorField] === undefined
  ) {
    draft[defaultOperatorField] = currentOperatorName
  }

  return draft
}

export function applyFormFieldDefaultDraftValues(
  draft: ModuleRecordInput,
  fields: ModuleFormFieldDefinition[] = [],
) {
  for (const field of fields) {
    if (
      !Object.hasOwn(field, 'defaultValue') ||
      draft[field.key] !== undefined
    ) {
      continue
    }
    draft[field.key] = field.defaultValue
  }

  return draft
}

export function isEditorFieldDisabledForModule(
  moduleKey: string,
  fieldKey: string,
  fieldDisabled: boolean,
  canSaveCurrentEditor: boolean,
  lineItemsLocked: boolean,
  primaryNoKey?: string,
  parentFieldKey?: string,
  record?: ModuleRecord,
  authoritativePrimaryNo?: string,
) {
  const effectiveParentFieldKey = parentFieldKey

  if (!canSaveCurrentEditor) {
    return true
  }

  if (primaryNoKey && fieldKey === primaryNoKey && authoritativePrimaryNo) {
    return true
  }

  if (fieldDisabled) {
    return true
  }

  if (effectiveParentFieldKey && fieldKey === effectiveParentFieldKey) {
    return true
  }

  const parentImportedEditableFields = getBehaviorValue(
    moduleKey,
    'parentImportedEditableFields',
  )
  const parentImportLockApplies =
    getBehaviorValue(moduleKey, 'lockParentImportOnlyWhenPersisted') !== true ||
    Boolean(record?.id)
  if (
    effectiveParentFieldKey &&
    record &&
    parentImportLockApplies &&
    parentImportedEditableFields?.length &&
    asString(record[effectiveParentFieldKey]).trim()
  ) {
    return !parentImportedEditableFields.includes(fieldKey)
  }

  const readonlyFields = getBehaviorValue(moduleKey, 'readonlyEditorFields')
  if ((readonlyFields || []).includes(fieldKey)) {
    return true
  }

  const resolveReadonlyEditorFields = getBehaviorValue(
    moduleKey,
    'resolveReadonlyEditorFields',
  )
  if (record && resolveReadonlyEditorFields?.(record).includes(fieldKey)) {
    return true
  }

  if (
    getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked') &&
    lineItemsLocked
  ) {
    const lockedFields = getBehaviorValue(moduleKey, 'editableLockedFields')
    return !(lockedFields || []).includes(fieldKey)
  }

  return false
}

/**
 * 固有只读列的人工输入豁免表：特定模块的称重/实测列需要操作员填写。
 * 返回 true 表示该列对该行可编辑（越过派生只读判定）。
 */
type ItemColumnReadonlyExemption = (
  columnKey: string,
  record: ModuleLineItem,
) => boolean

const ITEM_COLUMN_READONLY_EXEMPTIONS = {
  // 销售订单隐藏商品编码列后，手工行通过“材质”列选择物料。
  // 已导入来源行仍由父单快照驱动，不能借此绕过来源锁定。
  'sales-order': (columnKey, record) =>
    columnKey === 'material' &&
    !asString(record.sourceInboundItemId).trim() &&
    !asString(record.sourcePurchaseOrderItemId).trim(),
} satisfies Partial<Record<ModuleKey, ItemColumnReadonlyExemption>>

function getItemColumnReadonlyExemption(
  moduleKey: string,
): ItemColumnReadonlyExemption | undefined {
  if (!isModuleKey(moduleKey)) return undefined
  return (
    ITEM_COLUMN_READONLY_EXEMPTIONS as Partial<
      Record<ModuleKey, ItemColumnReadonlyExemption>
    >
  )[moduleKey]
}

/**
 * 第一层：字段固有只读判定（与编辑状态无关，任何锁定白名单都不可越过）。
 * 包含 behavior 显式只读列、派生快照列（含显式声明的人工输入豁免）与模块特例。
 */
function isIntrinsicallyReadonlyItemColumn(
  moduleKey: string,
  columnKey: string,
  record?: ModuleLineItem,
) {
  const readonlyItemColumns = getBehaviorValue(moduleKey, 'readonlyItemColumns')
  if (readonlyItemColumns?.includes(columnKey)) {
    return true
  }

  const exemption = getItemColumnReadonlyExemption(moduleKey)
  if (exemption && record && exemption(columnKey, record)) {
    return false
  }

  if (DERIVED_READONLY_ITEM_COLUMN_KEYS.has(columnKey)) {
    // 人工输入豁免：这些列在特定模块是称重/实测结果，需要操作员填写。
    if (
      isPurchaseOrder(moduleKey) &&
      columnKey === 'pieceWeightTon' &&
      isPurchaseWeighRequiredCategory(record?.category)
    ) {
      return false
    }
    if (
      isSalesOutbound(moduleKey) &&
      (columnKey === 'actualWeightTon' || columnKey === 'weighWeightTon')
    ) {
      return false
    }
    return true
  }

  if (
    isPurchaseInbound(moduleKey) &&
    columnKey === 'materialCode' &&
    record?.sourcePurchaseOrderItemId
  ) {
    return true
  }

  if (columnKey === 'batchNo' && isPurchaseModule(moduleKey)) {
    return true
  }

  return false
}

export function isEditorItemColumnEditableForModule(
  moduleKey: string,
  columnKey: string,
  canEditLineItems: boolean,
  lineItemsLocked: boolean,
  record?: ModuleLineItem,
  parentImportedItemEditLocked = false,
) {
  if (!canEditLineItems) {
    return false
  }

  // 第一层：字段固有只读，任何状态白名单都不可越过。
  if (isIntrinsicallyReadonlyItemColumn(moduleKey, columnKey, record)) {
    return false
  }

  // 第二层：状态锁定，只能收窄第一层判定为可编辑的字段。
  const parentImportedItemEditableColumns = getBehaviorValue(
    moduleKey,
    'parentImportedItemEditableColumns',
  )
  if (
    parentImportedItemEditLocked &&
    parentImportedItemEditableColumns?.length
  ) {
    return parentImportedItemEditableColumns.includes(columnKey)
  }

  if (getBehaviorValue(moduleKey, 'readonlyLineItems') === true) {
    return false
  }

  if (
    getBehaviorValue(moduleKey, 'locksLineItemsWhenRecordLocked') &&
    lineItemsLocked
  ) {
    const lockedItemColumns = getBehaviorValue(
      moduleKey,
      'editableLockedItemColumns',
    )
    return (lockedItemColumns || []).includes(columnKey)
  }

  return true
}

function hasParentImportValue(
  record: ModuleRecordInput | undefined,
  parentFieldKey: string | undefined,
) {
  return Boolean(parentFieldKey && asString(record?.[parentFieldKey]).trim())
}

export function isParentImportedEditorLocked(
  moduleKey: string,
  record: ModuleRecordInput | undefined,
  parentFieldKey: string | undefined,
) {
  const effectiveParentFieldKey = parentFieldKey
  if (!hasParentImportValue(record, effectiveParentFieldKey)) {
    return false
  }

  if (
    getBehaviorValue(moduleKey, 'lockParentImportOnlyWhenPersisted') === true &&
    !record?.id
  ) {
    return false
  }

  return Boolean(
    getBehaviorValue(moduleKey, 'parentImportedEditableFields')?.length ||
      getBehaviorValue(moduleKey, 'parentImportedItemEditableColumns')?.length,
  )
}
