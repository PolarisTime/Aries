import { useTranslation } from 'react-i18next'

export function DashboardSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="page-stack dashboard-root dashboard-skeleton">
      <section className="dashboard-workplace-header dashboard-workplace-skeleton">
        <div className="dashboard-workplace-intro">
          <div className="dashboard-skeleton-avatar" />
          <div className="dashboard-workplace-copy">
            <div className="dashboard-skeleton-block dashboard-skeleton-status-title" />
            <div className="dashboard-skeleton-block dashboard-skeleton-status-meta" />
            <div className="dashboard-skeleton-block dashboard-skeleton-time" />
          </div>
        </div>
        <div className="dashboard-workplace-stats">
          {['menus', 'actions', 'sessions'].map((key) => (
            <div
              key={`skeleton-stat-${key}`}
              className="dashboard-workplace-stat"
            >
              <div className="dashboard-skeleton-block dashboard-skeleton-line" />
              <div className="dashboard-skeleton-block dashboard-skeleton-stat" />
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-workplace-layout">
        <main className="dashboard-workplace-main">
          <section className="dashboard-flow-card dashboard-skeleton-panel">
            <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
            <div className="dashboard-flow-lanes">
              {['a', 'b', 'c', 'd'].map((key, index) => (
                <div
                  key={`skeleton-flow-${key}`}
                  className="dashboard-flow-lane"
                >
                  <div className="dashboard-flow-lane-head">
                    <div className="dashboard-skeleton-block dashboard-skeleton-flow-title" />
                    <div className="dashboard-flow-lane-desc">
                      {index === 0
                        ? t('common.masterDataDesc')
                        : t('dashboard.flow.loadingDescription')}
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
        </main>

        <aside className="dashboard-workplace-sidebar">
          <div className="dashboard-sidebar-panels">
            <div className="dashboard-skeleton-panel">
              <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
              <div className="dashboard-skeleton-list">
                <div className="dashboard-skeleton-block dashboard-skeleton-line" />
                <div className="dashboard-skeleton-block dashboard-skeleton-line" />
                <div className="dashboard-skeleton-block dashboard-skeleton-line" />
              </div>
            </div>
            <div className="dashboard-skeleton-panel">
              <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
              <div className="dashboard-skeleton-list">
                <div className="dashboard-skeleton-block dashboard-skeleton-stat" />
                <div className="dashboard-skeleton-block dashboard-skeleton-stat" />
                <div className="dashboard-skeleton-block dashboard-skeleton-stat" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
