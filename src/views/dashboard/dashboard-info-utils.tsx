import {
  ApartmentOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { TFunction } from 'i18next'
import type { DashboardSummary } from '@/api/dashboard'
import { formatDateTime } from '@/utils/formatters'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

export function buildDashboardInfoItems(
  t: TFunction,
  summary?: DashboardSummary,
): DashboardInfoItem[] {
  return [
    {
      key: 'userName',
      label: t('dashboard.info.userName'),
      value: summary?.userName || '—',
      icon: UserOutlined,
    },
    {
      key: 'loginName',
      label: t('dashboard.info.loginName'),
      value: summary?.loginName || '—',
      icon: SafetyOutlined,
    },
    {
      key: 'roleName',
      label: t('dashboard.info.roleName'),
      value: summary?.roleName || t('dashboard.info.unassigned'),
      icon: ApartmentOutlined,
    },
    {
      key: 'companyName',
      label: t('dashboard.info.companyName'),
      value: summary?.companyName || t('dashboard.values.unconfigured'),
      icon: ShopOutlined,
    },
    {
      key: 'lastLoginAt',
      label: t('dashboard.info.lastLogin'),
      value: formatDateTime(summary?.lastLoginAt),
      icon: ClockCircleOutlined,
    },
  ]
}
