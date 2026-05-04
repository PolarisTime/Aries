/**
 * Centralized registry for per-module behavioral configuration.
 * Replaces scattered Record<string, X> maps across multiple adapter files.
 */
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

export interface NormalizeDraftContext {
  primaryNoKey?: string
  generatePrimaryNo: () => string
  currentOperatorName: string
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}

export interface ModuleBehaviorConfig {
  /** Default status value when creating a new record. */
  defaultStatus?: string
  /** Status value applied by the editor's save-and-audit action. */
  auditStatus?: string
  /** Status value applied by save-and-audit when the record is locked. */
  lockedAuditStatus?: string
  /** Fixed toolbar action routing keyed by action label. */
  actionKindsByLabel?: Record<string, string>
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
  /** Fields that are always read-only in the editor. */
  readonlyEditorFields?: string[]
  /** Field that defaults to the current operator when creating/saving records. */
  defaultOperatorField?: string
  /** Whether line items are locked when the module-specific lock predicate is true. */
  locksLineItemsWhenRecordLocked?: boolean
  /** Module queried to determine whether line items are locked. */
  lineItemLockSourceModule?: string
  /** Source module field that contains related document numbers. */
  lineItemLockSourceField?: string
  /** Current record field matched against the source module relation field. */
  lineItemLockTargetField?: string
  /** Source statuses that lock line-item editing. */
  lineItemLockStatuses?: string[]
  /** Notice shown when line items are locked. */
  lockedLineItemsNotice?: string
  /** Whether users can manually add line items in the editor. Defaults to true. */
  allowsManualLineItems?: boolean
  /** Whether line-item cells are always rendered read-only in the editor. */
  readonlyLineItems?: boolean
  /** How empty line items are trimmed before save. */
  lineItemTrimStrategy?: 'purchaseOrderBlank' | 'positiveWeightOrAmount'
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

  // ── Phase 0 additions: replaces scattered moduleKey branches ──

  /** Callback to normalize a draft record before save (module-specific computations). */
  normalizeDraftRecord?: (record: ModuleRecord, items: ModuleLineItem[], ctx: NormalizeDraftContext) => void
  /** Callback to sync editor form state (module-specific derived fields). */
  syncEditorForm?: (editorForm: Record<string, unknown>) => void
  /** Whether the module includes line items in save payloads. */
  savePayloadLineItems?: boolean
  /** Extra scalar fields to include in save payloads beyond detailFields. */
  extraScalarFields?: string[]
  /** Whether the module includes attachmentIds in save payloads. */
  includeAttachmentIds?: boolean
  /** Links receipts/payments modules to their statement type for auto-linking. */
  supportsStatementLinking?: 'receipt' | 'payment'
  /** Whether to show the role link in RbacHelperPanel. */
  showRoleLink?: boolean
  /** Whether the module is a settings/configuration module (affects form field behavior). */
  isSettingsModule?: boolean
  /** Whether the module uses upload-rule expanded rows in the table. */
  hasUploadRuleExpandedRow?: boolean
  /** Optional link rendered in the info alert bar for this module. */
  alertActionLink?: { text: string; to: string }
}

const registry = new Map<string, ModuleBehaviorConfig>()

function register(key: string, config: ModuleBehaviorConfig) {
  registry.set(key, { ...registry.get(key), ...config })
}

// ── Utility helpers for normalizeDraftRecord callbacks ──

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

