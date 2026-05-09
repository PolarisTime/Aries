import type { AppPageDefinition } from '@/config/page-registry-types'

export const dashboardPageDefinitions: AppPageDefinition[] = [
  {
    key: 'dashboard',
    title: '工作台',
    menuKey: '/dashboard',
    view: 'dashboard',
    icon: 'HomeOutlined',
  },
]
