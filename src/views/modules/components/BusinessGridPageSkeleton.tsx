export function BusinessGridPageSkeleton() {
  return (
    <div className="page-stack module-page-stack">
      <section
        className="module-page-skeleton"
        aria-busy="true"
        aria-label="数据加载中"
      >
        <div className="module-page-skeleton-region module-page-skeleton-region--filter">
          <div className="module-page-skeleton-row">
            <div className="module-page-skeleton-field">
              <span className="module-page-skeleton-label" />
              <span className="module-page-skeleton-control" />
            </div>
            <div className="module-page-skeleton-field">
              <span className="module-page-skeleton-label" />
              <span className="module-page-skeleton-control is-narrow" />
            </div>
            <div className="module-page-skeleton-field">
              <span className="module-page-skeleton-label" />
              <span className="module-page-skeleton-control" />
            </div>
            <div className="module-page-skeleton-button" />
            <div className="module-page-skeleton-button" />
          </div>
        </div>

        <div className="module-page-skeleton-region module-page-skeleton-region--toolbar">
          <div className="module-page-skeleton-row module-page-skeleton-row-between">
            <div className="module-page-skeleton-row">
              <div className="module-page-skeleton-button is-toolbar" />
              <div className="module-page-skeleton-button is-toolbar" />
              <div className="module-page-skeleton-button is-toolbar" />
            </div>
            <div className="module-page-skeleton-button is-toolbar-sm" />
          </div>
        </div>

        <div className="module-page-skeleton-table">
          <div
            className="module-page-skeleton-line is-head"
            aria-hidden="true"
          />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
        </div>

        <div className="module-page-skeleton-region module-page-skeleton-region--pagination">
          <div className="module-page-skeleton-block is-short" />
          <div className="module-page-skeleton-pagination">
            <span className="module-page-skeleton-range" />
            <div className="module-page-skeleton-row">
              <div className="module-page-skeleton-button is-small" />
              <div className="module-page-skeleton-button is-small" />
              <div className="module-page-skeleton-button is-small" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
