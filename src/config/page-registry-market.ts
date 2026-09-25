import i18next from 'i18next'
import type { AppPageDefinition } from '@/config/page-registry-types'

/** 比价模块: 独立分组, 位于基础数据之后。 */
export const marketPageDefinitions: AppPageDefinition[] = [
  {
    key: 'price-compare',
    title: i18next.t('pages.price-compare'),
    menuKey: '/price-compare',
    view: 'price-compare',
    icon: 'CalculatorOutlined',
    menuParent: 'market',
  },
  {
    key: 'market-sync',
    title: i18next.t('pages.market-sync'),
    menuKey: '/market-sync',
    view: 'market-sync',
    icon: 'FileSyncOutlined',
    menuParent: 'market',
  },
]
