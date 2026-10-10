import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  InputNumber,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveQuoteRegions } from '@/constants/quote-regions'
import { PERIODS } from './market-sync-model'

const { Text } = Typography

/** 页首: 标题 + 说明 + 只依赖全局状态的次级动作(刷新日历)。 */
export function MarketSyncHeader({
  calendarFetching,
  onRefreshCalendar,
}: {
  calendarFetching: boolean
  onRefreshCalendar: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="market-sync-head">
      <div>
        <h1>{t('marketSync.title')}</h1>
        <span className="market-sync-desc">{t('marketSync.desc')}</span>
      </div>
      <Space size={8}>
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
      </Space>
    </div>
  )
}

/**
 * 操作条: 按语义分组, 每组「输入 + 该输入对应的动作」放在一起。
 * 原实现把 11 个控件平铺成两行, 动作与输入混在一起难以对应。
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
  onSourceChange,
  region,
  onRegionChange,
  quoteRegions,
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
  onSourceChange: (source: 'MYSTEEL' | 'STEELX') => void
  region?: string
  onRegionChange: (region: string | undefined) => void
  /** 取价地区选项: 来自后端 runtime-config 的 business.quoteRegions。 */
  quoteRegions?: string[]
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
  const labelStyle = { fontSize: 'var(--font-size-xs)' }

  return (
    <div className="market-sync-bar">
      <div className="market-sync-bar-group">
        <span className="market-sync-bar-label">
          {t('marketSync.barGroupSource')}
        </span>
        <Select
          size="small"
          style={{ width: 130 }}
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
            style={{ width: 110 }}
            value={region}
            placeholder={t('marketSync.region')}
            options={quoteRegionOptions}
            onChange={onRegionChange}
            allowClear
            showSearch
          />
        ) : null}
      </div>

      <div className="market-sync-bar-group">
        <span className="market-sync-bar-label">
          {t('marketSync.barGroupDay')}
        </span>
        <DatePicker
          size="small"
          style={{ width: 130 }}
          value={singleDate ? dayjs(singleDate) : null}
          format="YYYY-MM-DD"
          allowClear={false}
          onChange={(value) =>
            value && onSingleDateChange(value.format('YYYY-MM-DD'))
          }
        />
        {source === 'STEELX' ? null : (
          <Select
            size="small"
            mode="multiple"
            maxTagCount="responsive"
            style={{ minWidth: 150 }}
            value={syncPeriods}
            placeholder={t('marketSync.allPeriods')}
            allowClear
            options={PERIODS.map((period) => ({
              value: period,
              label: period,
            }))}
            onChange={onSyncPeriodsChange}
          />
        )}
        <Button
          size="small"
          type="primary"
          icon={<SyncOutlined />}
          loading={syncing}
          onClick={onSync}
        >
          {t('marketSync.sync')}
        </Button>
      </div>

      <div className="market-sync-bar-group">
        <span className="market-sync-bar-label">
          {t('marketSync.barGroupBackfill')}
        </span>
        <InputNumber
          size="small"
          min={1}
          max={60}
          style={{ width: 72 }}
          value={backfillDays}
          onChange={(value) => onBackfillDaysChange(value ?? 30)}
        />
        <Text type="secondary" style={labelStyle}>
          {t('marketSync.days')}
        </Text>
        <Button
          size="small"
          icon={<SyncOutlined />}
          loading={backfilling}
          onClick={onBackfill}
        >
          {t('marketSync.backfill')}
        </Button>
        <Tooltip title={t('marketSync.backfillMissingHint')}>
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={backfilling}
            onClick={onBackfill}
          >
            {t('marketSync.backfillMissing')}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
