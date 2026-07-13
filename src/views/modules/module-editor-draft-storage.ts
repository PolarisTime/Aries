import dayjs, { type Dayjs } from 'dayjs'
import type { LoginUser } from '@/shared/schemas'
import { normalizeEntityIds, parseEntityId } from '@/types/entity-id'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

const STORAGE_PREFIX = 'aries-module-editor-draft:'
const DRAFT_VERSION = 2
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000
const MAX_DRAFT_STRING_LENGTH = 64 * 1024
const MAX_DRAFT_STORAGE_BYTES = 512 * 1024
const DRAFT_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS'
const SENSITIVE_DRAFT_KEY_PATTERN =
  /(password|token|secret|credential|attachmentContent|fileContent|base64|dataUrl)/i
const TEMPORARY_LINE_ITEM_ID_PATTERN = /^line-.+$/

export interface ModuleEditorDraftSnapshot {
  version: 2
  userKey: string
  moduleKey: string
  recordId: string
  values: ModuleRecord
  items: ModuleLineItem[]
  authoritativePrimaryNo: string
  updatedAt: number
}

interface BuildModuleEditorDraftSnapshotArgs {
  userKey: string
  moduleKey: string
  recordId: string
  values: ModuleRecord
  items: ModuleLineItem[]
  authoritativePrimaryNo: string
  now?: number
}

function getStorageKey(userKey: string, moduleKey: string, recordId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(userKey)}:${encodeURIComponent(moduleKey)}:${encodeURIComponent(recordId)}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function serializeLegacyDayjsValue(value: Dayjs): string | undefined {
  if (
    typeof value.isValid === 'function' &&
    typeof value.format === 'function'
  ) {
    return value.isValid() ? value.format(DRAFT_DATE_FORMAT) : undefined
  }

  const parts = value as unknown as Record<string, unknown>
  const dateParts = [
    parts.$y,
    parts.$M,
    parts.$D,
    parts.$H ?? 0,
    parts.$m ?? 0,
    parts.$s ?? 0,
    parts.$ms ?? 0,
  ].map(Number)
  if (!dateParts.every(Number.isInteger)) {
    return undefined
  }

  const [year, month, date, hour, minute, second, millisecond] = dateParts
  const restored = new Date(
    year,
    month,
    date,
    hour,
    minute,
    second,
    millisecond,
  )
  if (
    restored.getFullYear() !== year ||
    restored.getMonth() !== month ||
    restored.getDate() !== date ||
    restored.getHours() !== hour ||
    restored.getMinutes() !== minute ||
    restored.getSeconds() !== second ||
    restored.getMilliseconds() !== millisecond
  ) {
    return undefined
  }
  return dayjs(restored).format(DRAFT_DATE_FORMAT)
}

function sanitizeDraftValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_DRAFT_KEY_PATTERN.test(key)) {
    return undefined
  }
  if (typeof value === 'string') {
    return value.length <= MAX_DRAFT_STRING_LENGTH ? value : undefined
  }
  if (dayjs.isDayjs(value)) {
    return serializeLegacyDayjsValue(value)
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeDraftValue(item))
      .filter((item) => item !== undefined)
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).flatMap(([nestedKey, nestedValue]) => {
        const sanitized = sanitizeDraftValue(nestedValue, nestedKey)
        return sanitized === undefined ? [] : [[nestedKey, sanitized]]
      }),
    )
  }
  return value
}

function sanitizeDraftRecord(record: ModuleRecord): ModuleRecord {
  return sanitizeDraftValue(record) as ModuleRecord
}

function normalizeDraftRecordValues(values: ModuleRecord): ModuleRecord {
  const { id, ...rest } = values
  const normalized = normalizeEntityIds({ values: rest }).values
  return {
    ...normalized,
    id:
      !Object.hasOwn(values, 'id') || id === ''
        ? ''
        : parseEntityId(id, 'values.id'),
  }
}

