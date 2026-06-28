import type { NavigateFn } from '@tanstack/react-router'
import { Card } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/dashboard'
import { buildWorkflowSections } from '@/views/dashboard/dashboard-flow-utils'

interface Props {
  navigate: NavigateFn
  summary?: DashboardSummary
}

export function DashboardFlowCard({ navigate, summary }: Props) {
  const { t } = useTranslation()
  const workflowSections = buildWorkflowSections(t, summary)

  return (
    <Card
      title={t('dashboard.sections.businessFlow')}
      className="dashboard-flow-card"
    >
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
                      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Router navigate returns a promise in app handlers
                      onClick={() => navigate({ to: node.path as '/' })}
                    >
                      <span className="dashboard-flow-node-icon">
                        <Icon />
                      </span>
                      <span className="dashboard-flow-node-copy">
                        <strong>{node.title}</strong>
                        <small>{node.hint}</small>
                        {node.metric ? <em>{node.metric}</em> : null}
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
    </Card>
  )
}
