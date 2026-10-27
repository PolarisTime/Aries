import type { AppPageDefinition } from '@/config/page-registry-types'

/** 比价模块: 独立分组, 位于基础数据之后。 */
export const marketPageDefinitions: AppPageDefinition[] = [
  {
    key: 'price-compare',
    titleKey: 'pages.price-compare',
    menuKey: '/price-compare',
    view: 'price-compare',
    icon: 'CalculatorOutlined',
    menuParent: 'market',
  },
  {
    // 供应商报价表（比价一手价）：以供应商为入口录入，列 = 该供应商的经营品牌。
    // 报单比价「从价格表带价」按 (品牌, 商品) 取最低价，来源就是本页。
    // 无 moduleKey（不是业务单据模块），权限码与后端 SUPPLIER_PRICE_LISTS_READ 对齐，权限归采购。
    key: 'supplier-quote',
    titleKey: 'pages.supplier-quote',
    menuKey: '/supplier-quote',
    view: 'supplier-quote',
    icon: 'TagsOutlined',
    menuParent: 'market',
    requiredPermission: 'supplier-price-lists:read',
  },
  {
    key: 'market-sync',
    titleKey: 'pages.market-sync',
    menuKey: '/market-sync',
    view: 'market-sync',
    icon: 'FileSyncOutlined',
    menuParent: 'market',
  },
]
