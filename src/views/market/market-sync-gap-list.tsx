import { Empty } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/utils/formatters'
import { type CalendarMap, matrixCellState, PERIODS } from './market-sync-model'

/**
 * 待补缺口清单：把矩阵里散落的红格子**聚成可点的清单**。
 *
 * <p>矩阵是"看全局"的视图，30 列里找空格仍然要一行行扫；补数时用户真正想做的是
 * "今天缺的那几个时段，一个个点掉"。这里按时段分组列出所有缺失格，点一下就是同步
 * 该时段（与点矩阵空格完全等价），补完自动从清单里消失。</p>
 *
 * <p>状态判定不另写一套：全部走 {@link matrixCellState}，与矩阵格子、行尾汇总同一口径。</p>
 */
export function MarketSyncGapList({
  calendars,
  matrixDays,
  onSyncDate,
  periods = PERIODS,
  syncingCell,
}: {
  calendars: CalendarMap
  matrixDays: string[]
  onSyncDate: (date: string, period?: string) => void
  periods?: readonly string[]
  syncingCell: string | null
}) {
  const { t } = useTranslation()
  const days = [...matrixDays].sort()

  const gaps = periods.map((period) => ({
    period,
    dates: days.filter(
      (date) => matrixCellState(date, period, calendars) === 'missing',
    ),
  }))
  const total = gaps.reduce((sum, group) => sum + group.dates.length, 0)

  return (
    <section
      className="market-sync-gaps"
      aria-label={t('marketSync.gapsTitle')}
    >
      <header className="market-sync-gaps-head">
        <span className="market-sync-gaps-title">
          {t('marketSync.gapsTitle')}
        </span>
        <span
          className={`market-sync-gaps-count${total === 0 ? ' is-full' : ''}`}
        >
          {total === 0
            ? t('marketSync.gapsNone')
            : t('marketSync.gapsCount', { count: total })}
        </span>
      </header>

      {total === 0 ? (
        <Empty
          className="market-sync-gaps-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('marketSync.gapsNoneHint')}
        />
      ) : (
        <div className="market-sync-gaps-body">
          {gaps.map((group) =>
            group.dates.length === 0 ? null : (
              <div key={group.period} className="market-sync-gaps-group">
                <span className="market-sync-gaps-period">{group.period}</span>
                <div className="market-sync-gaps-chips">
                  {group.dates.map((date) => {
                    const syncing = syncingCell === `${date}|${group.period}`
                    const label = t('marketSync.gapsChipLabel', {
                      date: formatDate(date),
                      period: group.period,
                    })
                    return (
                      <button
                        key={date}
                        type="button"
                        className="market-sync-gap-chip"
                        aria-label={label}
                        aria-busy={syncing || undefined}
                        title={label}
                        disabled={syncing}
                        onClick={() => onSyncDate(date, group.period)}
                      >
                        {syncing ? '…' : date.slice(5)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  )
}
