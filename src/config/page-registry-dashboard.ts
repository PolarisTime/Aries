import i18next from 'i18next'
import type { AppPageDefinition } from '@/config/page-registry-types'

export const dashboardPageDefinitions: AppPageDefinition[] = [
  {
    key: 'dashboard',
    title: i18next.t('pages.dashboard'),
    menuKey: '/dashboard',
    view: 'dashboard',
    icon: 'HomeOutlined',
  },
]
