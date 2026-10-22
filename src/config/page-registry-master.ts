import type { AppPageDefinition } from '@/config/page-registry-types'

export const masterPageDefinitions: AppPageDefinition[] = [
  {
    key: 'material',
    titleKey: 'pages.material',
    menuKey: '/material',
    view: 'master-material',
    icon: 'DatabaseOutlined',
    menuParent: 'master',
    moduleKey: 'material',
  },
  {
    key: 'material-categories',
    titleKey: 'pages.material-categories',
    menuKey: '/material-categories',
    view: 'master-material-categories',
    icon: 'TagsOutlined',
    menuParent: 'master',
    moduleKey: 'material-categories',
  },
  {
    key: 'supplier',
    titleKey: 'pages.supplier',
    menuKey: '/supplier',
    view: 'master-supplier',
    icon: 'TeamOutlined',
    menuParent: 'master',
    moduleKey: 'supplier',
  },
  {
    key: 'customer',
    titleKey: 'pages.customer',
    menuKey: '/customer',
    view: 'master-customer',
    icon: 'UserOutlined',
    menuParent: 'master',
    moduleKey: 'customer',
  },
  {
    key: 'project',
    titleKey: 'pages.project',
    menuKey: '/project',
    // 试点：按模块拆分的专用页面（阶段 1-2），回滚时将 view 改回 'business-grid' 即可。
    // 旧 BusinessGrid 配置保留在 business-pages/master/project-page.ts，仅供保存载荷(saveFields)复用，不再驱动这两个模块的列表 UI。
    view: 'master-project',
    icon: 'ProfileOutlined',
    menuParent: 'master',
    moduleKey: 'project',
  },
  {
    key: 'carrier',
    titleKey: 'pages.carrier',
    menuKey: '/carrier',
    // 试点：按模块拆分的专用页面（阶段 1-2），回滚时将 view 改回 'business-grid' 即可。
    // 旧 BusinessGrid 配置保留在 business-pages/master/carrier-page.ts，仅供保存载荷(saveFields)复用，不再驱动这两个模块的列表 UI。
    view: 'master-carrier',
    icon: 'CarOutlined',
    menuParent: 'master',
    moduleKey: 'carrier',
  },
  {
    key: 'warehouse',
    titleKey: 'pages.warehouse',
    menuKey: '/warehouse',
    view: 'master-warehouse',
    icon: 'BankOutlined',
    menuParent: 'master',
    moduleKey: 'warehouse',
  },
  {
    key: 'company-setting',
    titleKey: 'pages.company-setting',
    menuKey: '/company-setting',
    view: 'company-setting',
    icon: 'AccountBookOutlined',
    menuParent: 'master',
    moduleKey: 'company-setting',
  },
  {
    // 值映射/别名维护：把「同一含义多种写法」归一，规则由业务维护而非改代码。
    // 无 moduleKey（不是业务单据模块），权限码与后端 VALUE_ALIASES_READ 对齐。
    key: 'value-alias',
    titleKey: 'pages.value-alias',
    menuKey: '/value-alias',
    view: 'master-value-alias',
    icon: 'SwapOutlined',
    menuParent: 'master',
    requiredPermission: 'value-aliases:read',
  },
  {
    // 取价地区维护：西本行情抓取的城市清单与子域名，原写在 application.yml，
    // 新增城市要改配置并重启，现由业务自行维护（停用不必删除）。
    // 无 moduleKey（不是业务单据模块），权限码与后端 QUOTE_REGIONS_READ 对齐。
    key: 'quote-region',
    titleKey: 'pages.quote-region',
    menuKey: '/quote-region',
    view: 'master-quote-region',
    icon: 'ShopOutlined',
    menuParent: 'master',
    requiredPermission: 'quote-regions:read',
  },
  {
    // 品牌价格表（比价一手价）：一个品牌一张表，规格做行、供应商做列；报单比价取价的最低价来源。
    // 无 moduleKey（不是业务单据模块），权限码与后端 SUPPLIER_PRICE_LISTS_READ 对齐，权限归采购。
    key: 'supplier-price-list',
    titleKey: 'pages.supplier-price-list',
    menuKey: '/supplier-price-list',
    view: 'master-supplier-price-list',
    icon: 'TagsOutlined',
    menuParent: 'master',
    requiredPermission: 'supplier-price-lists:read',
  },
  {
    // 定尺加价维护：定尺（如 12 米）每吨加价规则，原同时写在 yml 与 Java 默认值里。
    // 无 moduleKey（不是业务单据模块），权限码与后端 LENGTH_PREMIUMS_READ 对齐。
    key: 'length-premium',
    titleKey: 'pages.length-premium',
    menuKey: '/length-premium',
    view: 'master-length-premium',
    icon: 'CalculatorOutlined',
    menuParent: 'master',
    requiredPermission: 'length-premiums:read',
  },
]
