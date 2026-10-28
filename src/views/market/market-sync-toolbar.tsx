import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Checkbox, DatePicker, Select, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveQuoteRegions } from '@/constants/quote-regions'
import { DATE_PICKER_FORMATS } from '@/utils/formatters'
import { MATRIX_DAYS, PERIODS } from './market-sync-model'

const { Text } = Typography

/**
 * 页首：标题 + 口径说明 + **数据源上下文**。
 *
 * <p>数据源/地区回答的是"整页看的是哪家的行情"，属于上下文而不是一次动作，所以从操作条
 * 移到页首右侧；操作条里只留真正会写数据的动作（单日同步 / 区间补数），主次一眼可分。</p>
 */
export function MarketSyncHeader({
  calendarFetching,
  onRefreshCalendar,
  onRegionChange,
  onSourceChange,
  quoteRegions,
  region,
  source,
}: {
  calendarFetching: boolean
  onRefreshCalendar: () => void
  onRegionChange: (region: string | undefined) => void
  onSourceChange: (source: 'MYSTEEL' | 'STEELX') => void
  /** 取价地区选项: 来自后端 runtime-config 的 business.quoteRegions。 */
  quoteRegions?: string[]
  region?: string
  source: 'MYSTEEL' | 'STEELX'
}) {
  const { t } = useTranslation()
  const quoteRegionOptions = useMemo(
    () =>
      resolveQuoteRegions(quoteRegions).map((city) => ({
        value: city,
        label: city,
      })),
    [quoteRegions],
  )

  return (
    <header className="market-sync-head">
      <div className="market-sync-head-main">
        <div className="market-sync-head-title">
          <h1>{t('marketSync.title')}</h1>
          <span className="market-sync-chip">
            {t('marketSync.windowChip', { days: MATRIX_DAYS })}
          </span>
        </div>
        <span className="market-sync-desc">{t('marketSync.desc')}</span>
      </div>

      <div className="market-sync-head-actions">
        <span className="market-sync-head-label">
          {t('marketSync.dataSource')}
        </span>
        <Select
          size="small"
          className="market-sync-source-select"
          value={source}
          options={[
            { value: 'MYSTEEL', label: 'Mysteel' },
            { value: 'STEELX', label: '西本新干线' },
          ]}
          onChange={(value) => onSourceChange(value)}
        />
        {source === 'STEELX' ? (
          <Select
            size="small"
            className="market-sync-region-select"
            value={region}
            placeholder={t('marketSync.region')}
            options={quoteRegionOptions}
            onChange={onRegionChange}
            allowClear
            showSearch
          />
        ) : null}
        <Tooltip title={t('marketSync.refreshCalendar')}>
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            loading={calendarFetching}
            // 图标按钮没有可见文字: 必须给可访问名, 否则读屏只念「按钮」
            aria-label={t('marketSync.refreshCalendar')}
            onClick={onRefreshCalendar}
          />
        </Tooltip>
      </div>
    </header>
  )
}

/** 区间补数可选的窗口天数（与后端 max=60 对齐）。 */
const BACKFILL_DAY_OPTIONS = [7, 15, 30, 60] as const

/**
 * 动作区：**两组、各自独立**。
 *
 * <p>重做前 7 个控件平铺一行：数据源、单日日期、时段、同步、天数、补数、补缺失 ——
 * 输入与动作混在一起，用户要自己配对；而且「补数」与「补缺失」调的是同一个接口
 * （后端本来就会跳过已入库的日期），等于同一个动作出现两次。现在：</p>
 * <ul>
 *   <li>左：单日同步（日期 + 时段 + 主按钮），是主操作，用 primary 突出；</li>
 *   <li>右：区间补数（窗口 + 一个按钮），是维护操作，用默认按钮；</li>
 *   <li>数据源/地区上移到页首（见 {@link MarketSyncHeader}）。</li>
 * </ul>
 */
