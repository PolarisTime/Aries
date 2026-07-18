import { UserOutlined } from '@ant-design/icons'
import { Avatar, Statistic } from 'antd'
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
  const loginName = summary?.loginName || '—'
  const metricItems = [
    {
      key: 'visibleMenus',
      title: t('dashboard.fields.visibleMenus'),
      value: summary?.visibleMenuCount ?? 0,
    },
    {
      key: 'modules',
      title: t('dashboard.info.modules'),
      value: summary?.moduleCount ?? 0,
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
          <div className="dashboard-workplace-eyebrow">
            {t('dashboard.sections.overview')}
          </div>
          <h1>{companyName}</h1>
          <div className="dashboard-workplace-meta">
            <span>
              {t('dashboard.info.userName')}：{userName}
            </span>
            <span>
              {t('dashboard.info.loginName')}：{loginName}
            </span>
          </div>
          <div className="dashboard-workplace-status">
            <span>
              {t('dashboard.fields.serverTime')} {animatedServerTime}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-workplace-stats">
        {metricItems.map((item, index) => (
          <div key={item.key} className="dashboard-workplace-stat">
            <span className="dashboard-workplace-stat-index" aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <Statistic title={item.title} value={item.value} />
          </div>
        ))}
      </div>
    </section>
  )
}
