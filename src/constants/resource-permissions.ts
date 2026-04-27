import { http } from '@/api/http'
import { ENDPOINTS } from '@/constants/endpoints'

// --- Catalog types (synced with backend CatalogEntryResponse / CatalogActionResponse) ---

export interface CatalogActionResponse {
  code: string
  title: string
}

export interface CatalogEntryResponse {
  code: string
  title: string
  group: string
  businessResource: boolean
  menuCodes: string[]
  pathPrefixes: string[]
  actions: CatalogActionResponse[]
}

// --- Hardcoded fallback values (used before catalog loads or when catalog is unavailable) ---

export const ACTION_ALIASES: Record<string, string> = {
  VIEW: 'read', CREATE: 'create', EDIT: 'update', DELETE: 'delete',
  AUDIT: 'audit', EXPORT: 'export', PRINT: 'print',
  view: 'read', create: 'create', edit: 'update', delete: 'delete',
  audit: 'audit', export: 'export', print: 'print',
}

const FALLBACK_MENU_RESOURCE_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  materials: 'material', suppliers: 'supplier', customers: 'customer',
  carriers: 'carrier', warehouses: 'warehouse',
  'purchase-orders': 'purchase-order', 'purchase-inbounds': 'purchase-inbound',
  'sales-orders': 'sales-order', 'sales-outbounds': 'sales-outbound',
  'freight-bills': 'freight-bill', 'purchase-contracts': 'purchase-contract',
  'sales-contracts': 'sales-contract', 'inventory-report': 'inventory-report',
  'io-report': 'io-report', 'pending-invoice-receipt-report': 'pending-invoice-receipt-report',
  'supplier-statements': 'supplier-statement', 'customer-statements': 'customer-statement',
  'freight-statements': 'freight-statement', receipts: 'receipt', payments: 'payment',
  'invoice-receipts': 'invoice-receipt', 'invoice-issues': 'invoice-issue',
  'receivables-payables': 'receivable-payable', 'general-settings': 'general-setting',
  'company-settings': 'company-setting', 'operation-logs': 'operation-log',
  departments: 'department', 'user-accounts': 'user-account',
  'permission-management': 'permission', 'role-settings': 'role',
  'role-action-editor': 'role', 'database-management': 'database',
  'session-management': 'session', 'api-key-management': 'api-key',
  'security-keys': 'security-key', 'print-templates': 'print-template',
}

const FALLBACK_RESOURCE_LABEL_MAP: Record<string, string> = {
  dashboard: '工作台', material: '商品资料', supplier: '供应商资料',
  customer: '客户资料', carrier: '物流方资料', warehouse: '仓库资料',
  'purchase-order': '采购订单', 'purchase-inbound': '采购入库',
  'sales-order': '销售订单', 'sales-outbound': '销售出库',
  'freight-bill': '物流单', 'purchase-contract': '采购合同',
  'sales-contract': '销售合同', 'inventory-report': '商品库存报表',
  'io-report': '出入库报表', 'pending-invoice-receipt-report': '未收票报表',
  'supplier-statement': '供应商对账单', 'customer-statement': '客户对账单',
  'freight-statement': '物流对账单', receipt: '收款单', payment: '付款单',
  'invoice-receipt': '收票单', 'invoice-issue': '开票单',
  'receivable-payable': '应收应付', 'general-setting': '通用设置',
  'company-setting': '公司信息', 'operation-log': '操作日志',
  department: '部门', 'user-account': '用户账户', permission: '权限管理',
  role: '角色', database: '数据库管理', session: '会话管理',
  'api-key': 'API Key 管理', 'security-key': '安全密钥管理',
  'print-template': '打印模板',
}

const FALLBACK_ACTION_LABEL_MAP: Record<string, string> = {
  read: '查看', create: '新增', update: '编辑', delete: '删除',
  audit: '审核', export: '导出', print: '打印', manage_permissions: '配置权限',
}

// --- Runtime catalog (loaded from backend, falls back to hardcoded maps) ---

let catalogReady = false
let catalogPromise: Promise<void> | null = null

let menuResourceMap: Record<string, string> = { ...FALLBACK_MENU_RESOURCE_MAP }
let resourceLabelMap: Record<string, string> = { ...FALLBACK_RESOURCE_LABEL_MAP }
let actionLabelMap: Record<string, string> = { ...FALLBACK_ACTION_LABEL_MAP }

export function isCatalogReady() {
  return catalogReady
}

export async function loadPermissionCatalog(): Promise<void> {
  if (catalogReady) return
  if (catalogPromise) return catalogPromise

  catalogPromise = (async () => {
    try {
      const response = await http.get<{ code: number; data: CatalogEntryResponse[] }>(ENDPOINTS.PERMISSION_CATALOG)
      if (response.code !== 0 || !Array.isArray(response.data)) {
        console.warn('[resource-permissions] catalog response invalid, using fallback maps')
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
      resourceLabelMap = { ...FALLBACK_RESOURCE_LABEL_MAP, ...labelMap }
      actionLabelMap = { ...FALLBACK_ACTION_LABEL_MAP, ...actionMap }

      catalogReady = true
    } catch (err) {
      console.warn('[resource-permissions] failed to load catalog, using fallback maps:', err)
    }
  })()

  return catalogPromise
}

// --- Normalization & resolution ---

export function normalizePermissionKey(value: string | null | undefined) {
  return String(value || '').replace(/^\/+/, '').trim()
}

export function normalizeResource(value: string | null | undefined) {
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

export function resolveMenuResource(menuKey: string | null | undefined) {
  const normalized = normalizePermissionKey(menuKey).toLowerCase()
  return menuResourceMap[normalized] || ''
}

export function getResourcePermissionLabel(code: string) {
  const [rawResource, rawAction] = String(code || '').split(':')
  const resource = normalizeResource(rawResource)
  const action = normalizeAction(rawAction)
  const resourceLabel = resourceLabelMap[resource] || resource
  const actionLabel = actionLabelMap[action] || action
  return action ? `${resourceLabel}${actionLabel}` : resourceLabel
}