export function MarketSyncToolbar({
  backfillDays,
  backfilling,
  onBackfill,
  onBackfillDaysChange,
  onSingleDateChange,
  onSync,
  onSyncPeriodsChange,
  singleDate,
  syncPeriods,
  syncing,
  source,
}: {
  backfillDays: number
  backfilling: boolean
  onBackfill: () => void
  onBackfillDaysChange: (days: number) => void
  onSingleDateChange: (date: string) => void
  onSync: () => void
  onSyncPeriodsChange: (periods: string[]) => void
  singleDate: string
  syncPeriods: string[]
  syncing: boolean
  source: 'MYSTEEL' | 'STEELX'
}) {
  const { t } = useTranslation()

  return (
    <div className="market-sync-actions">
      {/*
        两行「标签 + 控件 + 动作」而不是左右两栏：
        左栏右栏各占半屏时，两侧控件的基线差半行、中间留一条空档，读起来像两个无关的表单。
        改成同构的两行后，日期/范围控件、按钮竖着对齐，一眼能看出这是"同一页的两种同步方式"。
      */}
      <section className="market-sync-action is-primary">
        <div className="market-sync-action-head">
          <span className="market-sync-action-title">
            {t('marketSync.barGroupDay')}
          </span>
          <span className="market-sync-action-hint">
            {t('marketSync.dayHint')}
          </span>
        </div>
        <div className="market-sync-action-body">
          <div className="market-sync-field">
            <span className="market-sync-field-label">
              {t('marketSync.dateLabel')}
            </span>
            <DatePicker
              className="market-sync-date"
              value={singleDate ? dayjs(singleDate) : null}
              format={DATE_PICKER_FORMATS}
              allowClear={false}
              onChange={(value) =>
                value && onSingleDateChange(value.format('YYYY-MM-DD'))
              }
            />
          </div>
          {source === 'STEELX' ? null : (
            <div className="market-sync-field">
              <span className="market-sync-field-label">
                {t('marketSync.period')}
              </span>
              {/*
                时段只有三个, 用复选框平铺比多选下拉更好:
                下拉会挤成「上午 × + 2 …」, 看不清到底选了哪几个, 还要点开才知道有哪几个选项。
              */}
              <Checkbox.Group
                className="market-sync-periods"
                value={syncPeriods}
                options={[...PERIODS]}
                onChange={(values) => onSyncPeriodsChange(values)}
              />
            </div>
          )}
        </div>
        <Button
          className="market-sync-action-submit"
          type="primary"
          icon={<SyncOutlined />}
          loading={syncing}
          onClick={onSync}
        >
          {t('marketSync.sync')}
        </Button>
      </section>

      <section className="market-sync-action">
        <div className="market-sync-action-head">
          <span className="market-sync-action-title">
            {t('marketSync.barGroupBackfill')}
          </span>
          <span className="market-sync-action-hint">
            {t('marketSync.backfillHint')}
          </span>
        </div>
        <div className="market-sync-action-body">
          <div className="market-sync-field">
            <span className="market-sync-field-label">
              {t('marketSync.rangeLabel')}
            </span>
            <Select
              className="market-sync-days"
              value={backfillDays}
              options={BACKFILL_DAY_OPTIONS.map((days) => ({
                value: days,
                label: t('marketSync.daysOption', { days }),
              }))}
              onChange={(value) => onBackfillDaysChange(value)}
            />
          </div>
          <Text type="secondary" className="market-sync-action-footnote">
            {t('marketSync.backfillFootnote')}
          </Text>
        </div>
        <Tooltip title={t('marketSync.backfillMissingHint')}>
          <Button
            className="market-sync-action-submit"
            icon={<SyncOutlined />}
            loading={backfilling}
            onClick={onBackfill}
          >
            {t('marketSync.backfillMissing')}
          </Button>
        </Tooltip>
      </section>
    </div>
  )
}
