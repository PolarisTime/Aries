import { Card, Empty, Switch, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/utils/formatters'
import {
  type CalendarMap,
  isWeekend,
  MATRIX_DAYS,
  type MatrixCellState,
  matrixCellState,
  PERIODS,
  today,
} from './market-sync-model'

/** 一段窗口覆盖的天数；翻页按钮文案里要用到。 */
const DAYS_PER_WINDOW = MATRIX_DAYS

const { Text } = Typography

/** 图例: 颜色不是唯一的信息载体, 每一项都有文字标签。 */
function MarketSyncLegend() {
  const { t } = useTranslation()
  const items: Array<{ state: MatrixCellState; label: string }> = [
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
 * 周起点（周一）与"周序号"：两者共同提供按周分组的视觉锚点。
 *
 * <p>交替周底色比"每列一条竖线"更稳：矩阵列间距只有 3px，竖线会被 spacing 吃掉、
 * 在浅色主题下几乎看不见；而表头按周交替底色 + 周一左侧描边，扫读时能立刻看出"哪一周"。</p>
 */
const isWeekStart = (date: string) => dayjs(date).day() === 1

/** 距最早一列的周序号（0 起），用于交替底色。 */
const weekIndexOf = (date: string, base: string) =>
  Math.floor(dayjs(date).diff(dayjs(base), 'day') / 7)

/**
 * 覆盖矩阵: 「时段 × 日期」转置(3 行 × 30 天)。
 *
 * <p><b>这一版改了什么</b>（相对上一版"能用但不顺手"）：</p>
 * <ol>
 *   <li><b>日期改为左旧 → 右新</b>：时间从左到右递增才符合直觉；上一版从新到旧，
 *       "上周三在哪"要反着数。默认滚到最右（最新），窄屏时先看到今天。</li>
 *   <li><b>按周分隔 + 今天高亮</b>：周一列加左侧分隔线，今天列加顶部标记，扫读有锚点。</li>
 *   <li><b>行尾补"缺口"汇总列</b>：每行一个 `缺失 n / 已同步 m`，不用自己数格子。</li>
 *   <li><b>「只看缺失」开关</b>：缺口多时只留有缺口的日期列，一屏看完所有待补日期。</li>
 *   <li>格子从 24px 提到 32px，价格数字看得清（命中区本来就 ≥24，这里只是不再"挤"）。</li>
 * </ol>
 *
 * <p>判据全部沿用 {@link isTradingDay}: 先按周末判"休市"会把调休上班的周六日（有行情）
 * 显示成休市，该格既不可点也看不到已同步状态 —— 覆盖矩阵与覆盖统计必须同一口径。</p>
 */
export function MarketSyncMatrix({
  calendars,
  matrixDays,
  onNextWindow,
  onPrevWindow,
  onSelectQuote,
  onSyncDate,
  selected,
  syncingCell,
  windowCanNext,
  windowCanPrev,
  windowIsLatest,
  windowRange,
  periods = PERIODS,
}: {
  calendars: CalendarMap
  matrixDays: string[]
  onNextWindow: () => void
  onPrevWindow: () => void
  onSelectQuote: (date: string, period: string) => void
  onSyncDate: (date: string, period?: string) => void
  selected: { date: string; period: string }
  syncingCell: string | null
  windowCanNext: boolean
  windowCanPrev: boolean
  windowIsLatest: boolean
  /** 当前窗口首尾（首 = 最早, 尾 = 最新）；翻页标签与卡片范围文案共用。 */
  windowRange: { from: string; to: string }
  /** 矩阵展示的时段; 西本仅「上午」。 */
  periods?: readonly string[]
}) {
  const { t } = useTranslation()
  const todayDate = today()
  const [onlyMissing, setOnlyMissing] = useState(false)
  const gridWrapRef = useRef<HTMLDivElement>(null)

  /** 单个格子状态: 口径统一在 {@link matrixCellState}（矩阵、汇总、缺口清单共用）。 */
  const stateOf = (date: string, period: string) =>
    matrixCellState(date, period, calendars)

  /**
   * 展示用日期：升序（左旧右新）；开了「只看缺失」就只留至少有一个缺失的列。
   * 只有 30 天 × 3 个时段，直接算即可（不做 useMemo，避免把日历对象塞进依赖后
   * 每次刷新日历都重算一遍假记忆）。
   */
  const ascendingDays = [...matrixDays].sort()
  const days = onlyMissing
    ? ascendingDays.filter((date) =>
        periods.some((period) => stateOf(date, period) === 'missing'),
      )
    : ascendingDays

  const labelOf = (date: string, period: string, state: MatrixCellState) => {
    // 读屏文案与 Tooltip 用完整中文日期(月/日补零); 表头格子仍用紧凑的 MM-DD 以免撑爆矩阵列宽。
    const shownDate = formatDate(date)
    if (state === 'off')
      return t('marketSync.matrixCellOff', { date: shownDate, period })
    if (state === 'synced') {
      return t('marketSync.matrixCellSynced', {
        date: shownDate,
        period,
        rows: calendars[date]?.rows[period] ?? 0,
      })
    }
    return t('marketSync.matrixCellMissing', { date: shownDate, period })
  }

  /** 某时段的缺口统计: 缺失数 / 交易日数。汇总列与行内提示共用这一处口径。 */
  const summaryOf = (period: string) => {
    let missing = 0
    let total = 0
    for (const date of days) {
      const state = stateOf(date, period)
      if (state === 'off') continue
      total += 1
      if (state === 'missing') missing += 1
    }
    return { missing, total }
  }

  /*
   * 翻页后把视图对齐到"最新一端"（右侧）：日期升序，最新在最右。
   * 用「key 换窗口 + ref 回调里对齐」而不是 effect —— effect 会在数据到达后重跑，
   * 反而把用户手动滚到的位置拽回去；切换「只看缺失」时不应打断横向滚动，所以 key 只跟窗口走。
   */
  const windowKey = `${windowRange.from}|${windowRange.to}`

  const attachGridWrap = (element: HTMLDivElement | null) => {
    gridWrapRef.current = element
    if (element) element.scrollLeft = element.scrollWidth
  }

  return (
    <Card
      size="small"
      className="market-sync-matrix-card"
      title={
        <div className="market-sync-matrix-head">
          <span className="market-sync-matrix-title">
            {t('marketSync.matrixTitle')}
          </span>
          <div className="market-sync-pager">
            <Tooltip title={t('marketSync.windowPrevHint')}>
              <button
                type="button"
                className="market-sync-pager-button"
                aria-label={t('marketSync.windowPrev', {
                  days: DAYS_PER_WINDOW,
                })}
                disabled={!windowCanPrev}
                onClick={onPrevWindow}
              >
                ‹ {t('marketSync.windowPrev', { days: DAYS_PER_WINDOW })}
              </button>
            </Tooltip>
            <span className="market-sync-matrix-range">
              {t('marketSync.windowRangeLabel', {
                from: windowRange.from.slice(5),
                to: windowRange.to.slice(5),
              })}
            </span>
            <Tooltip title={t('marketSync.windowNextHint')}>
              <button
                type="button"
                className="market-sync-pager-button"
                aria-label={t('marketSync.windowNext', {
                  days: DAYS_PER_WINDOW,
                })}
                disabled={!windowCanNext}
                onClick={onNextWindow}
              >
                {t('marketSync.windowNext', { days: DAYS_PER_WINDOW })} ›
              </button>
            </Tooltip>
            {windowIsLatest ? null : (
              <span className="market-sync-pager-tag">
                {t('marketSync.windowPast')}
              </span>
            )}
          </div>
        </div>
      }
      extra={
        <div className="market-sync-matrix-tools">
          <MarketSyncLegend />
          <span className="market-sync-matrix-filter">
            <Switch
              size="small"
              aria-label={t('marketSync.matrixOnlyMissing')}
              checked={onlyMissing}
              onChange={setOnlyMissing}
            />
            <span>{t('marketSync.matrixOnlyMissing')}</span>
          </span>
        </div>
      }
    >
      {days.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('marketSync.matrixNoMissingToday')}
        />
      ) : (
        <div
          key={windowKey}
          className="market-sync-grid-wrap"
          ref={attachGridWrap}
        >
          <table
            className="market-sync-grid"
            aria-label={t('marketSync.matrixTitle')}
          >
            <thead>
              <tr>
                <th scope="col" className="market-sync-grid-rowhead">
                  {t('marketSync.period')}
                </th>
                {days.map((date) => {
                  const weekend = isWeekend(date)
                  const classes = [
                    weekend ? 'is-weekend' : '',
                    date === todayDate ? 'is-today' : '',
                    isWeekStart(date) ? 'is-week-start' : '',
                    weekIndexOf(date, days[0]) % 2 === 1 ? 'is-alt-week' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <th key={date} scope="col" className={classes}>
                      <Tooltip title={formatDate(date)}>
                        <span className="market-sync-grid-date">
                          {date.slice(5)}
                        </span>
                      </Tooltip>
                      {date === todayDate ? (
                        <span className="market-sync-grid-today">
                          {t('marketSync.matrixTodayTag')}
                        </span>
                      ) : null}
                    </th>
                  )
                })}
                <th scope="col" className="market-sync-grid-summaryhead">
                  {t('marketSync.matrixSummaryHead')}
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const summary = summaryOf(period)
                return (
                  <tr key={period}>
                    <th scope="row" className="market-sync-grid-rowhead">
                      {period}
                    </th>
                    {days.map((date) => {
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
                            <span
                              className="market-sync-cell is-off"
                              title={label}
                            >
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
                              <Text strong={false} style={{ fontSize: 11 }}>
                                {rows ?? '✓'}
                              </Text>
                            ) : (
                              t('marketSync.syncMissing')
                            )}
                          </button>
                        </td>
                      )
                    })}
                    <td className="market-sync-grid-summary">
                      {summary.missing === 0 ? (
                        <span className="is-full">
                          {t('marketSync.matrixSummaryFull')}
                        </span>
                      ) : (
                        <span className="is-gap">
                          {t('marketSync.matrixSummaryGap', {
                            missing: summary.missing,
                            total: summary.total,
                          })}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
