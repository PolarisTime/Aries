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

export function MarketSyncToolbar({
  backfillDays,
  backfilling,
  calendarFetching,
  onBackfill,
  onBackfillDaysChange,
  onRefreshCalendar,
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
  calendarFetching: boolean
  onBackfill: () => void
  onBackfillDaysChange: (days: number) => void
  onRefreshCalendar: () => void
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
  return (
    <div className="price-compare-head">
      <div>
        <h1>{t('marketSync.title')}</h1>
        <span className="price-compare-desc">{t('marketSync.desc')}</span>
      </div>
      <Space wrap size={8}>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('marketSync.dataSource')}
          </Text>
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
              style={{ width: 100 }}
              value={region}
              placeholder={t('marketSync.region')}
              options={quoteRegionOptions}
              onChange={onRegionChange}
              allowClear
            />
          ) : null}
        </Space>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('marketSync.singleDay')}
          </Text>
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
              style={{ minWidth: 140 }}
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
        </Space>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('marketSync.backfill')}
          </Text>
          <InputNumber
            size="small"
            min={1}
            max={60}
            style={{ width: 70 }}
            value={backfillDays}
            onChange={(value) => onBackfillDaysChange(value ?? 30)}
          />
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
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
        </Space>
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined />}
          loading={calendarFetching}
          onClick={onRefreshCalendar}
        />
      </Space>
    </div>
  )
}
