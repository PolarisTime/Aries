import { ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/system/dashboard'
import { useAuthStore } from '@/stores/authStore'
import { clearPersistedLayoutTabs } from '@/stores/layoutTabsStore'

interface DashboardGreetingHeaderProps {
  animatedServerTime: string
  summary?: DashboardSummary
}

/** 工作台顶部问候语组件：头像 + 欢迎语 + 服务时间 / 所属公司 / 强制刷新 */
export function DashboardGreetingHeader({
  animatedServerTime,
  summary,
}: DashboardGreetingHeaderProps) {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.user?.id)
  const userName = summary?.userName || t('dashboard.info.userName')
  const handleForceRefresh = useCallback(() => {
    clearPersistedLayoutTabs(userId)
    window.location.reload()
  }, [userId])

  return (
    <section className="dashboard-greeting">
      <Avatar size={48} className="dashboard-greeting-avatar">
        <UserOutlined />
      </Avatar>
      <div className="dashboard-greeting-copy">
        <h1>{t('dashboard.greeting.welcome', { name: userName })}</h1>
        <div className="dashboard-greeting-meta">
          <span>
            {t('dashboard.fields.serverTime')} {animatedServerTime}
          </span>
          <span>
            {t('dashboard.info.companyName')}：
            {summary?.companyName || t('dashboard.values.unconfigured')}
          </span>
        </div>
      </div>
      <Button
        icon={<ReloadOutlined />}
        onClick={handleForceRefresh}
        className="dashboard-force-refresh"
      >
        {t('dashboard.actions.forceRefresh')}
      </Button>
    </section>
  )
}
