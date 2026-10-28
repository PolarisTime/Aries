import { SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Flex, Input, Segmented, Select } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { OperationLogFilters as OperationLogFilterValues } from '@/api/system/operation-logs'
import {
  operationLogModuleOptions,
  resolveOperationLogActionOptions,
} from '@/config/business-pages/system/operation-log-options'

export type QuickFilterKey = 'all' | 'failed' | 'today' | 'mine'

type Props = {
  value: OperationLogFilterValues
  quick: QuickFilterKey
  loading?: boolean
  onChange: (patch: Partial<OperationLogFilterValues>) => void
  onQuickChange: (quick: QuickFilterKey) => void
  onSearch: () => void
  onReset: () => void
}

/** 筛选栏：关键词/操作人/单据号 + 模块/动作/结果/类别/日期 + 快捷筛选。 */
export function OperationLogFilters({
  value,
  quick,
  loading,
  onChange,
  onQuickChange,
  onSearch,
  onReset,
}: Props) {
  const { t } = useTranslation()
  const actionOptions = resolveOperationLogActionOptions({
    moduleName: value.moduleName,
  })
  const dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null =
    value.startTime && value.endTime
      ? [dayjs(value.startTime), dayjs(value.endTime)]
      : null

  return (
    <Card className="oplog-filters" size="small">
      <Flex align="center" gap={8} justify="space-between" wrap>
        <Flex align="center" className="oplog-filter-row" gap={8} wrap>
          <Input
            allowClear
            aria-label={t('modules.pages.operationLog.keyword')}
            className="oplog-filter-keyword"
            placeholder={t(
              'modules.pages.operationLog.operationLogPlaceholder',
            )}
            prefix={<SearchOutlined />}
            value={value.keyword ?? ''}
            onChange={(event) => onChange({ keyword: event.target.value })}
            onPressEnter={onSearch}
          />
          <Input
            allowClear
            aria-label={t('modules.pages.operationLog.operatorFilter')}
            className="oplog-filter-input"
            placeholder={t('modules.pages.operationLog.operatorFilter')}
            value={value.operatorName ?? ''}
            onChange={(event) => onChange({ operatorName: event.target.value })}
            onPressEnter={onSearch}
          />
          <Input
            allowClear
            aria-label={t('modules.pages.operationLog.businessNoFilter')}
            className="oplog-filter-input"
            placeholder={t('modules.pages.operationLog.businessNoFilter')}
            value={value.businessNo ?? ''}
            onChange={(event) => onChange({ businessNo: event.target.value })}
            onPressEnter={onSearch}
          />
          <Select
            allowClear
            aria-label={t('modules.pages.operationLog.module')}
            className="oplog-filter-select"
            options={operationLogModuleOptions}
            placeholder={t('modules.pages.operationLog.module')}
            showSearch={{ optionFilterProp: 'label' }}
            value={value.moduleName}
            onChange={(moduleName?: string) =>
              onChange({ moduleName, actionType: undefined })
            }
          />
          <Select
            allowClear
            aria-label={t('modules.pages.operationLog.action')}
            className="oplog-filter-select oplog-filter-select--narrow"
            options={actionOptions}
            placeholder={t('modules.pages.operationLog.action')}
            value={value.actionType}
            onChange={(actionType?: string) => onChange({ actionType })}
          />
          <Select
            allowClear
            aria-label={t('modules.pages.operationLog.result')}
            className="oplog-filter-select oplog-filter-select--narrow"
            options={[
              { label: t('modules.pages.operationLog.success'), value: '成功' },
              { label: t('modules.pages.operationLog.failed'), value: '失败' },
            ]}
            placeholder={t('modules.pages.operationLog.result')}
            value={value.resultStatus}
            onChange={(resultStatus?: string) => onChange({ resultStatus })}
          />
          <Select
            allowClear
            aria-label={t('modules.pages.operationLog.categoryFilter')}
            className="oplog-filter-select oplog-filter-select--narrow"
            options={[
              {
                label: t('modules.pages.operationLog.categoryBusiness'),
                value: 'BUSINESS',
              },
              {
                label: t('modules.pages.operationLog.categorySession'),
                value: 'SESSION',
              },
              {
                label: t('modules.pages.operationLog.categorySystem'),
                value: 'SYSTEM',
              },
            ]}
            placeholder={t('modules.pages.operationLog.categoryFilter')}
            value={value.category}
            onChange={(category?: string) => onChange({ category })}
          />
          <DatePicker.RangePicker
            allowClear
            aria-label={t('modules.pages.operationLog.operationTime')}
            value={dateRange}
            onChange={(range) =>
              onChange({
                startTime: range?.[0]?.format('YYYY-MM-DD'),
                endTime: range?.[1]?.format('YYYY-MM-DD'),
              })
            }
          />
          <Button loading={loading} type="primary" onClick={onSearch}>
            {t('common.search')}
          </Button>
          <Button onClick={onReset}>{t('common.reset')}</Button>
        </Flex>

        <Segmented<QuickFilterKey>
          options={[
            { label: t('modules.pages.operationLog.quickAll'), value: 'all' },
            {
              label: t('modules.pages.operationLog.quickFailed'),
              value: 'failed',
            },
            {
              label: t('modules.pages.operationLog.quickToday'),
              value: 'today',
            },
            { label: t('modules.pages.operationLog.quickMine'), value: 'mine' },
          ]}
          value={quick}
          onChange={onQuickChange}
        />
      </Flex>
    </Card>
  )
}
