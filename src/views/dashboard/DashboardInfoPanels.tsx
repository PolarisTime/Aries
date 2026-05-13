import { UserOutlined } from '@ant-design/icons'
import Avatar from 'antd/es/avatar'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Statistic from 'antd/es/statistic'
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
  return (
    <>
      <div className="dashboard-hero">
        <div className="dashboard-hero-left">
          <h1 className="dashboard-hero-title">
            {summary?.companyName || '钢贸业务中台'}
          </h1>
          <p className="dashboard-hero-desc">服务器时间 {animatedServerTime}</p>
        </div>
        <div className="dashboard-hero-right">
          <Avatar size={48} style={{ backgroundColor: '#1677ff' }}>
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
          <Card title="账户信息" className="dashboard-panel">
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
                      <Icon style={{ marginRight: 6, opacity: 0.45 }} />
                      {item.value}
                    </>
                  ),
                }
              })}
            />
          </Card>
        </div>
        <div>
          <Card title="系统概况" className="dashboard-panel">
            <Statistic
              title="活跃会话"
              value={summary?.activeSessionCount ?? 0}
              style={{ marginBottom: 16 }}
            />
            <Statistic
              title="可见菜单"
              value={summary?.visibleMenuCount ?? 0}
              style={{ marginBottom: 16 }}
            />
            <Statistic title="操作权限项" value={summary?.actionCount ?? 0} />
          </Card>
        </div>
      </div>
    </>
  )
}
