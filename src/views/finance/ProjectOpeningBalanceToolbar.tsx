import { Button, Card, DatePicker, Input, Select, Space, Statistic } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import type {
  ProjectOpeningBalanceStatus,
  ProjectOpeningBalanceSummary,
  ProjectOpeningBalanceType,
} from '@/api/finance/project-opening-balances'
import { DATE_PICKER_FORMATS } from '@/utils/formatters'

interface SelectOptionItem {
  label: string
  value: string
}

interface Props {
  projectSelectOptions: SelectOptionItem[]
  customerSelectOptions: SelectOptionItem[]
  settlementCompanies: Array<{ label: string; value: string | number }>
  projectsLoading: boolean
  customersLoading: boolean
  companiesLoading: boolean
  filterProjectId?: string
  filterCustomerId?: string
  filterCompanyId?: string
  filterBalanceType?: ProjectOpeningBalanceType
  filterStatus?: ProjectOpeningBalanceStatus
  cutoffRange: [Dayjs | null, Dayjs | null] | null
  keyword: string
  summary?: ProjectOpeningBalanceSummary
  onProjectChange: (value: string | undefined) => void
  onCustomerChange: (value: string | undefined) => void
  onCompanyChange: (value: string | undefined) => void
  onBalanceTypeChange: (value: ProjectOpeningBalanceType | undefined) => void
  onStatusChange: (value: ProjectOpeningBalanceStatus | undefined) => void
  onCutoffRangeChange: (value: [Dayjs | null, Dayjs | null] | null) => void
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onReset: () => void
}

export function ProjectOpeningBalanceToolbar({
  projectSelectOptions,
  customerSelectOptions,
  settlementCompanies,
  projectsLoading,
  customersLoading,
  companiesLoading,
  filterProjectId,
  filterCustomerId,
  filterCompanyId,
  filterBalanceType,
  filterStatus,
  cutoffRange,
  keyword,
  summary,
  onProjectChange,
  onCustomerChange,
  onCompanyChange,
  onBalanceTypeChange,
  onStatusChange,
  onCutoffRangeChange,
  onKeywordChange,
  onSearch,
  onReset,
}: Props) {
  const { t } = useTranslation()

  return (
    <>
      <section className="finance-filter-shell">
        <Space wrap size={[12, 8]}>
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 220 }}
            placeholder={t('openingBalance.filterProject')}
            aria-label={t('openingBalance.filterProject')}
            value={filterProjectId}
            loading={projectsLoading}
            options={projectSelectOptions}
            onChange={(value) => onProjectChange(value || undefined)}
          />
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 180 }}
            placeholder={t('openingBalance.filterCustomer')}
            aria-label={t('openingBalance.filterCustomer')}
            value={filterCustomerId}
            loading={customersLoading}
            options={customerSelectOptions}
            onChange={(value) => onCustomerChange(value || undefined)}
          />
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 180 }}
            placeholder={t('openingBalance.settlementCompany')}
            aria-label={t('openingBalance.settlementCompany')}
            value={filterCompanyId}
            loading={companiesLoading}
            options={settlementCompanies}
            onChange={(value) =>
              onCompanyChange(value ? String(value) : undefined)
            }
          />
          <Select
            allowClear
            style={{ width: 130 }}
            placeholder={t('openingBalance.balanceType')}
            aria-label={t('openingBalance.balanceType')}
            value={filterBalanceType}
            options={[
              {
                label: t('openingBalance.typeReceivable'),
                value: 'RECEIVABLE',
              },
              {
                label: t('openingBalance.typeAdvance'),
                value: 'ADVANCE',
              },
            ]}
            onChange={(value) => onBalanceTypeChange(value)}
          />
          <Select
            allowClear
            style={{ width: 130 }}
            placeholder={t('modules.columns.status')}
            aria-label={t('modules.columns.status')}
            value={filterStatus}
            options={[
              {
                label: t('openingBalance.statusDraft'),
                value: 'DRAFT',
              },
              {
                label: t('openingBalance.statusConfirmed'),
                value: 'CONFIRMED',
              },
            ]}
            onChange={(value) => onStatusChange(value)}
          />
          <DatePicker.RangePicker
            format={DATE_PICKER_FORMATS}
            value={cutoffRange}
            onChange={(dates) => onCutoffRangeChange(dates)}
          />
          <Input
            allowClear
            style={{ width: 200 }}
            placeholder={t('openingBalance.keywordPlaceholder')}
            aria-label={t('openingBalance.keywordPlaceholder')}
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onPressEnter={onSearch}
          />
          <Button type="primary" onClick={onSearch}>
            {t('common.search')}
          </Button>
          <Button onClick={onReset}>{t('common.reset')}</Button>
        </Space>
      </section>

      <section className="finance-overview-summary">
        <Card size="small" className="finance-overview-metric">
          <Statistic
            title={t('openingBalance.summaryReceivable')}
            value={summary?.openingReceivableAmount ?? 0}
            precision={2}
            prefix="¥"
          />
        </Card>
        <Card size="small" className="finance-overview-metric">
          <Statistic
            title={t('openingBalance.summarySettled')}
            value={summary?.openingSettledAmount ?? 0}
            precision={2}
            prefix="¥"
          />
        </Card>
        <Card size="small" className="finance-overview-metric">
          <Statistic
            title={t('openingBalance.summaryRemaining')}
            value={summary?.openingRemainingAmount ?? 0}
            precision={2}
            prefix="¥"
          />
        </Card>
        <Card size="small" className="finance-overview-metric">
          <Statistic
            title={t('openingBalance.summaryAdvance')}
            value={summary?.openingAdvanceAmount ?? 0}
            precision={2}
            prefix="¥"
          />
        </Card>
        <Card size="small" className="finance-overview-metric">
          <Statistic
            title={t('openingBalance.summaryNetBalance')}
            value={summary?.openingNetBalance ?? 0}
            precision={2}
            prefix="¥"
          />
        </Card>
      </section>
    </>
  )
}
