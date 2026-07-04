import { describe, expect, it } from 'vitest'
import { QUERY_KEYS } from './query-keys'

describe('QUERY_KEYS', () => {
  it('has all expected keys', () => {
    const expectedKeys = [
      'generalSetting',
      'runtimeConfig',
      'companySetting',
      'numberRules',
      'dashboardSummary',
      'dashboardBackendHealth',
      'businessGrid',
      'businessGridAll',
      'businessGridPage',
      'businessGridList',
      'businessPageConfig',
      'businessGridOverlayPreload',
      'databaseStatus',
      'databaseMonitoring',
      'masterOptions',
      'companySettings',
      'roleTemplates',
      'rateLimitRules',
      'apiKeys',
      'apiKeyList',
      'apiKeyActionOptions',
      'apiKeyResourceOptions',
      'apiKeyUserOptions',
      'userAccount',
      'userAccountBase',
      'roleOptions',
      'roleSettings',
      'rolePermissionOptions',
      'departmentOptions',
      'refreshTokens',
      'refreshTokensBase',
      'refreshTokensSummary',
      'statementLinkOptionsBase',
      'statementLinkOptions',
      'printTemplate',
      'printTemplateByType',
      'printableTemplatesBase',
      'printableTemplates',
      'printRecordBrands',
      'printRecordItems',
      'parentSelectorListBase',
      'parentSelectorConfig',
      'parentSelectorList',
      'freightPickup',
    ]

    expect([...Object.keys(QUERY_KEYS)].sort()).toEqual(
      [...expectedKeys].sort(),
    )
  })

  it('generalSetting is frozen array', () => {
    expect(QUERY_KEYS.generalSetting).toEqual(['general-setting'])
  })

  it('runtimeConfig is frozen array', () => {
    expect(QUERY_KEYS.runtimeConfig).toEqual(['runtime-config'])
  })

  it('businessGrid returns dynamic query key', () => {
    const key = QUERY_KEYS.businessGrid('purchase-order')
    expect(key).toEqual(['business-grid', 'purchase-order'])
  })

  it('businessGridAll returns dynamic query key', () => {
    const key = QUERY_KEYS.businessGridAll('sales-order')
    expect(key).toEqual(['business-grid-all', 'sales-order'])
  })

  it('businessGridPage returns frozen page key', () => {
    const key = QUERY_KEYS.businessGridPage('material')
    expect(key).toEqual(['business-grid', 'material', {}, 1, 20, '', ''])
  })

  it('businessGridList returns query key with filters and pagination', () => {
    const key = QUERY_KEYS.businessGridList(
      'carrier',
      { status: '正常' },
      2,
      50,
    )
    expect(key).toEqual(['business-grid', 'carrier', { status: '正常' }, 2, 50])
  })

  it('businessPageConfig returns dynamic key', () => {
    const key = QUERY_KEYS.businessPageConfig('supplier')
    expect(key).toEqual(['business-page-config', 'supplier'])
  })

  it('businessGridOverlayPreload returns dynamic key', () => {
    expect(QUERY_KEYS.businessGridOverlayPreload('editor')).toEqual([
      'business-grid-overlay-preload',
      'editor',
    ])
  })

  it('masterOptions has all entity keys', () => {
    expect(QUERY_KEYS.masterOptions.carrier).toEqual([
      'master-options',
      'carrier',
    ])
    expect(QUERY_KEYS.masterOptions.customer).toEqual([
      'master-options',
      'customer',
    ])
    expect(QUERY_KEYS.masterOptions.material).toEqual([
      'master-options',
      'material',
    ])
    expect(QUERY_KEYS.masterOptions.materialCategories).toEqual([
      'master-options',
      'material-categories',
    ])
    expect(QUERY_KEYS.masterOptions.settlementCompany).toEqual([
      'master-options',
      'settlement-company',
    ])
    expect(QUERY_KEYS.masterOptions.supplier).toEqual([
      'master-options',
      'supplier',
    ])
    expect(QUERY_KEYS.masterOptions.warehouse).toEqual([
      'master-options',
      'warehouse',
    ])
  })

  it('apiKeyList returns key with all params', () => {
    const key = QUERY_KEYS.apiKeyList(1, 20, 'test', 'user1', 'active', 'read')
    expect(key).toEqual(['api-keys', 1, 20, 'test', 'user1', 'active', 'read'])
  })

  it('userAccount returns key with params', () => {
    const key = QUERY_KEYS.userAccount(1, 20, 'keyword', '正常')
    expect(key).toEqual(['user-account', 1, 20, 'keyword', '正常'])
  })

  it('userAccount returns key without statusFilter', () => {
    const key = QUERY_KEYS.userAccount(1, 20, 'keyword', undefined)
    expect(key).toEqual(['user-account', 1, 20, 'keyword', undefined])
  })

  it('refreshTokens returns key with params', () => {
    const key = QUERY_KEYS.refreshTokens(2, 10, 'admin')
    expect(key).toEqual(['refresh-tokens', 2, 10, 'admin'])
  })

  it('statementLinkOptions returns key with type', () => {
    expect(QUERY_KEYS.statementLinkOptionsBase).toEqual([
      'statement-link-options',
    ])
    const key = QUERY_KEYS.statementLinkOptions('supplier')
    expect(key).toEqual(['statement-link-options', 'supplier'])
  })

  it('printTemplateByType returns key with billType', () => {
    expect(QUERY_KEYS.printTemplateByType('purchase-order')).toEqual([
      'print-template',
      'purchase-order',
    ])
  })

  it('printableTemplates returns key with moduleKey', () => {
    expect(QUERY_KEYS.printableTemplatesBase).toEqual(['print-templates'])
    expect(QUERY_KEYS.printableTemplates('purchase-order')).toEqual([
      'print-templates',
      'purchase-order',
    ])
  })

  it('printRecordBrands returns key with module and joined ids', () => {
    expect(QUERY_KEYS.printRecordBrands('sales-order', ['2', '1'])).toEqual([
      'print-record-brands',
      'sales-order',
      '2,1',
    ])
  })

  it('printRecordItems returns key with module and joined ids', () => {
    expect(QUERY_KEYS.printRecordItems('sales-order', ['2', '1'])).toEqual([
      'print-record-items',
      'sales-order',
      '2,1',
    ])
  })

  it('parentSelectorConfig and parentSelectorList return keys', () => {
    expect(QUERY_KEYS.parentSelectorListBase).toEqual(['parent-selector-list'])
    expect(QUERY_KEYS.parentSelectorConfig('purchase-order')).toEqual([
      'parent-selector-config',
      'purchase-order',
    ])
    const listKey = QUERY_KEYS.parentSelectorList(
      'purchase-order',
      { status: '正常' },
      1,
      10,
    )
    expect(listKey).toEqual([
      'parent-selector-list',
      'purchase-order',
      { status: '正常' },
      1,
      10,
    ])
  })

  it('freightPickup returns key', () => {
    expect(QUERY_KEYS.freightPickup('freight-bill')).toEqual([
      'freight-pickup',
      'freight-bill',
    ])
  })
})
