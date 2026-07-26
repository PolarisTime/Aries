import dayjs from 'dayjs'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import { readModuleRecordField } from '@/module-system/module-record-fields'
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

  if (moduleKey === 'receipt' && !record.sourceCustomerStatementId) {
    record.sourceCustomerStatementId =
      firstItem.sourceCustomerStatementId ?? firstItem.sourceStatementId
    return
  }

  if (moduleKey !== 'payment') {
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
    ...item,
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