function normalizeDraftLineItems(items: ModuleLineItem[]): ModuleLineItem[] {
  const itemIds = items.map((item) => item.id)
  const itemsWithoutIds = items.map(({ id: _id, ...item }) => item)
  const normalizedItems = normalizeEntityIds({ items: itemsWithoutIds }).items

  return normalizedItems.map((item, index) => {
    const id = itemIds[index]
    return {
      ...item,
      id:
        typeof id === 'string' && TEMPORARY_LINE_ITEM_ID_PATTERN.test(id)
          ? id
          : parseEntityId(id, `items[${index}].id`),
    }
  })
}

function parseDraftSnapshot(value: unknown): ModuleEditorDraftSnapshot | null {
  if (!isPlainObject(value)) {
    return null
  }
  if (value.version !== DRAFT_VERSION) {
    return null
  }
  if (
    typeof value.userKey !== 'string' ||
    typeof value.moduleKey !== 'string' ||
    typeof value.recordId !== 'string' ||
    typeof value.updatedAt !== 'number' ||
    !isPlainObject(value.values) ||
    !Array.isArray(value.items) ||
    !value.items.every(isPlainObject)
  ) {
    return null
  }

  const sanitizedValues = sanitizeDraftRecord(value.values as ModuleRecord)
  const sanitizedItems = (value.items as ModuleLineItem[]).map(
    (item) => sanitizeDraftRecord(item) as ModuleLineItem,
  )

  return {
    version: DRAFT_VERSION,
    userKey: value.userKey,
    moduleKey: value.moduleKey,
    recordId: value.recordId,
    values: normalizeDraftRecordValues(sanitizedValues),
    items: normalizeDraftLineItems(sanitizedItems),
    authoritativePrimaryNo:
      typeof value.authoritativePrimaryNo === 'string'
        ? value.authoritativePrimaryNo
        : '',
    updatedAt: value.updatedAt,
  }
}

export function resolveModuleEditorDraftUserKey(user: LoginUser | null) {
  if (!user) {
    return null
  }
  const stableKey = user.id || user.loginName
  return stableKey ? String(stableKey) : null
}

export function getModuleEditorDraftRecordId(record: ModuleRecord | null) {
  return String(record?.id || 'new')
}

export function buildModuleEditorDraftSnapshot({
  userKey,
  moduleKey,
  recordId,
  values,
  items,
  authoritativePrimaryNo,
  now = Date.now(),
}: BuildModuleEditorDraftSnapshotArgs): ModuleEditorDraftSnapshot {
  return {
    version: DRAFT_VERSION,
    userKey,
    moduleKey,
    recordId,
    values: sanitizeDraftRecord(normalizeDraftRecordValues(values)),
    items: normalizeDraftLineItems(items).map(
      (item) => sanitizeDraftRecord(item) as ModuleLineItem,
    ),
    authoritativePrimaryNo,
    updatedAt: now,
  }
}

export function writeModuleEditorDraft(snapshot: ModuleEditorDraftSnapshot) {
  if (typeof window === 'undefined') {
    return
  }
  const serializedSnapshot = JSON.stringify(snapshot)
  if (
    new TextEncoder().encode(serializedSnapshot).byteLength >
    MAX_DRAFT_STORAGE_BYTES
  ) {
    throw new Error('Editor draft exceeds storage limit')
  }
  localStorage.setItem(
    getStorageKey(snapshot.userKey, snapshot.moduleKey, snapshot.recordId),
    serializedSnapshot,
  )
}

export function readModuleEditorDraft(
  userKey: string,
  moduleKey: string,
  recordId: string,
  now = Date.now(),
) {
  if (typeof window === 'undefined') {
    return null
  }

  const key = getStorageKey(userKey, moduleKey, recordId)
  const raw = localStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    const snapshot = parseDraftSnapshot(JSON.parse(raw))
    if (!snapshot || now - snapshot.updatedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return snapshot
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function removeModuleEditorDraft(
  userKey: string,
  moduleKey: string,
  recordId: string,
) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(getStorageKey(userKey, moduleKey, recordId))
}
