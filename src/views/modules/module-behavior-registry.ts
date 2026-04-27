/**
 * Centralized registry for per-module behavioral configuration.
 * Replaces scattered Record<string, X> maps across multiple adapter files.
 */
export interface ModuleBehaviorConfig {
  /** Default status value when creating a new record. */
  defaultStatus?: string
  /** Default field values for new records. */
  defaultDraftValues?: Record<string, unknown>
  /** Whether the module supports inline line-item editing. */
  supportsLineItems?: boolean
  /** Whether amount/weight fields are computed (not directly editable). */
  computesAmounts?: boolean
  /** Fields that remain editable even when the record is locked. */
  editableLockedFields?: string[]
  /** Line-item columns that remain editable when the record is locked. */
  editableLockedItemColumns?: string[]
  /** Whether the module supports parent document import. */
  supportsParentImport?: boolean
  /** Whether the module supports statement generation. */
  supportsStatements?: boolean
  /** Whether the module supports invoice synchronization. */
  supportsInvoiceSync?: boolean
  /** Whether the module supports freight pickup lists. */
  supportsFreightPickup?: boolean
  /** Whether the module supports material import. */
  supportsMaterialImport?: boolean
  /** The type of statement this module generates (for finance linking). */
  statementLinkType?: 'supplier' | 'customer' | 'freight'
}

const registry = new Map<string, ModuleBehaviorConfig>()

function register(key: string, config: ModuleBehaviorConfig) {
  registry.set(key, { ...registry.get(key), ...config })
}

// ── Line-item capable modules ──
const lineItemModules = [
  'purchase-orders', 'purchase-inbounds', 'sales-orders', 'sales-outbounds',
  'freight-bills', 'freight-statements', 'purchase-contracts', 'sales-contracts',
  'invoice-receipts', 'invoice-issues',
]
lineItemModules.forEach((key) => register(key, { supportsLineItems: true }))

// ── Amount-computing modules ──
const amountModules = [
  'purchase-orders', 'purchase-inbounds', 'sales-orders', 'sales-outbounds',
  'purchase-contracts', 'sales-contracts',
]
amountModules.forEach((key) => register(key, { computesAmounts: true }))

// ── Default statuses ──
const draftStatusModules: Record<string, string> = {
  'purchase-orders': '草稿', 'purchase-inbounds': '草稿',
  'sales-orders': '草稿', 'sales-outbounds': '草稿',
  'freight-bills': '未审核', receipts: '草稿', payments: '草稿',
  'invoice-receipts': '草稿', 'invoice-issues': '草稿',
}
Object.entries(draftStatusModules).forEach(([key, status]) => register(key, { defaultStatus: status }))

// ── Default draft values ──
register('carriers', { defaultDraftValues: { priceMode: '按吨' } })

// ── Editable locked fields ──
register('sales-orders', {
  editableLockedFields: ['deliveryDate', 'remark'],
  editableLockedItemColumns: ['unitPrice'],
})

// ── Statement support ──
register('purchase-inbounds', { supportsStatements: true, statementLinkType: 'supplier' })
register('sales-orders', { supportsStatements: true, statementLinkType: 'customer' })
register('freight-bills', { supportsStatements: true, statementLinkType: 'freight' })

// ── Invoice sync ──
register('invoice-receipts', { supportsInvoiceSync: true })
register('invoice-issues', { supportsInvoiceSync: true })

// ── Freight pickup ──
register('sales-orders', { supportsFreightPickup: true })

// ── Material import ──
register('materials', { supportsMaterialImport: true })

export function getModuleBehavior(moduleKey: string): ModuleBehaviorConfig {
  return registry.get(moduleKey) || {}
}

export function hasBehavior(moduleKey: string, flag: keyof ModuleBehaviorConfig): boolean {
  const config = registry.get(moduleKey)
  if (!config) return false
  return Boolean(config[flag])
}

export function getBehaviorValue<K extends keyof ModuleBehaviorConfig>(
  moduleKey: string,
  flag: K,
): ModuleBehaviorConfig[K] | undefined {
  return registry.get(moduleKey)?.[flag]
}