function collectUniqueSourceNos(items: ModuleLineItem[]): string {
  return Array.from(
    new Set(
      items
        .map((item) => String(item.sourceNo || '').trim())
        .filter(Boolean),
    ),
  ).join(', ')
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

// ── Audit statuses ──
const approvedStatusModules = ['purchase-orders', 'purchase-inbounds', 'sales-orders', 'sales-outbounds', 'freight-bills']
approvedStatusModules.forEach((key) => register(key, { auditStatus: '已审核' }))
register('sales-orders', { lockedAuditStatus: '完成销售' })

const protectedEditStatuses = new Set([
  '已审核',
  '已完成',
  '完成采购',
  '完成入库',
  '完成销售',
  '已付款',
  '已收款',
  '已签署',
  '已送达',
])

const protectedDeleteStatuses = new Set([
  '已审核',
  '已完成',
  '完成采购',
  '完成入库',
  '完成销售',
  '已付款',
  '已收款',
  '已签署',
  '已送达',
])

// ── Toolbar action routing ──
register('supplier-statements', { actionKindsByLabel: { 生成对账单: 'openSupplierStatementGenerator' } })
register('customer-statements', { actionKindsByLabel: { 生成对账单: 'openCustomerStatementGenerator' } })
register('freight-statements', {
  actionKindsByLabel: {
    生成物流对账单: 'openFreightStatementGenerator',
    查看运费对账汇总: 'openFreightSummary',
  },
})
register('freight-bills', {
  actionKindsByLabel: {
    生成提货清单: 'openFreightPickupList',
    标记送达: 'markSelectedFreightDelivered',
  },
})
register('role-settings', { actionKindsByLabel: { 配置权限: 'navigateToRoleActionEditor' } })

// ── Default draft values ──
register('carriers', { defaultDraftValues: { priceMode: '按吨' } })

// ── Editable locked fields ──
register('sales-orders', {
  editableLockedFields: ['deliveryDate', 'remark'],
  editableLockedItemColumns: ['unitPrice'],
  locksLineItemsWhenRecordLocked: true,
  lineItemLockSourceModule: 'sales-outbounds',
  lineItemLockSourceField: 'salesOrderNo',
  lineItemLockTargetField: 'orderNo',
  lineItemLockStatuses: ['已审核'],
  lockedLineItemsNotice: '当前销售订单已存在已审核的销售出库，数量和商品信息已锁定，仅允许调整单价、金额、送货日期和备注。',
})

// ── Readonly editor fields ──
register('role-settings', { readonlyEditorFields: ['userCount'] })

// ── Current-operator defaults ──
register('purchase-orders', { defaultOperatorField: 'buyerName' })
register('sales-orders', { defaultOperatorField: 'salesName' })
const operatorNameModules = ['receipts', 'payments', 'invoice-receipts', 'invoice-issues']
operatorNameModules.forEach((key) => register(key, { defaultOperatorField: 'operatorName' }))

// ── Line-item editor behavior ──
register('purchase-orders', { lineItemTrimStrategy: 'purchaseOrderBlank' })
const positiveLineItemModules = ['invoice-receipts', 'invoice-issues']
positiveLineItemModules.forEach((key) => register(key, { lineItemTrimStrategy: 'positiveWeightOrAmount' }))
register('invoice-issues', { allowsManualLineItems: false })
register('freight-bills', { allowsManualLineItems: false, readonlyLineItems: true })

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

// ── Phase 0: normalizeDraftRecord callbacks (replaces 8 moduleKey branches) ──

register('freight-bills', {
  normalizeDraftRecord(record, items, ctx) {
    const firstSourceItem = items.find((item) => String(item.sourceNo || '').trim())
    const firstCustomerItem = items.find((item) => String(item.customerName || '').trim())
    const firstProjectItem = items.find((item) => String(item.projectName || '').trim())
    if (!record.outboundNo && firstSourceItem) {
      record.outboundNo = firstSourceItem.sourceNo
    }
    if (!record.customerName && firstCustomerItem) {
      record.customerName = firstCustomerItem.customerName
    }
    if (!record.projectName && firstProjectItem) {
      record.projectName = firstProjectItem.projectName
    }
    record.totalWeight = Number(ctx.sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalFreight = Number((Number(record.unitPrice || 0) * Number(record.totalWeight || 0)).toFixed(2))
    if (!record.deliveryStatus) {
      record.deliveryStatus = '未送达'
    }
  },
})

register('freight-statements', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.totalWeight = Number(ctx.sumLineItemsBy(items, 'weightTon').toFixed(3))
    }
    record.unpaidAmount = Number((Number(record.totalFreight || 0) - Number(record.paidAmount || 0)).toFixed(2))
    if (Array.isArray(record.attachments)) {
      record.attachment = record.attachments
        .map((item) => String((item as Record<string, unknown>).name || ''))
        .filter(Boolean)
        .join(', ')
    }
  },
})

