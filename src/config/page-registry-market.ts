import type { AppPageDefinition } from '@/config/page-registry-types'

/** 比价模块: 独立分组, 位于基础数据之后。 */
export const marketPageDefinitions: AppPageDefinition[] = [
  {
    key: 'price-compare',
    title: '报单比价',
    menuKey: '/price-compare',
    view: 'price-compare',
    icon: 'CalculatorOutlined',
    menuParent: 'market',
  },
  {
    key: 'market-sync',
    title: '行情同步',
    menuKey: '/market-sync',
    view: 'market-sync',
    icon: 'FileSyncOutlined',
    menuParent: 'market',
  },
]
