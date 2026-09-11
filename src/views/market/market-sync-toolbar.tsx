import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  InputNumber,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

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
  singleDate,
  syncing,
}: {
  backfillDays: number
  backfilling: boolean
  calendarFetching: boolean
  onBackfill: () => void
  onBackfillDaysChange: (days: number) => void
  onRefreshCalendar: () => void
  onSingleDateChange: (date: string) => void
  onSync: () => void
  singleDate: string
  syncing: boolean
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
