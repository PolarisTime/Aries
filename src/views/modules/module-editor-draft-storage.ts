import type { LoginUser } from '@/shared/schemas'
import type {
  ModuleChargeItem,
  ModuleLineItem,
  ModuleRecord,
} from '@/types/module-page'

const STORAGE_PREFIX = 'aries-module-editor-draft:'
const DRAFT_VERSION = 1
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface ModuleEditorDraftSnapshot {
  version: 1
  userKey: string
  moduleKey: string
  recordId: string
  values: ModuleRecord
  items: ModuleLineItem[]
  chargeItems: ModuleChargeItem[]
  authoritativePrimaryNo: string
  updatedAt: number
}

interface BuildModuleEditorDraftSnapshotArgs {
  userKey: string
  moduleKey: string
  recordId: string
  values: ModuleRecord
  items: ModuleLineItem[]
  chargeItems?: ModuleChargeItem[]
  authoritativePrimaryNo: string
  now?: number
}

function getStorageKey(userKey: string, moduleKey: string, recordId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(userKey)}:${encodeURIComponent(moduleKey)}:${encodeURIComponent(recordId)}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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
    !Array.isArray(value.items)
  ) {
    return null
  }

  return {
    version: DRAFT_VERSION,
    userKey: value.userKey,
    moduleKey: value.moduleKey,
    recordId: value.recordId,
    values: value.values as ModuleRecord,
    items: value.items as ModuleLineItem[],
    chargeItems: Array.isArray(value.chargeItems)
      ? (value.chargeItems as ModuleChargeItem[])
      : [],
    authoritativePrimaryNo:
      typeof value.authoritativePrimaryNo === 'string'
        ? value.authoritativePrimaryNo
        : '',
    updatedAt: value.updatedAt,
  }
}

export function resolveModuleEditorDraftUserKey(user: LoginUser | null) {
  if (!user) {
    return 'anonymous'
  }
  return String(user.id || user.loginName || 'anonymous')
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
  chargeItems = [],
  authoritativePrimaryNo,
  now = Date.now(),
}: BuildModuleEditorDraftSnapshotArgs): ModuleEditorDraftSnapshot {
  return {
    version: DRAFT_VERSION,
    userKey,
    moduleKey,
    recordId,
    values: { ...values },
    items: items.map((item) => ({ ...item })),
    chargeItems: chargeItems.map((item) => ({ ...item })),
    authoritativePrimaryNo,
    updatedAt: now,
  }
}

export function writeModuleEditorDraft(snapshot: ModuleEditorDraftSnapshot) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(
    getStorageKey(snapshot.userKey, snapshot.moduleKey, snapshot.recordId),
    JSON.stringify(snapshot),
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
