import { ReloadOutlined } from '@ant-design/icons'
import { Button, DatePicker, Input, Select, Tooltip, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'

export interface SelectOption {
  value: string
  label: string
}

interface BalancesFiltersProps {
  keywordInput: string
  onKeywordInputChange: (value: string) => void
  onKeywordCommit: (value: string) => void
  warehouseId?: string
  warehouseOptions: SelectOption[]
  warehousesLoading: boolean
  onWarehouseChange: (value?: string) => void
  onReset: () => void
  onRefresh: () => void
  refreshing: boolean
}

export function InventoryBalancesFilters({
  keywordInput,
  onKeywordInputChange,
  onKeywordCommit,
  warehouseId,
  warehouseOptions,
  warehousesLoading,
  onWarehouseChange,
  onReset,
  onRefresh,
  refreshing,
}: BalancesFiltersProps) {
  const { t } = useTranslation()

  return (
    <section className="finance-filter-shell">
      <div className="finance-filter-primary-row inventory-filter-row">
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('inventory.filters.keyword')}
          </Typography.Text>
          <Input
            aria-label={t('inventory.filters.keyword')}
            value={keywordInput}
            allowClear
            placeholder={t('inventory.filters.balanceKeywordPlaceholder')}
            onChange={(event) => onKeywordInputChange(event.target.value)}
            onBlur={(event) => onKeywordCommit(event.target.value)}
            onPressEnter={(event) => onKeywordCommit(event.currentTarget.value)}
          />
        </div>
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('inventory.filters.warehouse')}
          </Typography.Text>
          <Select
            aria-label={t('inventory.filters.warehouse')}
            value={warehouseId}
            options={warehouseOptions}
            loading={warehousesLoading}
            showSearch={{ optionFilterProp: 'label' }}
            allowClear
            placeholder={t('inventory.filters.warehousePlaceholder')}
            onChange={(value) =>
              onWarehouseChange(value ? String(value) : undefined)
            }
          />
        </div>
        <FilterActions
          onReset={onReset}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      </div>
    </section>
  )
}

interface TransactionsFiltersProps {
  keywordInput: string
  onKeywordInputChange: (value: string) => void
  onKeywordCommit: (value: string) => void
  warehouseId?: string
  warehouseOptions: SelectOption[]
  warehousesLoading: boolean
  onWarehouseChange: (value?: string) => void
  transactionType?: string
  transactionTypeOptions: SelectOption[]
  onTransactionTypeChange: (value?: string) => void
  startDate?: string
  endDate?: string
  onDateRangeChange: (start?: string, end?: string) => void
  onReset: () => void
  onRefresh: () => void
  refreshing: boolean
}

export function InventoryTransactionsFilters({
  keywordInput,
  onKeywordInputChange,
  onKeywordCommit,
  warehouseId,
  warehouseOptions,
  warehousesLoading,
  onWarehouseChange,
  transactionType,
  transactionTypeOptions,
  onTransactionTypeChange,
  startDate,
  endDate,
  onDateRangeChange,
  onReset,
  onRefresh,
  refreshing,
}: TransactionsFiltersProps) {
  const { t } = useTranslation()
  const dateRangeValue: [Dayjs, Dayjs] | null =
    startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null

  return (
    <section className="finance-filter-shell">
      <div className="finance-filter-primary-row inventory-filter-row">
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('inventory.filters.keyword')}
          </Typography.Text>
          <Input
            aria-label={t('inventory.filters.keyword')}
            value={keywordInput}
            allowClear
            placeholder={t('inventory.filters.transactionKeywordPlaceholder')}
            onChange={(event) => onKeywordInputChange(event.target.value)}
            onBlur={(event) => onKeywordCommit(event.target.value)}
            onPressEnter={(event) => onKeywordCommit(event.currentTarget.value)}
          />
        </div>
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('inventory.filters.warehouse')}
          </Typography.Text>
          <Select
            aria-label={t('inventory.filters.warehouse')}
            value={warehouseId}
            options={warehouseOptions}
            loading={warehousesLoading}
            showSearch={{ optionFilterProp: 'label' }}
            allowClear
            placeholder={t('inventory.filters.warehousePlaceholder')}
            onChange={(value) =>
              onWarehouseChange(value ? String(value) : undefined)
            }
          />
        </div>
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('inventory.filters.transactionType')}
          </Typography.Text>
          <Select
            aria-label={t('inventory.filters.transactionType')}
            value={transactionType}
            options={transactionTypeOptions}
            allowClear
            placeholder={t('inventory.filters.transactionTypePlaceholder')}
            onChange={(value) => onTransactionTypeChange(value)}
          />
        </div>
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('inventory.filters.occurredAt')}
          </Typography.Text>
          <DatePicker.RangePicker
            aria-label={t('inventory.filters.occurredAt')}
            value={dateRangeValue}
            format={DISPLAY_DATE_FORMAT}
            onChange={(dates) =>
              onDateRangeChange(
                dates?.[0]?.format('YYYY-MM-DD'),
                dates?.[1]?.format('YYYY-MM-DD'),
              )
            }
          />
        </div>
        <FilterActions
          onReset={onReset}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      </div>
    </section>
  )
}

function FilterActions({
  onReset,
  onRefresh,
  refreshing,
}: {
  onReset: () => void
  onRefresh: () => void
  refreshing: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="finance-filter-actions">
      <Button onClick={onReset}>{t('common.reset')}</Button>
      <Tooltip title={t('common.refresh')}>
        <span>
          <Button
            aria-label={t('inventory.refreshAria')}
            icon={<ReloadOutlined />}
            loading={refreshing}
            disabled={refreshing}
            onClick={onRefresh}
          />
        </span>
      </Tooltip>
    </div>
  )
}
