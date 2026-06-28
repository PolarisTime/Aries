import { SafetyOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Card, Descriptions, Statistic, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/dashboard'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

interface Props {
  animatedServerTime: string
  infoItems: DashboardInfoItem[]
  summary?: DashboardSummary
}

type DashboardWorkplaceHeaderProps = Pick<
  Props,
  'animatedServerTime' | 'summary'
>
type DashboardSidebarPanelsProps = Pick<Props, 'infoItems' | 'summary'>

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

export function DashboardSidebarPanels({
  infoItems,
  summary,
}: DashboardSidebarPanelsProps) {
  const { t } = useTranslation()
  const mfaEnabled = Boolean(summary?.totpEnabled)
  const systemItems = [
    {
      key: 'modules',
      label: t('dashboard.cards.modules'),
      value: summary?.moduleCount ?? 0,
    },
    {
      key: 'materials',
      label: t('dashboard.flow.material.title'),
      value: summary?.materialCount ?? 0,
    },
    {
      key: 'suppliers',
      label: t('dashboard.flow.supplier.title'),
      value: summary?.supplierCount ?? 0,
    },
    {
      key: 'customers',
      label: t('dashboard.flow.customer.title'),
      value: summary?.customerCount ?? 0,
    },
  ]

  return (
    <div className="dashboard-sidebar-panels">
      <Card title={t('dashboard.info.accountInfo')} className="dashboard-panel">
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

      <Card
        title={t('dashboard.info.systemOverview')}
        className="dashboard-panel"
      >
        <div className="dashboard-system-list">
          {systemItems.map((item) => (
            <div key={item.key} className="dashboard-system-row">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="dashboard-system-security">
          <SafetyOutlined />
          <span>{t('dashboard.info.mfaStatus')}</span>
          <Tag color={mfaEnabled ? 'success' : 'warning'} variant="filled">
            {mfaEnabled
              ? t('dashboard.values.enabled')
              : t('dashboard.values.disabled')}
          </Tag>
        </div>
      </Card>
    </div>
  )
}

export function DashboardInfoPanels(props: Props) {
  return (
    <>
      <DashboardWorkplaceHeader
        animatedServerTime={props.animatedServerTime}
        summary={props.summary}
      />
      <DashboardSidebarPanels
        infoItems={props.infoItems}
        summary={props.summary}
      />
    </>
  )
}
