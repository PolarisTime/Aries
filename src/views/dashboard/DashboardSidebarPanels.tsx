import { SafetyOutlined } from '@ant-design/icons'
import { Card, Descriptions, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/dashboard'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

interface DashboardSidebarPanelsProps {
  infoItems: DashboardInfoItem[]
  summary?: DashboardSummary
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
