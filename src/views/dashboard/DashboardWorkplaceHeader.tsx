import { UserOutlined } from '@ant-design/icons'
import { Avatar, Statistic, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/dashboard'

interface DashboardWorkplaceHeaderProps {
  animatedServerTime: string
  summary?: DashboardSummary
}

export function DashboardWorkplaceHeader({
  animatedServerTime,
  summary,
}: DashboardWorkplaceHeaderProps) {
  const { t } = useTranslation()
  const companyName = summary?.companyName || t('common.brandSubtitle')
  const userName = summary?.userName || '—'
  const roleName = summary?.roleName || t('dashboard.info.unassigned')
  const loginName = summary?.loginName || '—'
  const mfaEnabled = Boolean(summary?.totpEnabled)
  const metricItems = [
    {
      key: 'visibleMenus',
      title: t('dashboard.fields.visibleMenus'),
      value: summary?.visibleMenuCount ?? 0,
    },
    {
      key: 'actionPermissions',
      title: t('dashboard.info.actionPermissions'),
      value: summary?.actionCount ?? 0,
    },
    {
      key: 'activeSessions',
      title: t('dashboard.info.activeSessions'),
      value: summary?.activeSessionCount ?? 0,
    },
  ]

  return (
    <section className="dashboard-workplace-header">
      <div className="dashboard-workplace-intro">
        <Avatar size={48} className="dashboard-workplace-avatar">
          <UserOutlined />
        </Avatar>
        <div className="dashboard-workplace-copy">
          <h1>{companyName}</h1>
          <div className="dashboard-workplace-meta">
            <span>
              {t('dashboard.info.userName')}：{userName}
            </span>
            <span>
              {t('dashboard.info.roleName')}：{roleName}
            </span>
            <span>
              {t('dashboard.info.loginName')}：{loginName}
            </span>
          </div>
          <div className="dashboard-workplace-status">
            <Tag color={mfaEnabled ? 'success' : 'warning'} variant="filled">
              {mfaEnabled
                ? t('dashboard.values.enabled')
                : t('dashboard.values.disabled')}
            </Tag>
            <span>
              {t('dashboard.fields.serverTime')} {animatedServerTime}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-workplace-stats">
        {metricItems.map((item) => (
          <div key={item.key} className="dashboard-workplace-stat">
            <Statistic title={item.title} value={item.value} />
          </div>
        ))}
      </div>
    </section>
  )
}
