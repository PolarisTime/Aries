export function BusinessGridPageSkeleton() {
  return (
    <div className="page-stack module-page-stack">
      <div className="module-page-skeleton">
        <div className="module-page-skeleton-row">
          <div className="module-page-skeleton-block is-lg" />
          <div className="module-page-skeleton-block" />
          <div className="module-page-skeleton-block" />
          <div className="module-page-skeleton-block is-wide" />
          <div className="module-page-skeleton-button" />
          <div className="module-page-skeleton-button" />
        </div>

        <div className="module-page-skeleton-row module-page-skeleton-row-between">
          <div className="module-page-skeleton-row">
            <div className="module-page-skeleton-button is-toolbar" />
            <div className="module-page-skeleton-button is-toolbar" />
            <div className="module-page-skeleton-button is-toolbar" />
          </div>
          <div className="module-page-skeleton-button is-toolbar-sm" />
        </div>

        <div className="module-page-skeleton-table">
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />
          <div className="module-page-skeleton-line" />

          <div className="module-page-skeleton-row module-page-skeleton-row-between">
            <div className="module-page-skeleton-block is-short" />
            <div className="module-page-skeleton-row">
              <div className="module-page-skeleton-button is-small" />
              <div className="module-page-skeleton-button is-small" />
              <div className="module-page-skeleton-button is-small" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
