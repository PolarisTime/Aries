import type { AppPageDefinition } from '@/config/page-registry-types'

export const dashboardPageDefinitions: AppPageDefinition[] = [
  {
    key: 'dashboard',
    titleKey: 'pages.dashboard',
    menuKey: '/dashboard',
    view: 'dashboard',
    icon: 'HomeOutlined',
  },
]
