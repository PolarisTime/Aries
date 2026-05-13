import {
  ApartmentOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { DashboardSummary } from '@/api/dashboard'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '—'
  }
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

export function buildDashboardInfoItems(
  summary?: DashboardSummary,
): DashboardInfoItem[] {
  return [
    {
      key: 'userName',
      label: '当前用户',
      value: summary?.userName || '—',
      icon: UserOutlined,
    },
    {
      key: 'loginName',
      label: '登录账号',
      value: summary?.loginName || '—',
      icon: SafetyOutlined,
    },
    {
      key: 'roleName',
      label: '所属角色',
      value: summary?.roleName || '未分配',
      icon: ApartmentOutlined,
    },
    {
      key: 'companyName',
      label: '所属公司',
      value: summary?.companyName || '未配置',
      icon: ShopOutlined,
    },
    {
      key: 'totpEnabled',
      label: 'MFA 状态',
      value: summary?.totpEnabled ? '已启用' : '未启用',
      icon: SafetyOutlined,
    },
    {
      key: 'lastLoginAt',
      label: '最近登录',
      value: formatDateTime(summary?.lastLoginAt),
      icon: ClockCircleOutlined,
    },
  ]
}
