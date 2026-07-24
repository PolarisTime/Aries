import { Card, Descriptions } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

interface DashboardSidebarPanelsProps {
  infoItems: DashboardInfoItem[]
}

export function DashboardSidebarPanels({
  infoItems,
}: DashboardSidebarPanelsProps) {
  const { t } = useTranslation()

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
    </div>
  )
}
