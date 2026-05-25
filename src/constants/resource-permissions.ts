// --- Catalog types (synced with backend CatalogEntryResponse / CatalogActionResponse) ---
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- lazy API call, no side effects on import
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { logger } from '@/utils/logger'

interface CatalogActionResponse {
  code: string
  title: string
}

interface CatalogEntryResponse {
  code: string
  title: string
  group: string
  businessResource: boolean
  menuCodes: string[]
  pathPrefixes: string[]
  actions: CatalogActionResponse[]
}

// --- Hardcoded fallback values (used before catalog loads or when catalog is unavailable) ---

const ACTION_ALIASES: Record<string, string> = {
  VIEW: 'read',
  CREATE: 'create',
  EDIT: 'update',
  DELETE: 'delete',
  AUDIT: 'audit',
  EXPORT: 'export',
  PRINT: 'print',
  view: 'read',
  create: 'create',
  edit: 'update',
  delete: 'delete',
  audit: 'audit',
  export: 'export',
  print: 'print',
}

const FALLBACK_MENU_RESOURCE_MAP: Record<string, string> = {
  'material-categories': 'material',
}

// --- Runtime catalog (loaded from backend, falls back to hardcoded maps) ---

let catalogReady = false
let catalogPromise: Promise<void> | null = null

let menuResourceMap: Record<string, string> = {
  ...FALLBACK_MENU_RESOURCE_MAP,
}
export async function loadPermissionCatalog(): Promise<void> {
  if (catalogReady) return
  if (catalogPromise) return catalogPromise

  catalogPromise = (async () => {
    try {
      const response = await http.get<{
        code: number
        data: CatalogEntryResponse[]
      }>(ENDPOINTS.PERMISSION_CATALOG)
      if (response.code !== 0 || !Array.isArray(response.data)) {
        logger.warn(
          '[resource-permissions] catalog response invalid, using fallback maps',
        )
        return
      }

      const entries = response.data
      const menuMap: Record<string, string> = {}
      const labelMap: Record<string, string> = {}
      const actionMap: Record<string, string> = {}

      for (const entry of entries) {
        labelMap[entry.code] = entry.title
        for (const menuCode of entry.menuCodes) {
          menuMap[menuCode] = entry.code
        }
        for (const action of entry.actions) {
          actionMap[action.code] = action.title
        }
      }

      // Merge with fallbacks so entries missing from backend still resolve
      menuResourceMap = { ...FALLBACK_MENU_RESOURCE_MAP, ...menuMap }

      catalogReady = true
    } catch (err) {
      catalogPromise = null
      logger.warn(
        '[resource-permissions] failed to load catalog, using fallback maps:',
        err,
      )
    }
  })()

  return catalogPromise
}

// --- Normalization & resolution ---

function normalizePermissionKey(value: string | null | undefined) {
  return String(value || '')
    .replace(/^\/+/, '')
    .trim()
}

function normalizeResource(value: string | null | undefined) {
  return normalizePermissionKey(value).toLowerCase()
}

export function normalizeAction(value: string | null | undefined) {
  const raw = normalizePermissionKey(value).toLowerCase()
  return ACTION_ALIASES[raw] || raw
}

export function resolveResourceKey(menuOrResource: string | null | undefined) {
  const normalized = normalizePermissionKey(menuOrResource).toLowerCase()
  return menuResourceMap[normalized] || normalizeResource(normalized)
}
