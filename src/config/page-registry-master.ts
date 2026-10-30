import type {
  AppPageDefinition,
  PageSearchValidator,
} from '@/config/page-registry-types'

/**
 * `?tab=` 查询串的校验器（全站唯一实现，material / project 两个宿主页共用）。
 *
 * <p>宿主页内的标签切换只改查询串、不改 pathname：shell 里一个 pathname 只对应一个
 * 标签对象（layoutTabsStore 的 `setTabLocation` 不变式），换 pathname 会跨到另一个
 * 外壳标签。因此 `?tab=` 是标签状态的唯一来源；被并页的深链路径
 * （/material-categories 等）由 pathname 推导默认标签。</p>
 *
 * <p>返回原始查询串的浅拷贝，保证 `docNo` / `create` 等深链意图参数不被路由层丢弃。</p>
 */
export const tabSearchValidator: PageSearchValidator = (rawSearch) => {
  const tab = rawSearch.tab
  return typeof tab === 'string' ? { ...rawSearch, tab } : { ...rawSearch }
}

export const masterPageDefinitions: AppPageDefinition[] = [
  {
    key: 'material',
    titleKey: 'pages.material',
    menuKey: '/material',
    /*
     * 宿主页（商品资料 + 材料类别 / 定尺加价 / 值映射 三个标签）。
     *
     * 清单里「基础数据」原有 11 个一层子项，用户确认合并成 6 个：商品资料页吸收
     * 材料类别 / 定尺加价 / 值映射，项目资料页吸收报价地区，公司设置挪到系统设置分组。
     * 被并页不再进菜单（hiddenInMenu），但**保留页面定义与路由**：`assertCompleteModulePages`
     * 要求每个 MODULE_KEYS 都有页面定义，`material-categories` 是 module key；深链也不能 404。
     * 被并页的 view 一律指向宿主页（见下方各条），由宿主页按 pathname / `?tab=` 选中标签。
     *
     * 以下两处入口共享同一份通用列表页配置（business-pages/master/material-page.ts）：
     * 「商品资料」标签渲染通用列表页；「材料类别」标签同样渲染通用列表页，只是换 pageDef，
     * 保持本页合并前的行为（`MaterialCategoriesPage` 自 5e695529 起已被通用列表页取代、
     * 无任何加载器引用）。
     */
    view: 'master-material',
    icon: 'DatabaseOutlined',
    menuParent: 'master',
    moduleKey: 'material',
    validateSearch: tabSearchValidator,
  },
  {
    key: 'material-categories',
    titleKey: 'pages.material-categories',
    menuKey: '/material-categories',
    // 已并进 /material 的「商品类别」标签：菜单隐藏，route 保留（深链落到对应标签）。
    view: 'master-material',
    icon: 'TagsOutlined',
    menuParent: 'master',
    hiddenInMenu: true,
    activeMenuKey: '/material',
    moduleKey: 'material-categories',
    validateSearch: tabSearchValidator,
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
    /*
     * 接入通用列表页。项目资料是本轮迁移里字段差异最大的模块：保存载荷 25 个字段，
     * 而配置侧原先只有 9 个——差的 12 个是取价规则与允许范围（取价数据源/地区、
     * 基准日期与顺延天数、休市方向与天数、时段策略与固定时段、允许品牌/材质及两者的
     * 校验力度）。这 12 个字段已全部补进 business-pages/master/project-page.ts，
     * 默认值/枚举/上限一律 import 自 api/master/project-options，避免与后端口径漂移。
     *
     * 两项联动复位（基准≠报单→顺延天数归零、策略≠固定→清空固定时段）已在
     * module-behavior-editor 的 project.syncEditorForm 里实现，与专用弹层同口径。
     *
     * 已知差异（可接受）：品牌/材质用 multiSelect 代替专用页的左右穿梭；项目价格规定
     * （独立 API 的多行编辑器）在通用编辑器里没有注入点，仍需后续补入口。
     */
    view: 'master-project',
    icon: 'ProfileOutlined',
    menuParent: 'master',
    moduleKey: 'project',
    // 宿主页：「项目资料」标签渲染通用列表页，「报价地区」标签渲染报价地区维护页。
    validateSearch: tabSearchValidator,
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
    // 合并方案：不再归「基础数据」，挪到「系统设置」分组（页面自身不变，不并页）。
    menuParent: 'system',
    moduleKey: 'company-setting',
  },
  {
    // 值映射/别名维护：把「同一含义多种写法」归一，规则由业务维护而非改代码。
    // 无 moduleKey（不是业务单据模块），权限码与后端 VALUE_ALIASES_READ 对齐。
    key: 'value-alias',
    titleKey: 'pages.value-alias',
    menuKey: '/value-alias',
    // 已并进 /material 的「值映射」标签：菜单隐藏，route 保留（深链落到对应标签）。
    view: 'master-material',
    icon: 'SwapOutlined',
    menuParent: 'master',
    hiddenInMenu: true,
    activeMenuKey: '/material',
    requiredPermission: 'value-aliases:read',
    validateSearch: tabSearchValidator,
  },
  {
    // 取价地区维护：西本行情抓取的城市清单与子域名，原写在 application.yml，
    // 新增城市要改配置并重启，现由业务自行维护（停用不必删除）。
    // 无 moduleKey（不是业务单据模块），权限码与后端 QUOTE_REGIONS_READ 对齐。
    key: 'quote-region',
    titleKey: 'pages.quote-region',
    menuKey: '/quote-region',
    // 已并进 /project 的「报价地区」标签：菜单隐藏，route 保留（深链落到对应标签）。
    view: 'master-project',
    icon: 'ShopOutlined',
    menuParent: 'master',
    hiddenInMenu: true,
    activeMenuKey: '/project',
    requiredPermission: 'quote-regions:read',
    validateSearch: tabSearchValidator,
  },
  {
    // 定尺加价维护：定尺（如 12 米）每吨加价规则，原同时写在 yml 与 Java 默认值里。
    // 无 moduleKey（不是业务单据模块），权限码与后端 LENGTH_PREMIUMS_READ 对齐。
    key: 'length-premium',
    titleKey: 'pages.length-premium',
    menuKey: '/length-premium',
    // 已并进 /material 的「定尺加价」标签：菜单隐藏，route 保留（深链落到对应标签）。
    view: 'master-material',
    icon: 'CalculatorOutlined',
    menuParent: 'master',
    hiddenInMenu: true,
    activeMenuKey: '/material',
    requiredPermission: 'length-premiums:read',
    validateSearch: tabSearchValidator,
  },
]
