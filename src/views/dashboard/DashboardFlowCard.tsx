import type { NavigateFn } from '@tanstack/react-router'
import Card from 'antd/es/card'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/api/dashboard'
import { buildWorkflowSections } from '@/views/dashboard/dashboard-flow-utils'

type FlowSectionStyle = CSSProperties & {
  '--flow-accent': string
}

function flowSectionStyle(accent: string): FlowSectionStyle {
  return { '--flow-accent': accent }
}

interface Props {
  navigate: NavigateFn
  summary?: DashboardSummary
}

export function DashboardFlowCard({ navigate, summary }: Props) {
  const { t } = useTranslation()
  const workflowSections = buildWorkflowSections(t, summary)

  return (
    <Card title={t('dashboard.title')} className="dashboard-flow-card">
      <div className="dashboard-flow-grid">
        {workflowSections.map((section) => (
          <section
            key={section.key}
            className="dashboard-flow-section"
            style={flowSectionStyle(section.accent)}
          >
            <div className="dashboard-flow-section-head">
              <div className="dashboard-flow-section-title">
                {section.title}
              </div>
              <div className="dashboard-flow-section-desc">
                {section.description}
              </div>
            </div>

            <div className="dashboard-flow-chain">
              {section.nodes.map((node, index) => {
                const Icon = node.icon
                return (
                  <div key={node.key} className="dashboard-flow-chain-item">
                    <button
                      type="button"
                      className="dashboard-flow-node"
                      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Antd Modal onOk pattern
                      onClick={() => navigate({ to: node.path as '/' })}
                    >
                      <span
                        className="dashboard-flow-node-icon"
                        style={{ background: node.tone }}
                      >
                        <Icon />
                      </span>
                      <span className="dashboard-flow-node-copy">
                        <strong>{node.title}</strong>
                        <small>{node.hint}</small>
                        {node.metric ? <em>{node.metric}</em> : null}
                      </span>
                    </button>
                    {index < section.nodes.length - 1 ? (
                      <span className="dashboard-flow-arrow">→</span>
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
