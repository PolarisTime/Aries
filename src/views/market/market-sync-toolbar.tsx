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
import { PERIODS } from './market-sync-model'

const { Text } = Typography

/** 西本支持的地区(与后端 steelx-quote.regions 一致)。 */
const QUOTE_REGIONS = ['杭州', '上海', '宁波', '嘉兴', '绍兴']

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
}) {
  return (
    <div className="price-compare-head">
      <div>
        <h1>行情同步</h1>
        <span className="price-compare-desc">
          近 30 天覆盖监控；缺时段高亮；点击单元格查看该时段明细
        </span>
      </div>
      <Space wrap size={8}>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            数据源
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
              placeholder="地区"
              options={QUOTE_REGIONS.map((item) => ({
                value: item,
                label: item,
              }))}
              onChange={onRegionChange}
              allowClear
            />
          ) : null}
        </Space>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            单日
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
              placeholder="全部时段"
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
            同步
          </Button>
        </Space>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            补数
          </Text>
          <InputNumber
            size="small"
            min={1}
            max={60}
            style={{ width: 70 }}
            value={backfillDays}
            onChange={(value) => onBackfillDaysChange(value ?? 30)}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            天
          </Text>
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={backfilling}
            onClick={onBackfill}
          >
            补数
          </Button>
          <Tooltip title="只补最近30天缺失的文章(已入库的会跳过)">
            <Button
              size="small"
              icon={<SyncOutlined />}
              loading={backfilling}
              onClick={onBackfill}
            >
              补缺失
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
