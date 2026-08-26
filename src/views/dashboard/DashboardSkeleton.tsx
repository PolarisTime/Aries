import { useTranslation } from 'react-i18next'

export function DashboardSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="page-stack dashboard-root dashboard-skeleton">
      <section className="dashboard-header-band dashboard-workplace-skeleton">
        <div className="dashboard-greeting">
          <div className="dashboard-skeleton-avatar" />
          <div className="dashboard-greeting-copy">
            <div className="dashboard-skeleton-block dashboard-skeleton-status-title" />
            <div className="dashboard-skeleton-block dashboard-skeleton-time" />
          </div>
        </div>
        <div className="dashboard-metric-grid">
          {['a', 'b', 'c', 'd'].map((key) => (
            <div
              key={`skeleton-metric-${key}`}
              className="dashboard-skeleton-panel dashboard-metric-card"
            >
              <div className="dashboard-skeleton-block dashboard-skeleton-line" />
              <div className="dashboard-skeleton-block dashboard-skeleton-stat" />
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-workplace-layout">
        <main className="dashboard-workplace-main">
          <section className="dashboard-todo-panel dashboard-skeleton-panel">
            <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
            <div className="dashboard-skeleton-list">
              {['1', '2', '3', '4'].map((key) => (
                <div
                  key={`skeleton-row-${key}`}
                  className="dashboard-skeleton-block dashboard-skeleton-line"
                />
              ))}
            </div>
          </section>
        </main>

        <aside className="dashboard-workplace-sidebar">
          <div className="dashboard-sidebar-panels">
            {['account'].map((key) => (
              <section
                key={`skeleton-side-${key}`}
                className="dashboard-skeleton-panel"
              >
                <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
                <div className="dashboard-skeleton-list">
                  <div className="dashboard-skeleton-block dashboard-skeleton-line" />
                  <div className="dashboard-skeleton-block dashboard-skeleton-line" />
                </div>
              </section>
            ))}
          </div>
        </aside>
      </div>

      <section className="dashboard-flow-card dashboard-skeleton-panel">
        <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
        <div className="dashboard-flow-lanes">
          {['a', 'b', 'c', 'd'].map((key, index) => (
            <div key={`skeleton-flow-${key}`} className="dashboard-flow-lane">
              <div className="dashboard-flow-lane-head">
                <div className="dashboard-skeleton-block dashboard-skeleton-flow-title" />
                <div className="dashboard-flow-lane-desc">
                  {index === 0 ? t('common.masterDataDesc') : ''}
                </div>
              </div>
              <div className="dashboard-skeleton-chip-row">
                <div className="dashboard-skeleton-chip" />
                <div className="dashboard-skeleton-chip" />
                <div className="dashboard-skeleton-chip" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
