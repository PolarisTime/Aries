import { UserOutlined } from '@ant-design/icons'
import { Avatar } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/system/dashboard'

interface DashboardGreetingHeaderProps {
  animatedServerTime: string
  summary?: DashboardSummary
}

/** 工作台顶部问候语组件：头像 + 欢迎语 + 服务时间 / 所属公司 */
export function DashboardGreetingHeader({
  animatedServerTime,
  summary,
}: DashboardGreetingHeaderProps) {
  const { t } = useTranslation()
  const userName = summary?.userName || t('dashboard.info.userName')

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
    </section>
  )
}
