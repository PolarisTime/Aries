import { Card, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { type CalendarMap, PERIODS, today } from './market-sync-model'

const { Text } = Typography

/** 单元格状态: 已同步 / 缺失(可同步) / 休市(非交易日, 非控件)。 */
type CellState = 'synced' | 'missing' | 'off'

/** 图例: 颜色不是唯一的信息载体, 每一项都有文字标签。 */
function MarketSyncLegend() {
  const { t } = useTranslation()
  const items: Array<{ state: CellState; label: string }> = [
    { state: 'synced', label: t('marketSync.matrixLegendSynced') },
    { state: 'missing', label: t('marketSync.matrixLegendMissing') },
    { state: 'off', label: t('marketSync.matrixLegendOff') },
  ]
  return (
    <span className="market-sync-legend">
      {items.map((item) => (
        <span key={item.state} className="market-sync-legend-item">
          <span
            className={`market-sync-legend-swatch is-${item.state}`}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </span>
  )
}

/**
 * 覆盖矩阵: 「时段 × 日期」转置(3 行 × 30 天)。
 *
 * 原实现是 30 行 × 时段列的大表格, 每列约 430px 只放一个字, 还要在卡片内
 * 再滚 420px 才看得完; 转置后一屏即可扫完近 30 天, 且不再需要内部滚动
 * (页面只保留唯一一处纵向滚动)。
 */
export function MarketSyncMatrix({
  calendars,
  matrixDays,
  onSelectQuote,
  onSyncDate,
  selected,
  syncingCell,
  periods = PERIODS,
}: {
  calendars: CalendarMap
  matrixDays: string[]
  onSelectQuote: (date: string, period: string) => void
  onSyncDate: (date: string, period?: string) => void
  selected: { date: string; period: string }
  syncingCell: string | null
  /** 矩阵展示的时段; 西本仅「上午」。 */
  periods?: readonly string[]
}) {
  const { t } = useTranslation()
  const todayDate = today()

  const stateOf = (date: string, period: string): CellState => {
    const dow = dayjs(date).day()
    if (dow === 0 || dow === 6) return 'off'
    return calendars[date]?.periods.includes(period) ? 'synced' : 'missing'
  }

  const labelOf = (date: string, period: string, state: CellState) => {
    if (state === 'off') return t('marketSync.matrixCellOff', { date, period })
    if (state === 'synced') {
      return t('marketSync.matrixCellSynced', {
        date,
        period,
        rows: calendars[date]?.rows[period] ?? 0,
      })
    }
    return t('marketSync.matrixCellMissing', { date, period })
  }

  return (
    <Card
      size="small"
      title={
        <div className="market-sync-matrix-head">
          <span>{t('marketSync.matrixTitle')}</span>
          <MarketSyncLegend />
        </div>
      }
    >
      <div className="market-sync-grid-wrap">
        <table
          className="market-sync-grid"
          aria-label={t('marketSync.matrixTitle')}
        >
          <thead>
            <tr>
              <th scope="col" className="market-sync-grid-rowhead">
                {t('marketSync.period')}
              </th>
              {matrixDays.map((date) => {
                const dow = dayjs(date).day()
                const weekend = dow === 0 || dow === 6
                return (
                  <th
                    key={date}
                    scope="col"
                    className={[
                      weekend ? 'is-weekend' : '',
                      date === todayDate ? 'is-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Tooltip title={date}>
                      <span className="market-sync-grid-date">
                        {date.slice(5)}
                      </span>
                    </Tooltip>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <th scope="row" className="market-sync-grid-rowhead">
                  {period}
                </th>
                {matrixDays.map((date) => {
                  const state = stateOf(date, period)
                  const rows = calendars[date]?.rows[period]
                  const active =
                    selected.date === date && selected.period === period
                  const syncing = syncingCell === `${date}|${period}`
                  const label = labelOf(date, period, state)

                  // 休市不是可执行动作: 用纯文本而不是禁用按钮,
                  // 避免"看起来能点但点不了"以及禁用控件不可聚焦的问题。
                  if (state === 'off') {
                    return (
                      <td key={date}>
                        <span className="market-sync-cell is-off" title={label}>
                          {/*
                            视觉上只放「休」, 对读屏给出「日期 时段 休市」完整口径;
                            aria-label 不能挂在无 role 的 span 上(biome a11y 规则),
                            因此用项目通用的 .aries-sr-only 承载这句完整描述。
                          */}
                          <span className="aries-sr-only">{label}</span>
                          <span aria-hidden="true">
                            {t('marketSync.weekend')}
                          </span>
                        </span>
                      </td>
                    )
                  }

                  const classes = [
                    'market-sync-cell',
                    `is-${state}`,
                    active ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <td key={date}>
                      <button
                        type="button"
                        className={classes}
                        // 每个日期×时段的可访问名都不同; 否则读屏只会听到一串「缺」
                        aria-label={label}
                        aria-busy={syncing || undefined}
                        title={label}
                        onClick={() =>
                          state === 'missing'
                            ? onSyncDate(date, period)
                            : onSelectQuote(date, period)
                        }
                      >
                        {syncing ? (
                          <span aria-hidden="true">…</span>
                        ) : state === 'synced' ? (
                          <Text strong={false} style={{ fontSize: 10 }}>
                            {rows ?? '✓'}
                          </Text>
                        ) : (
                          t('marketSync.syncMissing')
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
