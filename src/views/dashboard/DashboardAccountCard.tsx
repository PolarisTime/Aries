import { Card, Descriptions } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/system/dashboard'
import { buildDashboardInfoItems } from '@/views/dashboard/dashboard-info-utils'

/** 账户概况紧凑卡：登录账号 / 所属公司 / 上次登录，高度自然包裹 */
export function DashboardAccountCard({
  summary,
}: {
  summary?: DashboardSummary
}) {
  const { t } = useTranslation()

  const items = useMemo(() => {
    const infoItems = buildDashboardInfoItems(t, summary)
    const wantedKeys = new Set(['loginName', 'companyName', 'lastLoginAt'])
    return infoItems
      .filter((item) => wantedKeys.has(item.key))
      .map((item) => {
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
      })
  }, [summary, t])

  return (
    <Card
      size="small"
      title={t('dashboard.account.title')}
      className="dashboard-account-card"
    >
      <Descriptions column={1} size="small" items={items} />
    </Card>
  )
}
