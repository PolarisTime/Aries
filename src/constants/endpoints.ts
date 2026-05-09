/**
 * Centralized API endpoint registry.
 * Single source of truth for all REST endpoint paths.
 *
 * Module CRUD paths are in module-contracts.ts (derived from business-pages config).
 * This file covers auth, system, and other non-module endpoints.
 */
export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGIN_2FA: '/auth/login-2fa',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_PING: '/auth/ping',

  // API Keys
  API_KEYS: '/auth/api-keys',
  API_KEYS_USER_OPTIONS: '/auth/api-keys/user-options',
  API_KEYS_RESOURCE_OPTIONS: '/auth/api-keys/resource-options',
  API_KEYS_ACTION_OPTIONS: '/auth/api-keys/action-options',

  // Sessions
  REFRESH_TOKENS: '/auth/refresh-tokens',
  REFRESH_TOKENS_SUMMARY: '/auth/refresh-tokens/summary',

  // Account security
  ACCOUNT_SECURITY_STATUS: '/account/security',
  ACCOUNT_PASSWORD: '/account/security/password',
  ACCOUNT_2FA_SETUP: '/account/security/2fa/setup',
  ACCOUNT_2FA_ENABLE: '/account/security/2fa/enable',
  ACCOUNT_2FA_DISABLE: '/account/security/2fa/disable',

  // User accounts
  USER_ACCOUNTS: '/user-account',
  USER_ACCOUNTS_LOGIN_NAME_CHECK: '/user-account/login-name-availability',
  USER_ACCOUNT_PREFERENCES: '/user-account/preferences',

  // Permission catalog
  PERMISSION_CATALOG: '/permission/catalog',

  // Roles
  ROLE_SETTINGS: '/role-settings',
  ROLE_PERMISSION_OPTIONS: '/role-settings/permission-options',

  // System menus
  SYSTEM_MENUS_TREE: '/system/menus/tree',

  // Company settings
  COMPANY_SETTINGS_CURRENT: '/company-setting/current',
  COMPANY_NAME: '/company-setting/name',

  // Health
  HEALTH: '/health',

  // Dashboard
  DASHBOARD_SUMMARY: '/dashboard/summary',

  // Database
  DATABASE_STATUS: '/system/database/status',
  DATABASE_EXPORT_TASKS: '/system/database/export-tasks',
  DATABASE_IMPORT: '/system/database/import',

  // Security keys
  SECURITY_KEYS: '/system/security-key',

  // Print templates
  PRINT_TEMPLATES: '/print-template',

  // Setup
  SETUP_STATUS: '/setup/status',
  SETUP_INITIALIZE: '/setup/initialize',
  SETUP_ADMIN_2FA: '/setup/admin/2fa/setup',
  SETUP_ADMIN: '/setup/admin',
  SETUP_COMPANY: '/setup/company',

  // Attachments & general settings
  ATTACHMENTS_UPLOAD: '/attachments/upload',
  ATTACHMENTS_BINDINGS: '/attachments/bindings',
  NUMBER_RULES_NEXT: '/general-setting/number-rules/next',
  UPLOAD_RULE: '/general-setting/upload-rule',

  // Materials
  MATERIALS_IMPORT: '/material/import',
  MATERIALS_TEMPLATE: '/material/template',
  MATERIALS_EXPORT: '/material/export',
  MATERIALS_SEARCH: '/material/search',
  MATERIAL_GRADES: '/material/grades',

  // Departments (used by user-accounts)
  DEPARTMENTS_OPTIONS: '/department/options',

  // Master data option lists (dynamic, replaces hardcoded module-options.ts values)
  WAREHOUSES_OPTIONS: '/warehouse/options',
  CUSTOMERS_OPTIONS: '/customer/options',
  SUPPLIERS_OPTIONS: '/supplier/options',
  CARRIERS_OPTIONS: '/carrier/options',
  MATERIAL_CATEGORIES: '/material-categories/options',
} as const

export type EndpointKey = keyof typeof ENDPOINTS
