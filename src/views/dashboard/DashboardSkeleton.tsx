export function DashboardSkeleton() {
  return (
    <div className="page-stack dashboard-root dashboard-skeleton">
      <section className="dashboard-hero dashboard-hero-skeleton">
        <div className="dashboard-hero-left">
          <div className="dashboard-skeleton-block dashboard-skeleton-hero-title" />
          <div className="dashboard-skeleton-block dashboard-skeleton-hero-desc" />
        </div>
        <div className="dashboard-hero-right">
          <div className="dashboard-skeleton-avatar" />
          <div className="dashboard-hero-user">
            <div className="dashboard-skeleton-block dashboard-skeleton-user-line" />
            <div className="dashboard-skeleton-block dashboard-skeleton-user-subline" />
          </div>
        </div>
      </section>

      <div className="dashboard-panels-grid">
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

      <section className="dashboard-flow-card dashboard-skeleton-panel">
        <div className="dashboard-skeleton-block dashboard-skeleton-card-title" />
        <div className="dashboard-flow-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`skeleton-flow-${index}`} className="dashboard-flow-section">
              <div className="dashboard-flow-section-head">
                <div className="dashboard-skeleton-block dashboard-skeleton-flow-title" />
                <div className="dashboard-flow-section-desc">
                  {index === 0
                    ? '先维护业务主数据，后续单据可直接关联带出。'
                    : '正在加载业务流程说明...'}
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