register('supplier-statements', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.purchaseAmount = Number(ctx.sumLineItemsBy(items, 'amount').toFixed(2))
      record.sourceInboundNos = collectUniqueSourceNos(items)
    }
    record.paymentAmount = Number(record.paymentAmount || 0)
    record.closingAmount = Number(Number(record.purchaseAmount || 0).toFixed(2))
  },
})

register('customer-statements', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.salesAmount = Number(ctx.sumLineItemsBy(items, 'amount').toFixed(2))
      record.sourceOrderNos = collectUniqueSourceNos(items)
    }
    record.receiptAmount = Number(record.receiptAmount || 0)
    record.closingAmount = Number(Number(record.salesAmount || 0).toFixed(2))
  },
})

register('invoice-receipts', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.amount = Number(ctx.sumLineItemsBy(items, 'amount').toFixed(2))
      record.sourcePurchaseOrderNos = collectUniqueSourceNos(items)
    }
  },
})

register('invoice-issues', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.amount = Number(ctx.sumLineItemsBy(items, 'amount').toFixed(2))
      record.sourceSalesOrderNos = collectUniqueSourceNos(items)
    }
  },
})

register('role-settings', {
  normalizeDraftRecord(record) {
    const permissionCodes = normalizeStringArray(record.permissionCodes)
    record.permissionCodes = permissionCodes
    record.permissionCount = permissionCodes.length
    record.permissionSummary = permissionCodes.length ? `共 ${permissionCodes.length} 项权限` : ''
  },
  syncEditorForm(editorForm) {
    const permissionCodes = normalizeStringArray(editorForm.permissionCodes)
    editorForm.permissionCodes = permissionCodes
    editorForm.permissionCount = permissionCodes.length
    editorForm.permissionSummary = permissionCodes.length ? `共 ${permissionCodes.length} 项权限` : ''
  },
  showRoleLink: true,
})

register('user-accounts', {
  normalizeDraftRecord(record) {
    const roleNames = normalizeStringArray(record.roleNames)
    record.roleNames = roleNames
    record.permissionSummary = roleNames.join('、')
  },
  syncEditorForm(editorForm) {
    const roleNames = normalizeStringArray(editorForm.roleNames)
    editorForm.roleNames = roleNames
    editorForm.permissionSummary = roleNames.join('、')
  },
})

// ── Phase 0: save payload behaviors ──
const lineItemPayloadModules = [
  'purchase-orders', 'purchase-inbounds', 'sales-orders', 'sales-outbounds',
  'freight-bills', 'purchase-contracts', 'sales-contracts',
  'supplier-statements', 'customer-statements', 'freight-statements',
  'invoice-receipts', 'invoice-issues',
]
lineItemPayloadModules.forEach((key) => register(key, { savePayloadLineItems: true }))

const extraScalarFieldsMap: Record<string, string[]> = {
  'freight-statements': ['attachment'],
  'purchase-orders': ['buyerName'],
  'purchase-inbounds': ['buyerName'],
  'sales-orders': ['salesName'],
  'sales-outbounds': ['salesName'],
  'purchase-contracts': ['buyerName'],
  'sales-contracts': ['salesName'],
}
Object.entries(extraScalarFieldsMap).forEach(([key, fields]) => register(key, { extraScalarFields: fields }))

register('freight-statements', { includeAttachmentIds: true })

// ── Phase 0: finance statement linking ──
register('receipts', { supportsStatementLinking: 'receipt' })
register('payments', { supportsStatementLinking: 'payment' })

// ── Phase 0: UI behavior flags ──
register('departments', { isSettingsModule: true })
register('general-settings', { isSettingsModule: true, hasUploadRuleExpandedRow: true })
register('role-settings', { isSettingsModule: true })
register('permission-management', {
  alertActionLink: { text: '前往角色权限配置 →', to: '/role-action-editor' },
})

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

export function isEditBlockedByStatus(status: unknown): boolean {
  return protectedEditStatuses.has(String(status ?? '').trim())
}

export function isDeleteBlockedByStatus(status: unknown): boolean {
  return protectedDeleteStatuses.has(String(status ?? '').trim())
}
