import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { Button, Card } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { buildWorkflowSections } from '@/views/dashboard/dashboard-flow-utils'

/** 业务链路导航：4 条链路流式节点，可折叠；点击直达对应模块标签页 */
export function DashboardFlowCard() {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const [collapsed, setCollapsed] = useState(false)
  const workflowSections = buildWorkflowSections(t)

  return (
    <Card
      title={
        <div className="dashboard-flow-card-heading">
          <span>{t('dashboard.sections.businessFlow')}</span>
          <small>{t('dashboard.alerts.title')}</small>
        </div>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={collapsed ? <DownOutlined /> : <UpOutlined />}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? t('common.expand') : t('common.collapse')}
        </Button>
      }
      className="dashboard-flow-card"
    >
      {collapsed ? null : (
        <div className="dashboard-flow-lanes">
          {workflowSections.map((section) => (
            <section key={section.key} className="dashboard-flow-lane">
              <div className="dashboard-flow-lane-head">
                <div className="dashboard-flow-lane-title">{section.title}</div>
                <div className="dashboard-flow-lane-desc">
                  {section.description}
                </div>
              </div>

              <div className="dashboard-flow-chain">
                {section.nodes.map((node, index) => {
                  const Icon = node.icon
                  return (
                    <div key={node.key} className="dashboard-flow-step">
                      <button
                        type="button"
                        className="dashboard-flow-node"
                        onClick={() => openTab({ pathname: node.path })}
                      >
                        <span className="dashboard-flow-node-icon">
                          <Icon />
                        </span>
                        <span className="dashboard-flow-node-copy">
                          <strong>{node.title}</strong>
                          <small>{node.hint}</small>
                        </span>
                      </button>
                      {index < section.nodes.length - 1 ? (
                        <span className="dashboard-flow-arrow" aria-hidden>
                          →
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}
