// React Query key factories — centralized constants to avoid hardcoded strings
// Usage: useQuery({ queryKey: QUERY_KEYS.generalSetting })  etc.

export const QUERY_KEYS = {
  // Settings
  generalSetting: ['general-setting'] as const,
  clientSettings: ['general-setting', 'client-settings'] as const,
  companySetting: ['company-setting'] as const,
  displaySwitches: ['display-switches'] as const,
  numberRules: ['number-rules'] as const,

  // Dashboard
  dashboardSummary: ['dashboard-summary'] as const,

  // Business grid
  businessGrid: (moduleKey: string) => ['business-grid', moduleKey] as const,
  businessGridAll: (moduleKey: string) =>
    ['business-grid-all', moduleKey] as const,
  businessGridPage: (moduleKey: string) =>
    ['business-grid', moduleKey, {}, 1, 20, '', ''] as const,
  businessGridList: (
    moduleKey: string,
    filters: Record<string, unknown>,
    page: number,
    pageSize: number,
  ) =>
    [
      'business-grid',
      moduleKey,
      filters,
      page,
      pageSize,
    ] as const,
  businessPageConfig: (moduleKey: string) =>
    ['business-page-config', moduleKey] as const,

  // Database
  databaseStatus: ['database-status'] as const,

  // Master data
  masterOptions: {
    carrier: ['master-options', 'carrier'] as const,
    customer: ['master-options', 'customer'] as const,
    material: ['master-options', 'material'] as const,
    materialCategories: ['master-options', 'material-categories'] as const,
    supplier: ['master-options', 'supplier'] as const,
    warehouse: ['master-options', 'warehouse'] as const,
  },

  // Auth / Users
  apiKeys: ['api-keys'] as const,
  apiKeyList: (
    page: number,
    size: number,
    keyword: string,
    userId: string | undefined,
    status: string | undefined,
    scope: string | undefined,
  ) => ['api-keys', page, size, keyword, userId, status, scope] as const,
  apiKeyActionOptions: ['api-key-action-options'] as const,
  apiKeyResourceOptions: ['api-key-resource-options'] as const,
  apiKeyUserOptions: ['api-key-user-options'] as const,
  userAccount: (
    page: number,
    size: number,
    keyword: string,
    statusFilter: string | undefined,
  ) => ['user-account', page, size, keyword, statusFilter] as const,
  userAccountBase: ['user-account'] as const,
  roleOptions: ['role-options'] as const,
  roleSettings: ['role-settings'] as const,
  rolePermissionOptions: ['role-permission-options'] as const,
  departmentOptions: ['department-options'] as const,

  // Sessions
  refreshTokens: (page: number, size: number, keyword: string) =>
    ['refresh-tokens', page, size, keyword] as const,
  refreshTokensBase: ['refresh-tokens'] as const,
  refreshTokensSummary: ['refresh-tokens-summary'] as const,

  // Statements
  statementLinkOptions: (type: string) =>
    ['statement-link-options', type] as const,

  // Finance
  projectArSummary: (projectId: string) =>
    ['project-ar', 'summary', projectId] as const,
  projectArDetail: (projectId: string, tab: string) =>
    ['project-ar', 'detail', projectId, tab] as const,

  // Print
  printTemplate: ['print-template'] as const,
  printTemplateByType: (billType: string) =>
    ['print-template', billType] as const,

  // Parent selector
  parentSelectorConfig: (moduleKey: string) =>
    ['parent-selector-config', moduleKey] as const,
  parentSelectorList: (
    moduleKey: string,
    filters: Record<string, unknown>,
    page: number,
    pageSize: number,
  ) => ['parent-selector-list', moduleKey, filters, page, pageSize] as const,

  // Freight
  freightPickup: (moduleKey: string) => ['freight-pickup', moduleKey] as const,
} as const
