import { useTranslation } from 'react-i18next'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Props {
  config: ModulePageConfig
  records: ModuleRecord[]
  total: number
  currentPage: number
  pageSize: number
}

export function BusinessGridWorkspaceHeader({
  config,
  records,
  total,
  currentPage,
  pageSize,
}: Props) {
  const { t } = useTranslation()
  const overview = config.buildOverview(records)
  const rangeStart = records.length ? (currentPage - 1) * pageSize + 1 : 0
  const rangeEnd = records.length ? rangeStart + records.length - 1 : 0

  return (
    <>
      {!config.hidePageHeader ? (
        <header className="module-workspace-header">
          <div className="module-workspace-heading">
            {config.kicker ? (
              <span className="module-workspace-kicker">{config.kicker}</span>
            ) : null}
            <h1 className="module-workspace-title">{config.title}</h1>
            {config.description ? (
              <p className="module-workspace-description">
                {config.description}
              </p>
            ) : null}
          </div>
          <span className="module-workspace-result-range" aria-live="polite">
            {records.length
              ? t('modules.workspace.resultRange', {
                  start: rangeStart,
                  end: rangeEnd,
                  total,
                })
              : t('modules.workspace.emptyResultRange', { total })}
          </span>
        </header>
      ) : null}

      {overview.length ? (
        <section
          className="module-workspace-overview"
          aria-label={t('modules.workspace.currentPageSummary')}
        >
          <span className="module-workspace-overview-label">
            {t('modules.workspace.currentPageSummary')}
          </span>
          <dl className="module-workspace-overview-list">
            {overview.map((item) => (
              <div className="module-workspace-overview-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </>
  )
}
