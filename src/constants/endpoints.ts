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

  // Global search (aggregate query → singular)
  GLOBAL_SEARCH: '/global-search',

  // Print
  PRINT_OUTPUTS: '/print-outputs',
  PRINT_ITEMS: '/print/items',
  PRINT_TEMPLATES: '/print-templates',
  PRINT_TEMPLATE: (id: string | number) =>
    `/print-templates/${pathSegment(id)}`,
  PRINT_TEMPLATE_CONTENT: (id: string | number) =>
    `/print-templates/${pathSegment(id)}/content`,

  // Setup (pure actions → singular)
  SETUP_ACCOUNT: '/setup/account',

  // Attachments
  ATTACHMENTS_UPLOAD: '/attachments/upload',
  ATTACHMENTS_DIRECT_UPLOAD_PREPARE: '/attachments/direct-upload/prepare',
  ATTACHMENTS_DIRECT_UPLOAD_COMPLETE: '/attachments/direct-upload/complete',
  ATTACHMENTS_BINDINGS: '/attachments/bindings',
  ATTACHMENTS_BINDING_COUNTS: '/attachments/bindings/counts',
  ATTACHMENT_ACCESS_URL: (id: string | number) =>
    `/attachments/${pathSegment(id)}/access-url`,
  ATTACHMENT_CONTENT: (id: string | number, action: 'preview' | 'download') =>
    `/attachments/${pathSegment(id)}/${action}`,

  // Materials (pure actions → singular)
  MATERIALS_IMPORT: '/materials/import',
  MATERIALS_TEMPLATE: '/materials/template',
  MATERIALS_EXPORT: '/materials/export',
  MATERIALS_SEARCH: '/materials/search',
  MATERIAL_GRADES: '/materials/grades',

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
  SALES_ORDER_COMPLETE: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/complete`,
  SALES_ORDER_SAVE_AND_COMPLETE: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/save-and-complete`,
  SALES_ORDER_PRINT_XLSX: (id: string | number) =>
    `/sales-orders/${pathSegment(id)}/xlsx-exports`,

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
  SUPPLIERS_OPTIONS: '/suppliers/options',
  CARRIERS_OPTIONS: '/carriers/options',
  MATERIALS: '/materials',
  MATERIAL_CATEGORIES: '/material-categories/options',
} as const
