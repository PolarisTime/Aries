/**
 * Centralized API endpoint registry.
 * Single source of truth for all REST endpoint paths.
 *
 * Convention:
 *   - Business entity resources → plural
 *   - Pure action endpoints → singular (e.g. /login, /refresh, /export, /import)
 *   - URL all lowercase, multi-word separated by hyphens
 *   - Strict RESTful style, no verb paths (/get, /list, /add, /update, /del)
 *
 * Module CRUD paths are in module-contracts.ts (derived from business-pages config).
 * This file covers auth, system, and other non-module endpoints.
 */
const pathSegment = (value: string | number) =>
  encodeURIComponent(String(value))

export const ENDPOINTS = {
  // Auth (pure actions → singular)
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',

  // Current account (the single authenticated account)
  ACCOUNT: '/account',
  ACCOUNT_PASSWORD: '/account/password',
  /** 账户设置（v2：sections 分片 + pages 列设置，见 docs/client-state-sync.md §4.2）。 */
  ACCOUNT_SETTINGS: '/account/settings',

  // Company settings (business entity → plural)
  COMPANY_SETTINGS: '/company-settings',
  COMPANY_SETTINGS_CURRENT: '/company-settings/current',
  COMPANY_SETTINGS_OPTIONS: '/company-settings/options',

  // Value aliases (值映射/别名维护: 同义归一)
  VALUE_ALIASES: '/value-aliases',
  VALUE_ALIAS: (id: string | number) => `/value-aliases/${pathSegment(id)}`,

  // Quote regions (取价地区维护: 西本行情抓取的城市清单与子域名)
  QUOTE_REGIONS: '/quote-regions',
  QUOTE_REGION: (id: string | number) => `/quote-regions/${pathSegment(id)}`,

  // Length premiums (定尺加价维护: 定尺每吨加价, 允许为负表示优惠)
  LENGTH_PREMIUMS: '/length-premiums',
  LENGTH_PREMIUM: (id: string | number) =>
    `/length-premiums/${pathSegment(id)}`,

  // Health (pure action → singular)
  HEALTH: '/health',
  VERSION: '/version',

  // Dashboard (pure action → singular)
  DASHBOARD_SUMMARY: '/dashboard/summary',

  // Cash ledger (aggregate read model)
  CASH_LEDGER: '/cash-ledger',
  /** 资金流水汇总（与列表相同筛选条件，独立于分页）。 */
  CASH_LEDGER_SUMMARY: '/cash-ledger/summary',
  /**
   * 资金流水导出请求资源：POST 创建导出产物（201 + ExportArtifactResponse），
   * 再用 `CASH_LEDGER_EXPORT_REQUEST_CONTENT(id)` 下载 XLSX。产物保留 30 分钟，过期/重启后返回 404。
   */
  CASH_LEDGER_EXPORT_REQUESTS: '/cash-ledger-export-requests',
  CASH_LEDGER_EXPORT_REQUEST_CONTENT: (id: string | number) =>
    `/cash-ledger-export-requests/${pathSegment(id)}/content`,
  FINANCE_OVERVIEW: '/finance/overview',

  // Inventory (aggregate read models)
  INVENTORY_BALANCES: '/inventory/balances',
  INVENTORY_TRANSACTIONS: '/inventory/transactions',

  // Global search (aggregate query → singular)
  GLOBAL_SEARCH: '/global-search',

  // Document flow (cross-module trace by business no; documentNo is a query filter)
  DOCUMENT_FLOW: '/document-flows',

  // Print
  PRINT_EXPORTS: '/print-exports',
  /** PDF 表单模板的二进制表示端点（与 print-exports 拆分，避免同一 URL 两种 Content-Type）。 */
  PRINT_EXPORT_FILES: '/print-export-files',
  PRINT_PREVIEWS_ITEMS: '/print-previews/items',
  PRINT_TEMPLATES: '/print-templates',
  PRINT_TEMPLATE: (id: string | number) =>
    `/print-templates/${pathSegment(id)}`,
  PRINT_TEMPLATE_CONTENT: (id: string | number) =>
    `/print-templates/${pathSegment(id)}/content`,
  PRINT_TEMPLATE_PREFERENCES: '/print-template-preferences',

  // Setup (pure actions → singular)
  SETUP_ACCOUNT: '/setup/account',

  // Attachments
  /** 附件资源集合：POST multipart(moduleKey,file,sourceType?) 创建附件，201 + Location(/attachments/{id})。 */
  ATTACHMENTS: '/attachments',
  /**
   * 附件恢复清单导出请求资源：POST（无请求体）创建 gzip 产物，返回 201 + ExportArtifactResponse，
   * 再用 `ATTACHMENT_MANIFEST_EXPORT_REQUEST_CONTENT(id)` 下载。
   */
  ATTACHMENT_MANIFEST_EXPORT_REQUESTS: '/attachment-manifest-export-requests',
  ATTACHMENT_MANIFEST_EXPORT_REQUEST_CONTENT: (id: string | number) =>
    `/attachment-manifest-export-requests/${pathSegment(id)}/content`,
  ATTACHMENT_UPLOAD_SESSIONS: '/attachment-upload-sessions',
  ATTACHMENT_UPLOAD_SESSION_COMPLETIONS: (sessionId: string | number) =>
    `/attachment-upload-sessions/${pathSegment(sessionId)}/completions`,
  ATTACHMENTS_BINDINGS: '/attachments/bindings',
  ATTACHMENTS_BINDING_COUNTS: '/attachments/bindings/counts',
  ATTACHMENT_ACCESS_URL: (id: string | number) =>
    `/attachments/${pathSegment(id)}/access-url`,
  ATTACHMENT_CONTENT: (id: string | number) =>
    `/attachments/${pathSegment(id)}/content`,

  // Materials (pure actions → singular)
  MATERIAL_IMPORTS: '/material-imports',
  MATERIAL_IMPORT_PREVIEWS: '/material-imports/previews',
  /** 商品资料导出请求资源：POST {keyword,format} 创建产物（201），再 GET `.../{id}/content`（xlsx/csv）。 */
  MATERIAL_EXPORT_REQUESTS: '/material-export-requests',
  MATERIAL_EXPORT_REQUEST_CONTENT: (id: string | number) =>
    `/material-export-requests/${pathSegment(id)}/content`,
  MATERIALS_TEMPLATE: '/materials/template',
  MATERIAL_GRADES: '/materials/grades',
  MATERIAL_BRANDS: '/materials/brands',
  MATERIAL_HISTORIES: (id: string | number) =>
    `/materials/${pathSegment(id)}/histories`,

  // Business document exports (export is modelled as a request/artifact resource:
  // POST /module-export-requests {moduleKey,recordIds?} → 201 → GET .../{id}/content)
  /** 业务单据导出请求资源：POST 创建 XLSX 产物（201），再 GET `.../{id}/content` 下载。 */
  MODULE_EXPORT_REQUESTS: '/module-export-requests',
  MODULE_EXPORT_REQUEST_CONTENT: (id: string | number) =>
    `/module-export-requests/${pathSegment(id)}/content`,

  // Import batches (rollback is a rollbacks sub-resource)
  IMPORT_BATCH_ROLLBACKS: (importBatchNo: string) =>
    `/import-batches/${pathSegment(importBatchNo)}/rollbacks`,

  // Master data code issuances
  MASTER_DATA_CODE_ISSUANCES: '/master-data/code-issuances',

  // Purchase orders
  PURCHASE_ORDER_INBOUND_IMPORT_CANDIDATES:
    '/purchase-orders/inbound-import-candidates',
  PURCHASE_ORDER_WAREHOUSE_RECOMMENDATIONS:
    '/purchase-orders/warehouse-recommendations',
  PURCHASE_ORDER_PICKUP_LIST_PREVIEWS: '/purchase-orders/pickup-list-previews',
  /** 强制结单子资源：POST 结单（剩余未入库件数作废），DELETE 撤销结单。 */
  PURCHASE_ORDER_FORCE_CLOSURES: (id: string | number) =>
    `/purchase-orders/${pathSegment(id)}/force-closures`,
  /** 采购订单明细行「已开完」手动标记: PUT 设置(200) / DELETE 取消(204)。 */
  PURCHASE_ORDER_ITEM_ISSUED_DONE: (itemId: string | number) =>
    `/purchase-order-items/${pathSegment(itemId)}/issued-done`,

  // Sales orders
  SALES_ORDER_PURCHASE_SOURCE_CANDIDATES: '/sales-orders/source-candidates',
  SALES_ORDER_OUTBOUND_IMPORT_CANDIDATES:
    '/sales-orders/outbound-import-candidates',
  SALES_ORDER_DELIVERY_VERIFICATIONS: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/delivery-verifications`,
  SALES_ORDER_COMPLETIONS: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/completions`,
  /** 套打导出请求资源（从属于销售订单）：POST 创建 XLSX 产物（201），再 GET 内容端点。 */
  SALES_ORDER_XLSX_EXPORT_REQUESTS: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/xlsx-export-requests`,
  SALES_ORDER_XLSX_EXPORT_REQUEST_CONTENT: (
    id: string | number,
    exportId: string | number,
  ) =>
    `/sales-orders/${pathSegment(id)}/xlsx-export-requests/${pathSegment(exportId)}/content`,
  SALES_ORDER_DOCUMENT_FLOW: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/document-flow`,

  // Sales contracts (sales order amount/tonnage limit basis)
  SALES_CONTRACTS: '/sales-contracts',
  SALES_CONTRACT: (id: string | number) =>
    `/sales-contracts/${pathSegment(id)}`,
  SALES_CONTRACT_STATUS: (id: string | number) =>
    `/sales-contracts/${pathSegment(id)}/status`,
  SALES_ORDER_CONTRACT_CHECKS: '/sales-orders/contract-checks',

  // Sales returns (reverse outbound documents)
  SALES_RETURNS: '/sales-returns',
  SALES_RETURN_CANDIDATES: '/sales-returns/candidates',
  SALES_RETURN: (id: string | number) => `/sales-returns/${pathSegment(id)}`,
  SALES_RETURN_AUDITS: (id: string | number) =>
    `/sales-returns/${pathSegment(id)}/audits`,
  SALES_RETURN_STATUS: (id: string | number) =>
    `/sales-returns/${pathSegment(id)}/status`,

  // Freight bills
  FREIGHT_BILL_SALES_ORDER_CANDIDATES: '/freight-bills/sales-order-candidates',

  // Statements
  CUSTOMER_STATEMENTS_SUMMARY: '/customer-statements/summary',
  FREIGHT_STATEMENTS_SUMMARY: '/freight-statements/summary',

  // Runtime configuration
  RUNTIME_CONFIG: '/runtime-config',

  // Master data option lists (business entities → plural)
  WAREHOUSES_OPTIONS: '/warehouses/options',
  CUSTOMERS_OPTIONS: '/customers/options',
  PROJECTS: '/projects',
  PROJECTS_OPTIONS: '/projects/options',
  PROJECT: (id: string | number) => `/projects/${pathSegment(id)}`,
  PROJECT_PRICE_RULES: (id: string | number) =>
    `/projects/${pathSegment(id)}/price-rules`,
  PROJECT_PRICING_QUOTE_RESOLUTIONS: (id: string | number) =>
    `/projects/${pathSegment(id)}/pricing-quote-resolutions`,
  /** 项目销售汇总（只读聚合：订单/送货/对账/合同额度），query 支持 excludeOrderId、pending*。 */
  PROJECT_SALES_SUMMARY: (projectId: string | number) =>
    `/projects/${pathSegment(projectId)}/sales-summary`,
  SUPPLIERS_OPTIONS: '/suppliers/options',
  /** 供应商品牌规格配置：每个经营品牌允许报价的「类别 + 材质 + 规格 + 定尺」（PUT 整集替换）。 */
  SUPPLIER_BRAND_SPECS: (supplierId: string | number) =>
    `/suppliers/${pathSegment(supplierId)}/brand-specs`,
  CARRIERS_OPTIONS: '/carriers/options',
  MATERIALS: '/materials',
  MATERIAL_CATEGORIES: '/material-categories/options',

  // User accounts (multi-user management)
  USERS: '/users',
  USER: (id: string | number) => `/users/${pathSegment(id)}`,
  USER_STATUS: (id: string | number) => `/users/${pathSegment(id)}/status`,
  USER_PASSWORD_RESETS: (id: string | number) =>
    `/users/${pathSegment(id)}/password-resets`,

  // Roles & permissions (RBAC0)
  ROLES: '/roles',
  ROLE: (id: string | number) => `/roles/${pathSegment(id)}`,
  ROLE_STATUS: (id: string | number) => `/roles/${pathSegment(id)}/status`,
  ROLE_PERMISSIONS: (id: string | number) =>
    `/roles/${pathSegment(id)}/permissions`,
  PERMISSIONS: '/permissions',
  USER_ROLES: (id: string | number) => `/users/${pathSegment(id)}/roles`,

  // Market (steel quotes)
  STEEL_QUOTES: '/steel-quotes',
  MATERIAL_PRICE_MATCHES: '/material-price-matches',
  STEEL_QUOTE_SYNCS: '/steel-quote-syncs',
  STEEL_QUOTE_BACKFILLS: '/steel-quote-backfills',
  STEEL_QUOTE_CALENDARS: '/steel-quote-calendars',

  // Quote sheets (报单比价)
  QUOTE_SHEETS: '/quote-sheets',
  SUPPLIER_PRICE_LISTS: '/supplier-price-lists',
  SUPPLIER_BASE_PRICE_RULES: '/supplier-base-price-rules',
  OPERATION_LOGS: '/operation-logs',
  OPERATION_LOGS_SUMMARY: '/operation-logs/summary',
  QUOTE_SHEET: (id: string | number) => `/quote-sheets/${pathSegment(id)}`,
  QUOTE_SHEET_ITEMS: (id: string | number) =>
    `/quote-sheets/${pathSegment(id)}/items`,
  QUOTE_SHEET_ITEM: (id: string | number, itemId: string | number) =>
    `/quote-sheets/${pathSegment(id)}/items/${pathSegment(itemId)}`,
  QUOTE_SHEET_ITEM_ORDER: (id: string | number) =>
    `/quote-sheets/${pathSegment(id)}/item-order`,
  QUOTE_SHEET_EDIT_LOCK: (id: string | number) =>
    `/quote-sheets/${pathSegment(id)}/edit-locks`,
  QUOTE_PROJECT_CONFIGS: '/quote-project-configs',
  QUOTE_PROJECT_CONFIG: (projectId: string | number) =>
    `/quote-project-configs/${pathSegment(projectId)}`,
  /** 该项目用于报单比价的有效品牌集合: 项目资料优先, 资料未限制品牌时回退到比价配置。 */
  QUOTE_PROJECT_EFFECTIVE_BRANDS: (projectId: string | number) =>
    `/quote-project-configs/${pathSegment(projectId)}/effective-brands`,
  /** 切换项目资料中的 HRB400E 代取开关（报单比价工具栏快捷入口）。 */
  QUOTE_PROJECT_HRB400E_FALLBACK: (projectId: string | number) =>
    `/quote-project-configs/${pathSegment(projectId)}/hrb400e-fallback`,
} as const
