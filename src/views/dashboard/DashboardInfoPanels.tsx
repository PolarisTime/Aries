import { UserOutlined } from '@ant-design/icons'
import Avatar from 'antd/es/avatar'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Statistic from 'antd/es/statistic'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/dashboard'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

interface Props {
  animatedServerTime: string
  infoItems: DashboardInfoItem[]
  summary?: DashboardSummary
}

export function DashboardInfoPanels({
  animatedServerTime,
  infoItems,
  summary,
}: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className="dashboard-hero">
        <div className="dashboard-hero-left">
          <h1 className="dashboard-hero-title">
            {summary?.companyName || t('common.brandSubtitle')}
          </h1>
          <p className="dashboard-hero-desc">
            {t('dashboard.fields.serverTime')} {animatedServerTime}
          </p>
        </div>
        <div className="dashboard-hero-right">
          <Avatar size={48} className="bg-primary">
            <UserOutlined />
          </Avatar>
          <div className="dashboard-hero-user">
            <strong>{summary?.userName || '—'}</strong>
            <span>{summary?.roleName || '—'}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-panels-grid">
        <div>
          <Card
            title={t('dashboard.info.accountInfo')}
            className="dashboard-panel"
          >
            <Descriptions
              column={1}
              size="small"
              className="dashboard-descriptions"
              items={infoItems.map((item) => {
                const Icon = item.icon
                return {
                  key: item.key,
                  label: item.label,
                  children: (
                    <>
                      <Icon className="mr-6 opacity-45" />
                      {item.value}
                    </>
                  ),
                }
              })}
            />
          </Card>
        </div>
        <div>
          <Card
            title={t('dashboard.info.systemOverview')}
            className="dashboard-panel"
          >
            <Statistic
              title={t('dashboard.info.activeSessions')}
              value={summary?.activeSessionCount ?? 0}
              className="mb-4"
            />
            <Statistic
              title={t('dashboard.fields.visibleMenus')}
              value={summary?.visibleMenuCount ?? 0}
              className="mb-4"
            />
            <Statistic
              title={t('dashboard.info.actionPermissions')}
              value={summary?.actionCount ?? 0}
            />
          </Card>
        </div>
      </div>
    </>
  )
}
