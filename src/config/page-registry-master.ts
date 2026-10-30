import type { AppPageDefinition } from '@/config/page-registry-types'

export const masterPageDefinitions: AppPageDefinition[] = [
  {
    key: 'material',
    titleKey: 'pages.material',
    menuKey: '/material',
    // 接入通用列表页（business-grid）：列表/筛选/工具栏/分页与业务单据一致，
    // 保存载荷走 module-page-schema.ts 的 saveFields（已按 buildRecord 逐字段补录）。
    view: 'business-grid',
    icon: 'DatabaseOutlined',
    menuParent: 'master',
    moduleKey: 'material',
  },
  {
    key: 'material-categories',
    titleKey: 'pages.material-categories',
    menuKey: '/material-categories',
    view: 'business-grid',
    icon: 'TagsOutlined',
    menuParent: 'master',
    moduleKey: 'material-categories',
  },
  {
    key: 'supplier',
    titleKey: 'pages.supplier',
    menuKey: '/supplier',
    /*
     * 接入通用列表页。经营品牌（brands）此前是阻塞点：品牌选项来自独立 useQuery
     * （useMaterialBrands，key = priceCompare.materialBrands），不在主数据选项体系里。
     * 现已把 brands 并入 useMasterOptions 的需求体系（新增 brands 需求，复用同一
     * queryKey 与 fetch 函数，与比价页共缓存、不重复请求），并在 formFields 用
     * multiSelect 呈现（通用编辑器没有 transfer 类型）。值口径仍是 string[]，
     * 与后端 SupplierRequest.brands: List<String> 一致。
     */
    view: 'business-grid',
    icon: 'TeamOutlined',
    menuParent: 'master',
    moduleKey: 'supplier',
  },
  {
    key: 'customer',
    titleKey: 'pages.customer',
    menuKey: '/customer',
    view: 'business-grid',
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
    /*
     * 接入通用列表页。车辆信息的前端口径是 16 个扁平字段、后端是 `vehicles` 嵌套数组，
     * 这个转换由 behavior `normalizeDraftRecord: normalizeCarrierDraftRecord` 负责，
     * 通用编辑器的提交链路（normalizeDraftRecordForModule）会调用它，因此切换后
     * vehicles 仍会被正确组装。同时补上了此前只能看不能改的 vehicleType / priceMode 表单字段。
     */
    view: 'business-grid',
    icon: 'CarOutlined',
    menuParent: 'master',
    moduleKey: 'carrier',
  },
  {
    key: 'warehouse',
    titleKey: 'pages.warehouse',
    menuKey: '/warehouse',
    view: 'business-grid',
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
