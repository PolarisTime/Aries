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
  ACCOUNT_PREFERENCES: '/account/preferences',

  // Company settings (business entity → plural)
  COMPANY_SETTINGS: '/company-settings',
  COMPANY_SETTINGS_CURRENT: '/company-settings/current',
  COMPANY_SETTINGS_OPTIONS: '/company-settings/options',

  // Health (pure action → singular)
  HEALTH: '/health',
  VERSION: '/version',

  // Dashboard (pure action → singular)
  DASHBOARD_SUMMARY: '/dashboard/summary',

  // Cash ledger (aggregate read model)
  CASH_LEDGER: '/cash-ledger',
  CASH_LEDGER_EXPORT: '/cash-ledger/export',
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
  PRINT_PREVIEWS_ITEMS: '/print-previews/items',
  PRINT_TEMPLATES: '/print-templates',
  PRINT_TEMPLATE: (id: string | number) =>
    `/print-templates/${pathSegment(id)}`,
  PRINT_TEMPLATE_CONTENT: (id: string | number) =>
    `/print-templates/${pathSegment(id)}/content`,

  // Setup (pure actions → singular)
  SETUP_ACCOUNT: '/setup/account',

  // Attachments
  ATTACHMENTS_UPLOAD: '/attachments/upload',
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
  MATERIAL_EXPORTS: '/material-exports',
  MATERIALS_TEMPLATE: '/materials/template',
  MATERIAL_GRADES: '/materials/grades',
  MATERIAL_BRANDS: '/materials/brands',
  MATERIAL_HISTORIES: (id: string | number) =>
    `/materials/${pathSegment(id)}/histories`,

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
  PURCHASE_ORDER_PICKUP_LIST_PREVIEW: '/purchase-orders/pickup-list-preview',

  // Sales orders
  SALES_ORDER_PURCHASE_SOURCE_CANDIDATES: '/sales-orders/source-candidates',
  SALES_ORDER_OUTBOUND_IMPORT_CANDIDATES:
    '/sales-orders/outbound-import-candidates',
  SALES_ORDER_DELIVERY_VERIFICATIONS: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/delivery-verifications`,
  SALES_ORDER_COMPLETIONS: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/completions`,
  SALES_ORDER_PRINT_XLSX: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/xlsx-exports`,
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
  PROJECT_PRICE_RULES: (id: string | number) =>
    `/projects/${pathSegment(id)}/price-rules`,
  SUPPLIERS_OPTIONS: '/suppliers/options',
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
  QUOTE_SHEET: (id: string | number) => `/quote-sheets/${pathSegment(id)}`,
  QUOTE_SHEET_ITEMS: (id: string | number) =>
    `/quote-sheets/${pathSegment(id)}/items`,
  QUOTE_SHEET_ITEM: (id: string | number, itemId: string | number) =>
    `/quote-sheets/${pathSegment(id)}/items/${pathSegment(itemId)}`,
  QUOTE_SHEET_EDIT_LOCK: (id: string | number) =>
    `/quote-sheets/${pathSegment(id)}/edit-locks`,
  QUOTE_PROJECT_CONFIGS: '/quote-project-configs',
  QUOTE_PROJECT_CONFIG: (projectId: string | number) =>
    `/quote-project-configs/${pathSegment(projectId)}`,
} as const
