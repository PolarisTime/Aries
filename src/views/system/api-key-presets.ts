import type { TFunction } from 'i18next'
import type { ApiKeyActionOption, ApiKeyResourceOption } from '@/api/api-keys'

export type ApiKeyPresetKey =
  | 'mcpReadonly'
  | 'businessRead'
  | 'businessWrite'
  | 'financeReconcile'
  | 'systemAudit'
  | 'custom'

export interface ApiKeyPreset {
  key: ApiKeyPresetKey
  label: string
  description: string
  usageScope: string
  resourceCodes: string[]
  actionCodes: string[]
}

type ApiKeyPresetDefinition = {
  key: Exclude<ApiKeyPresetKey, 'custom'>
  labelKey: string
  descriptionKey: string
  usageScope: string
  resourceCodes: string[]
  actionCodes: string[]
}

const BUSINESS_RESOURCE_CODES = [
  'material',
  'supplier',
  'customer',
  'project',
  'carrier',
  'warehouse',
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'inventory-report',
  'io-report',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'cash-ledger',
]

const API_KEY_PRESET_DEFINITIONS: ApiKeyPresetDefinition[] = [
  {
    key: 'mcpReadonly',
    labelKey: 'system.apiKeyPresets.mcpReadonly',
    descriptionKey: 'system.apiKeyPresets.mcpReadonlyDesc',
    usageScope: '只读接口',
    resourceCodes: BUSINESS_RESOURCE_CODES,
    actionCodes: ['read'],
  },
  {
    key: 'businessRead',
    labelKey: 'system.apiKeyPresets.businessRead',
    descriptionKey: 'system.apiKeyPresets.businessReadDesc',
    usageScope: '业务接口',
    resourceCodes: BUSINESS_RESOURCE_CODES,
    actionCodes: ['read'],
  },
  {
    key: 'businessWrite',
    labelKey: 'system.apiKeyPresets.businessWrite',
    descriptionKey: 'system.apiKeyPresets.businessWriteDesc',
    usageScope: '业务接口',
    resourceCodes: [
      'purchase-order',
      'purchase-inbound',
      'sales-order',
      'sales-outbound',
      'freight-bill',
    ],
    actionCodes: ['read', 'create', 'update', 'audit', 'delete'],
  },
  {
    key: 'financeReconcile',
    labelKey: 'system.apiKeyPresets.financeReconcile',
    descriptionKey: 'system.apiKeyPresets.financeReconcileDesc',
    usageScope: '业务接口',
    resourceCodes: [
      'customer-statement',
      'freight-statement',
      'receipt',
      'payment',
    ],
    actionCodes: ['read', 'create', 'update', 'audit', 'export', 'print'],
  },
  {
    key: 'systemAudit',
    labelKey: 'system.apiKeyPresets.systemAudit',
    descriptionKey: 'system.apiKeyPresets.systemAuditDesc',
    usageScope: '全部接口',
    resourceCodes: ['operation-log', 'session', 'api-key'],
    actionCodes: ['read'],
  },
]

export function buildApiKeyPresets(
  t: TFunction,
  resourceOptions: ApiKeyResourceOption[],
  actionOptions: ApiKeyActionOption[],
): ApiKeyPreset[] {
  const actionCodeSet = new Set(actionOptions.map((item) => item.code))
  return API_KEY_PRESET_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: t(definition.labelKey),
    description: t(definition.descriptionKey),
    usageScope: definition.usageScope,
    resourceCodes: resolvePresetResourceCodes(definition, resourceOptions),
    actionCodes: definition.actionCodes.filter((code) =>
      actionCodeSet.has(code),
    ),
  })).filter(
    (preset) =>
      preset.resourceCodes.length > 0 && preset.actionCodes.length > 0,
  )
}

function resolvePresetResourceCodes(
  definition: ApiKeyPresetDefinition,
  resourceOptions: ApiKeyResourceOption[],
) {
  const resourceCodeSet = new Set(definition.resourceCodes)
  return resourceOptions
    .filter((item) => resourceCodeSet.has(item.code))
    .map((item) => item.code)
}

export function groupApiKeyResources(resourceOptions: ApiKeyResourceOption[]) {
  const groups = new Map<string, ApiKeyResourceOption[]>()
  for (const resource of resourceOptions) {
    const group = resource.group || ''
    groups.set(group, [...(groups.get(group) || []), resource])
  }
  return Array.from(groups, ([group, resources]) => ({ group, resources }))
}
