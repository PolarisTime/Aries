import type { AppPageDefinition } from '@/config/page-registry-types'

export const masterPageDefinitions: AppPageDefinition[] = [
  {
    key: 'material',
    title: '商品资料',
    menuKey: '/material',
    view: 'master-material',
    icon: 'DatabaseOutlined',
    menuParent: 'master',
    moduleKey: 'material',
  },
  {
    key: 'material-categories',
    title: '商品类别',
    menuKey: '/material-categories',
    view: 'master-material-categories',
    icon: 'TagsOutlined',
    menuParent: 'master',
    moduleKey: 'material-categories',
  },
  {
    key: 'supplier',
    title: '供应商资料',
    menuKey: '/supplier',
    view: 'master-supplier',
    icon: 'TeamOutlined',
    menuParent: 'master',
    moduleKey: 'supplier',
  },
  {
    key: 'customer',
    title: '客户资料',
    menuKey: '/customer',
    view: 'master-customer',
    icon: 'UserOutlined',
    menuParent: 'master',
    moduleKey: 'customer',
  },
  {
    key: 'project',
    title: '项目资料',
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
    title: '物流方资料',
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
    title: '仓库资料',
    menuKey: '/warehouse',
    view: 'master-warehouse',
    icon: 'BankOutlined',
    menuParent: 'master',
    moduleKey: 'warehouse',
  },
  {
    key: 'company-setting',
    title: '结算主体管理',
    menuKey: '/company-setting',
    view: 'company-setting',
    icon: 'AccountBookOutlined',
    menuParent: 'master',
    moduleKey: 'company-setting',
  },
]
