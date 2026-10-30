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
     * 暂不接入通用列表页：供应商的保存载荷含 `brands`（经营品牌多选），品牌选项来自
     * `useMaterialBrands()`（独立 useQuery，key = priceCompare.materialBrands），
     * 不属于 master-options 需求体系，通用编辑器没有选项注入点，且 `ModuleFormFieldType`
     * 也没有 transfer 类型 —— 切过去后品牌**不可编辑、列表与详情也不展示**。
     *
     * 注意：品牌不会被清空。保存时 `draftRecord` 会把原记录（含 brands）带回表单值，
     * 后端 `SupplierService.update` 对 `brands == null` 采用「保留现有品牌」语义，
     * 只有显式传 `brands: []` 才会清空。真正缺的是编辑能力，不是数据安全。
     */
    view: 'master-supplier',
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
     * 暂不接入通用列表页：后端 CarrierRequest 的车辆信息是 `vehicles: List<VehicleItem>`
     * 嵌套数组，另有 `vehicleType`、`priceMode` 两个字段；而配置侧 formFields 是
     * vehiclePlate/vehicleContact/... 共 16 个**扁平字段**。专用编辑器
     * （CarrierEditorOverlay）内部把扁平字段组装成 vehicles 再提交，通用编辑器没有这一步，
     * 切过去会丢掉全部车辆信息与计价方式。需先补扁平→嵌套的序列化与 vehicleType/priceMode
     * 字段定义。
     */
    view: 'master-carrier',
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
