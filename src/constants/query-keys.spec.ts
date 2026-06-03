import { describe, expect, it } from 'vitest'
import { QUERY_KEYS } from './query-keys'

describe('QUERY_KEYS', () => {
  it('has all expected keys', () => {
    const expectedKeys = [
      'generalSetting',
      'clientSettings',
      'companySetting',
      'displaySwitches',
      'numberRules',
      'dashboardSummary',
      'businessGrid',
      'businessGridAll',
      'businessGridPage',
      'businessGridList',
      'businessPageConfig',
      'databaseStatus',
      'masterOptions',
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
      'statementLinkOptions',
      'projectArSummary',
      'projectArDetail',
      'printTemplate',
      'printTemplateByType',
      'parentSelectorConfig',
      'parentSelectorList',
      'freightPickup',
    ]

    for (const key of expectedKeys) {
      expect(QUERY_KEYS).toHaveProperty(key)
    }
  })

  it('generalSetting is frozen array', () => {
    expect(QUERY_KEYS.generalSetting).toEqual(['general-setting'])
  })

  it('clientSettings is frozen array', () => {
    expect(QUERY_KEYS.clientSettings).toEqual([
      'general-setting',
      'client-settings',
    ])
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
    const key = QUERY_KEYS.statementLinkOptions('supplier')
    expect(key).toEqual(['statement-link-options', 'supplier'])
  })

  it('projectArSummary and projectArDetail return keys', () => {
    expect(QUERY_KEYS.projectArSummary('proj-1')).toEqual([
      'project-ar',
      'summary',
      'proj-1',
    ])
    expect(QUERY_KEYS.projectArDetail('proj-1', 'overview')).toEqual([
      'project-ar',
      'detail',
      'proj-1',
      'overview',
    ])
  })

  it('printTemplateByType returns key with billType', () => {
    expect(QUERY_KEYS.printTemplateByType('purchase-order')).toEqual([
      'print-template',
      'purchase-order',
    ])
  })

  it('parentSelectorConfig and parentSelectorList return keys', () => {
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
