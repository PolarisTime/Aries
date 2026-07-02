import { describe, expect, it } from 'vitest'
import { ENDPOINTS } from './endpoints'

describe('ENDPOINTS', () => {
  it('has all required auth endpoints', () => {
    expect(ENDPOINTS.AUTH_LOGIN).toBe('/auth/login')
    expect(ENDPOINTS.AUTH_REFRESH).toBe('/auth/refresh')
    expect(ENDPOINTS.AUTH_LOGOUT).toBe('/auth/logout')
    expect(ENDPOINTS.AUTH_PING).toBe('/auth/ping')
    expect(ENDPOINTS.AUTH_CAPTCHA).toBe('/auth/captcha')
    expect(ENDPOINTS.AUTH_LOGIN_2FA).toBe('/auth/login-2fa')
  })

  it('has all required API key endpoints', () => {
    expect(ENDPOINTS.API_KEYS).toBe('/auth/api-keys')
    expect(ENDPOINTS.API_KEYS_USER_OPTIONS).toBe('/auth/api-keys/user-option')
    expect(ENDPOINTS.API_KEYS_RESOURCE_OPTIONS).toBe(
      '/auth/api-keys/resource-option',
    )
    expect(ENDPOINTS.API_KEYS_ACTION_OPTIONS).toBe(
      '/auth/api-keys/action-option',
    )
  })

  it('has all required master data endpoints', () => {
    expect(ENDPOINTS.WAREHOUSES_OPTIONS).toBe('/warehouses/option')
    expect(ENDPOINTS.CUSTOMERS_OPTIONS).toBe('/customers/option')
    expect(ENDPOINTS.SUPPLIERS_OPTIONS).toBe('/suppliers/option')
    expect(ENDPOINTS.CARRIERS_OPTIONS).toBe('/carriers/option')
    expect(ENDPOINTS.MATERIAL_CATEGORIES).toBe('/material-categories/option')
  })

  it('has all required material endpoints', () => {
    expect(ENDPOINTS.MATERIALS_IMPORT).toBe('/materials/import')
    expect(ENDPOINTS.MATERIALS_TEMPLATE).toBe('/materials/template')
    expect(ENDPOINTS.MATERIALS_EXPORT).toBe('/materials/export')
    expect(ENDPOINTS.MATERIALS_SEARCH).toBe('/materials/search')
    expect(ENDPOINTS.MATERIAL_GRADES).toBe('/materials/grade')
  })

  it('has system-related endpoints', () => {
    expect(ENDPOINTS.DATABASE_STATUS).toBe('/system/databases/status')
    expect(ENDPOINTS.DATABASE_MONITORING).toBe('/system/databases/monitoring')
    expect(ENDPOINTS.SECURITY_KEYS).toBe('/system/security-keys')
    expect(ENDPOINTS.OSS_SETTINGS).toBe('/system/oss-settings')
  })

  it('has all setup endpoints', () => {
    expect(ENDPOINTS.SETUP_STATUS).toBe('/setup/status')
    expect(ENDPOINTS.SETUP_INITIALIZE).toBe('/setup/initialize')
    expect(ENDPOINTS.SETUP_ADMIN).toBe('/setup/admin')
    expect(ENDPOINTS.SETUP_COMPANY).toBe('/setup/company')
  })

  it('has all required user account endpoints', () => {
    expect(ENDPOINTS.USER_ACCOUNTS).toBe('/user-accounts')
    expect(ENDPOINTS.USER_ACCOUNT_PREFERENCES).toBe('/user-accounts/preference')
  })

  it('has all required settings endpoints', () => {
    expect(ENDPOINTS.COMPANY_SETTINGS).toBe('/company-settings')
    expect(ENDPOINTS.COMPANY_SETTINGS_OPTIONS).toBe('/company-settings/options')
    expect(ENDPOINTS.COMPANY_NAME).toBe('/company-settings/name')
    expect(ENDPOINTS.GENERAL_SETTING_CLIENT_SETTINGS).toBe(
      '/general-settings/client-setting',
    )
    expect(ENDPOINTS.STATEMENT_GENERATOR_RULE).toBe(
      '/general-settings/statement-generator-rule',
    )
    expect(ENDPOINTS.UPLOAD_RULE).toBe('/general-settings/upload-rule')
  })

  it('has permission and role endpoints', () => {
    expect(ENDPOINTS.PERMISSION_CATALOG).toBe('/permissions/catalog')
    expect(ENDPOINTS.ROLE_SETTINGS).toBe('/role-settings')
    expect(ENDPOINTS.ROLE_PERMISSION_OPTIONS).toBe(
      '/role-settings/permission-option',
    )
  })

  it('has all expected keys', () => {
    const expectedKeys = [
      'AUTH_LOGIN',
      'AUTH_LOGIN_2FA',
      'AUTH_REFRESH',
      'AUTH_LOGOUT',
      'AUTH_PING',
      'AUTH_CAPTCHA',
      'API_KEYS',
      'API_KEYS_USER_OPTIONS',
      'API_KEYS_RESOURCE_OPTIONS',
      'API_KEYS_ACTION_OPTIONS',
      'REFRESH_TOKENS',
      'REFRESH_TOKENS_SUMMARY',
      'ACCOUNT_SECURITY_STATUS',
      'ACCOUNT_PASSWORD',
      'ACCOUNT_2FA_SETUP',
      'ACCOUNT_2FA_ENABLE',
      'ACCOUNT_2FA_DISABLE',
      'USER_ACCOUNTS',
      'USER_ACCOUNTS_LOGIN_NAME_CHECK',
      'USER_ACCOUNT_PREFERENCES',
      'PERMISSION_CATALOG',
      'ROLE_SETTINGS',
      'ROLE_PERMISSION_OPTIONS',
      'SYSTEM_MENUS_TREE',
      'COMPANY_SETTINGS',
      'COMPANY_SETTINGS_CURRENT',
      'COMPANY_SETTINGS_OPTIONS',
      'COMPANY_NAME',
      'HEALTH',
      'DASHBOARD_SUMMARY',
      'GLOBAL_SEARCH',
      'DATABASE_STATUS',
      'DATABASE_MONITORING',
      'SECURITY_KEYS',
      'OSS_SETTINGS',
      'PRINT_TEMPLATES',
      'SETUP_STATUS',
      'SETUP_INITIALIZE',
      'SETUP_ADMIN_2FA',
      'SETUP_ADMIN',
      'SETUP_COMPANY',
      'ATTACHMENTS_UPLOAD',
      'ATTACHMENTS_BINDINGS',
      'NUMBER_RULES_NEXT',
      'GENERAL_SETTING_CLIENT_SETTINGS',
      'STATEMENT_GENERATOR_RULE',
      'UPLOAD_RULE',
      'MATERIALS_IMPORT',
      'MATERIALS_TEMPLATE',
      'MATERIALS_EXPORT',
      'MATERIALS_SEARCH',
      'MATERIAL_GRADES',
      'DEPARTMENTS_OPTIONS',
      'WAREHOUSES_OPTIONS',
      'CUSTOMERS_OPTIONS',
      'SUPPLIERS_OPTIONS',
      'CARRIERS_OPTIONS',
      'MATERIAL_CATEGORIES',
    ]

    for (const key of expectedKeys) {
      expect(ENDPOINTS).toHaveProperty(key)
    }
  })
})
