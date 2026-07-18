// React Query key factories — centralized constants to avoid hardcoded strings
// Usage: useQuery({ queryKey: QUERY_KEYS.generalSetting })  etc.

export const QUERY_KEYS = {
  // Settings
  generalSetting: ['general-setting'] as const,
  runtimeConfig: ['runtime-config'] as const,
  companySetting: ['company-setting'] as const,
  companySettings: ['company-settings'] as const,

  // Dashboard
  dashboardSummary: ['dashboard-summary'] as const,
  backendInfo: ['backend-info'] as const,

  // Finance
  cashLedger: (query: {
    settlementCompanyId: string
    startDate?: string
    endDate?: string
    counterpartyType?: string
    counterpartyId?: string
    flowType?: string
    keyword?: string
    page: number
    size: number
  }) => ['cash-ledger', query] as const,

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
  ) => ['business-grid', moduleKey, filters, page, pageSize] as const,
  businessPageConfig: (moduleKey: string) =>
    ['business-page-config', moduleKey] as const,
  businessGridOverlayPreload: (name: string) =>
    ['business-grid-overlay-preload', name] as const,

  // Master data
  masterOptions: {
    carrier: ['master-options', 'carrier'] as const,
    customer: ['master-options', 'customer'] as const,
    project: (customerId: string) =>
      ['master-options', 'project', customerId] as const,
    material: ['master-options', 'material'] as const,
    materialCategories: ['master-options', 'material-categories'] as const,
    settlementCompany: ['master-options', 'settlement-company'] as const,
    supplier: ['master-options', 'supplier'] as const,
    warehouse: ['master-options', 'warehouse'] as const,
  },

  // Auth / Users
  userAccount: (
    page: number,
    size: number,
    keyword: string,
    statusFilter: string | undefined,
  ) => ['user-account', page, size, keyword, statusFilter] as const,
  userAccountBase: ['user-account'] as const,
  departmentOptions: ['department-options'] as const,

  // Statements
  statementLinkOptionsBase: ['statement-link-options'] as const,
  statementLinkOptions: (type: string) =>
    ['statement-link-options', type] as const,

  // Print
  printTemplate: ['print-template'] as const,
  printTemplateByType: (billType: string) =>
    ['print-template', billType] as const,
  printableTemplatesBase: ['print-templates'] as const,
  printableTemplates: (moduleKey: string) =>
    ['print-templates', moduleKey] as const,
  printRecordBrands: (moduleKey: string, recordIds: string[]) =>
    ['print-record-brands', moduleKey, recordIds.join(',')] as const,
  printRecordItems: (moduleKey: string, recordIds: string[]) =>
    ['print-record-items', moduleKey, recordIds.join(',')] as const,

  // Parent selector
  parentSelectorListBase: ['parent-selector-list'] as const,
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
