/**
 * Centralized API endpoint registry.
 * Single source of truth for all REST endpoint paths.
 *
 * Convention:
 *   - Business entity resources → plural (e.g. /role-settings)
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
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',

  // Account security (pure actions → singular)
  ACCOUNT_PASSWORD: '/account/security/password',

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

  // Cash ledger (aggregate read model)
  CASH_LEDGER: '/cash-ledger',
  CASH_LEDGER_EXPORT: '/cash-ledger/export',

  // Global search (aggregate query → singular)
  GLOBAL_SEARCH: '/global-search',

  OSS_SETTINGS: '/system/oss-settings',

  // Print templates (business entity → plural)
  PRINT_TEMPLATES: '/print-templates',

  // Setup (pure actions → singular)
  SETUP_STATUS: '/setup/status',
  SETUP_INITIALIZE: '/setup/initialize',
  SETUP_ADMIN: '/setup/admin',
  SETUP_COMPANY: '/setup/company',

  // Attachments (business entity → plural) & General settings (business entity → plural)
  ATTACHMENTS_UPLOAD: '/attachments/upload',
  ATTACHMENTS_BINDINGS: '/attachments/bindings',
  STATEMENT_GENERATOR_RULE: '/general-settings/statement-generator-rule',

  // Materials (pure actions → singular)
  MATERIALS_IMPORT: '/materials/import',
  MATERIALS_TEMPLATE: '/materials/template',
  MATERIALS_EXPORT: '/materials/export',
  MATERIALS_SEARCH: '/materials/search',
  MATERIAL_GRADES: '/materials/grades',

  // Import candidate collections
  PURCHASE_ORDER_IMPORT_CANDIDATES: '/purchase-orders/import-candidates',
  PURCHASE_INBOUND_IMPORT_BATCHES: '/purchase-inbound-import-batches',
  PURCHASE_ORDER_PREPAYMENT_CANDIDATES:
    '/purchase-orders/prepayment-candidates',
  SALES_ORDER_PURCHASE_SOURCE_CANDIDATES: '/sales-orders/source-candidates',
  SALES_ORDER_OUTBOUND_IMPORT_CANDIDATES:
    '/sales-orders/outbound-import-candidates',
  FREIGHT_BILL_SALES_ORDER_CANDIDATES: '/freight-bills/sales-order-candidates',
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
