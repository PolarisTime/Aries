/**
 * Centralized API endpoint registry.
 * Single source of truth for all REST endpoint paths.
 *
 * Convention:
 *   - Business entity resources → plural (e.g. /api-keys, /refresh-tokens, /role-settings)
 *   - Pure action endpoints → singular (e.g. /login, /refresh, /export, /import)
 *   - URL all lowercase, multi-word separated by hyphens
 *   - Strict RESTful style, no verb paths (/get, /list, /add, /update, /del)
 *
 * Module CRUD paths are in module-contracts.ts (derived from business-pages config).
 * This file covers auth, system, and other non-module endpoints.
 */
export const ENDPOINTS = {
  // Auth (pure actions → singular)
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGIN_2FA: '/auth/login-2fa',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_PING: '/auth/ping',
  AUTH_CAPTCHA: '/auth/captcha',

  // API Keys (business entity → plural)
  API_KEYS: '/auth/api-keys',
  API_KEYS_USER_OPTIONS: '/auth/api-keys/user-options',
  API_KEYS_RESOURCE_OPTIONS: '/auth/api-keys/resource-options',
  API_KEYS_ACTION_OPTIONS: '/auth/api-keys/action-options',

  // Sessions / Refresh Tokens (business entity → plural)
  REFRESH_TOKENS: '/auth/refresh-tokens',
  REFRESH_TOKENS_SUMMARY: '/auth/refresh-tokens/summary',

  // Account security (pure actions → singular)
  ACCOUNT_SECURITY_STATUS: '/account/security',
  ACCOUNT_PASSWORD: '/account/security/password',
  ACCOUNT_2FA_SETUP: '/account/security/2fa/setup',
  ACCOUNT_2FA_ENABLE: '/account/security/2fa/enable',
  ACCOUNT_2FA_DISABLE: '/account/security/2fa/disable',

  // User accounts (business entity → plural)
  USER_ACCOUNTS: '/user-accounts',
  USER_ACCOUNTS_LOGIN_NAME_CHECK: '/user-accounts/login-name-availability',
  USER_ACCOUNT_PREFERENCES: '/user-accounts/preference',

  // Permissions (business entity → plural)
  PERMISSION_CATALOG: '/permissions/catalog',

  // Roles (business entity → plural)
  ROLE_SETTINGS: '/role-settings',
  ROLE_PERMISSION_OPTIONS: '/role-settings/permission-options',

  // System menus (sub-resource tree → singular action)
  SYSTEM_MENUS_TREE: '/system/menu/tree',

  // Company settings (business entity → plural)
  COMPANY_SETTINGS: '/company-settings',
  COMPANY_SETTINGS_CURRENT: '/company-settings/current',
  COMPANY_SETTINGS_OPTIONS: '/company-settings/options',
  COMPANY_NAME: '/company-settings/name',

  // Health (pure action → singular)
  HEALTH: '/health',
  VERSION: '/version',

  // Dashboard (pure action → singular)
  DASHBOARD_SUMMARY: '/dashboard/summary',

  // Global search (aggregate query → singular)
  GLOBAL_SEARCH: '/global-search',

  // Database (business entity → plural)
  DATABASE_STATUS: '/system/databases/status',
  DATABASE_MONITORING: '/system/databases/monitoring',

  // Security keys (business entity → plural)
  SECURITY_KEYS: '/system/security-keys',
  OSS_SETTINGS: '/system/oss-settings',

  // Print templates (business entity → plural)
  PRINT_TEMPLATES: '/print-templates',

  // Setup (pure actions → singular)
  SETUP_STATUS: '/setup/status',
  SETUP_INITIALIZE: '/setup/initialize',
  SETUP_ADMIN_2FA: '/setup/admin/2fa/setup',
  SETUP_ADMIN: '/setup/admin',
  SETUP_COMPANY: '/setup/company',

  // Attachments (business entity → plural) & General settings (business entity → plural)
  ATTACHMENTS_UPLOAD: '/attachments/upload',
  ATTACHMENTS_BINDINGS: '/attachments/bindings',
  NUMBER_RULES_NEXT: '/general-settings/number-rule/next',
  STATEMENT_GENERATOR_RULE: '/general-settings/statement-generator-rule',
  UPLOAD_RULE: '/general-settings/upload-rule',

  // Materials (pure actions → singular)
  MATERIALS_IMPORT: '/materials/import',
  MATERIALS_TEMPLATE: '/materials/template',
  MATERIALS_EXPORT: '/materials/export',
  MATERIALS_SEARCH: '/materials/search',
  MATERIAL_GRADES: '/materials/grades',

  // Import candidate collections
  PURCHASE_ORDER_IMPORT_CANDIDATES: '/purchase-orders/import-candidates',
  PURCHASE_ORDER_PREPAYMENT_CANDIDATES:
    '/purchase-orders/prepayment-candidates',
  FREIGHT_BILL_IMPORT_CANDIDATES: '/freight-bills/import-candidates',
  SALES_ORDER_OUTBOUND_IMPORT_CANDIDATES:
    '/sales-orders/outbound-import-candidates',
  PURCHASE_REFUND_SOURCE_CANDIDATES: '/purchase-refunds/source-candidates',
  PURCHASE_REFUND_PREVIEW: '/purchase-refunds/preview',
  INVOICE_ISSUE_SOURCE_CANDIDATES: '/invoice-issues/source-candidates',
  INVOICE_RECEIPT_SOURCE_CANDIDATES: '/invoice-receipts/source-candidates',

  // Departments (sub-resource option lists → plural collection)
  DEPARTMENTS_OPTIONS: '/departments/options',

  // Master data option lists (business entities → plural)
  WAREHOUSES_OPTIONS: '/warehouses/options',
  CUSTOMERS_OPTIONS: '/customers/options',
  PROJECTS_OPTIONS: '/projects/options',
  SUPPLIERS_OPTIONS: '/suppliers/options',
  CARRIERS_OPTIONS: '/carriers/options',
  MATERIAL_CATEGORIES: '/material-categories/options',
} as const
