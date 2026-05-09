import type { NavigateFn } from '@tanstack/react-router'
import { Card } from 'antd'
import type { WorkflowSection } from '@/views/dashboard/dashboard-view-types'

interface Props {
  navigate: NavigateFn
  workflowSections: WorkflowSection[]
}

export function DashboardFlowCard({ navigate, workflowSections }: Props) {
  return (
    <Card title="业务流程总览" className="dashboard-flow-card">
      <div className="dashboard-flow-grid">
        {workflowSections.map((section) => (
          <section
            key={section.key}
            className="dashboard-flow-section"
            style={{ ['--flow-accent' as string]: section.accent }}
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
