import dayjs from 'dayjs'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecordInput,
} from '@/types/module-page'
import { parseDateTimeValue } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 明细行上的**前端 session 标记**。
 *
 * <p>`_parentRelationId` / `_parentRelationNo` 只允许「上游导入」流程写入，
 * 服务端契约不返回它们。它们参与 `buildParentImportState` 的上限口径判断
 * （带标记 = 本会话草稿、服务端 remaining 未扣减），一旦从服务端回传就会被
 * 误判成「已保存行」，重复导入同一父单时上限重新翻倍。</p>
 *
 * <p>因此记录进入编辑器前统一剔除；其它 `_maxImport*` 这类派生字段不动。</p>
 */
const EDITOR_SESSION_ITEM_MARKERS = [
  '_parentRelationId',
  '_parentRelationNo',
] as const

/** 剔除明细行上的前端 session 标记（不改入参对象）。 */
function stripEditorSessionItemMarkers(item: ModuleLineItem): ModuleLineItem {
  let next: ModuleLineItem | null = null
  for (const marker of EDITOR_SESSION_ITEM_MARKERS) {
    if (!Object.hasOwn(item, marker)) {
      continue
    }
    next ??= { ...item }
    delete next[marker]
  }
  return next ?? item
}

function normalizeSelectLikeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSelectLikeValue(item))
  }
  if (isRecordLike(value) && 'value' in value) {
    return asString(value.value)
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return asString(value)
  }
  return value
}

function normalizeLabeledValueObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeLabeledValueObject(item))
  }
  if (isRecordLike(value) && 'value' in value) {
    return asString(value.value)
  }
  return value
}

function hydrateFinanceStatementSource(
  moduleKey: string,
  record: ModuleRecordInput,
): void {
  const firstItem = Array.isArray(record.items) ? record.items[0] : undefined
  if (!firstItem) {
    return
  }

  const statementLinkingType = getBehaviorValue(
    moduleKey,
    'supportsStatementLinking',
  )

  if (statementLinkingType === 'receipt' && !record.sourceCustomerStatementId) {
    record.sourceCustomerStatementId =
      firstItem.sourceCustomerStatementId ?? firstItem.sourceStatementId
    return
  }

  if (statementLinkingType !== 'payment') {
    return
  }

  if (!record.sourceFreightStatementId && firstItem.sourceFreightStatementId) {
    record.sourceFreightStatementId = firstItem.sourceFreightStatementId
  }

  if (!record.sourceFreightStatementId && firstItem.sourceStatementId) {
    record.sourceFreightStatementId = firstItem.sourceStatementId
  }
}

export function normalizeRecordForEditor(
  config: ModulePageConfig,
  record: ModuleRecordInput,
): ModuleRecordInput {
  let normalized: ModuleRecordInput = { ...record }
  /*
   * 记录入口先清掉 items 上的前端 session 标记：它们只属于导入流程，
   * 服务端契约不返回；若某天回传，上限口径会把草稿行误判成已保存行。
   */
  if (Array.isArray(normalized.items)) {
    normalized.items = normalized.items.map(stripEditorSessionItemMarkers)
  }
  const normalizeEditorRecord = getBehaviorValue(
    config.key,
    'normalizeEditorRecord',
  )
  if (normalizeEditorRecord) {
    normalized = normalizeEditorRecord(normalized)
  }

  hydrateFinanceStatementSource(config.key, normalized)
  for (const [key, value] of Object.entries(normalized)) {
    normalized[key] = normalizeLabeledValueObject(value)
  }

  for (const field of config.formFields || []) {
    if (
      field.type === 'select' ||
      field.type === 'multiSelect' ||
      field.type === 'autoComplete'
    ) {
      normalized[field.key] = normalizeSelectLikeValue(normalized[field.key])
      continue
    }

    if (field.type !== 'date') {
      continue
    }
    const rawValue = normalized[field.key]
    if (rawValue == null || rawValue === '' || dayjs.isDayjs(rawValue)) {
      continue
    }
    normalized[field.key] = parseDateTimeValue(rawValue) ?? undefined
  }

  return normalized
}

export function normalizeLineItemsForEditor(
  items: ModuleLineItem[],
): ModuleLineItem[] {
  return items.map((item) => ({
    ...stripEditorSessionItemMarkers(item),
    materialCode: normalizeLabeledValueObject(item.materialCode),
    settlementMode: normalizeSelectLikeValue(item.settlementMode),
    warehouseName: normalizeSelectLikeValue(item.warehouseName),
    settlementCompanyId: normalizeSelectLikeValue(item.settlementCompanyId),
  }))
}

function hasExplicitTimePart(value: unknown): boolean {
  if (dayjs.isDayjs(value) || value instanceof Date) {
    return true
  }
  if (typeof value === 'number') {
    return String(Math.trunc(value)).length !== 8
  }
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  return /\d{1,2}:\d{2}/.test(normalized) || /^\d{14}$/.test(normalized)
}

function parseValidDateTime(value: unknown) {
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null
  }
  return parseDateTimeValue(value)
}

export function mergeDateOnlyFieldTimesForSave(
  config: ModulePageConfig,
  values: ModuleRecordInput,
  sourceRecord: object | null,
): ModuleRecordInput {
  if (!config.formFields?.length) {
    return values
  }

  const fallbackTime = dayjs()
  const next: ModuleRecordInput = { ...values }
  for (const field of config.formFields) {
    if (field.type !== 'date' || field.showTime === true) {
      continue
    }

    const value = next[field.key]
    if (!dayjs.isDayjs(value) || !value.isValid()) {
      continue
    }

    const sourceValue = readModuleRecordField(sourceRecord, field.key)
    const sourceTime = hasExplicitTimePart(sourceValue)
      ? parseValidDateTime(sourceValue)
      : null
    const timeSource = sourceTime || fallbackTime
    next[field.key] = value
      .hour(timeSource.hour())
      .minute(timeSource.minute())
      .second(timeSource.second())
  }
  return next
}
