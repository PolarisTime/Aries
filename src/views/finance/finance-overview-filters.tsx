import {
  ClearOutlined,
  DownOutlined,
  FilterOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { Button, DatePicker, Input, Segmented, Select, Typography } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import {
  buildDirectionOptions,
  buildPayableCounterpartyOptions,
  type FinanceOverviewDispatch,
  type FinanceOverviewState,
} from './finance-overview-state'

/** 主筛选行 + 高级筛选行；高级区展开状态为组件内部 UI 状态 */
export function FinanceOverviewFilters({
  dispatch,
  optionsLoading,
  settlementCompanies,
  settlementCompanyId,
  state,
}: {
  dispatch: FinanceOverviewDispatch
  optionsLoading: boolean
  settlementCompanies: { label: string; value: string | number }[]
  settlementCompanyId?: string
  state: FinanceOverviewState
}) {
  const { t } = useTranslation()
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const directionOptions = buildDirectionOptions(t)
  const payableCounterpartyOptions = buildPayableCounterpartyOptions(t)

  const commitKeyword = (value: string): void => {
    const normalized = value.trim()
    dispatch({
      type: 'update',
      values: {
        keywordInput: value,
        keyword: normalized || undefined,
        page: 1,
      },
    })
  }

  return (
    <section className="finance-filter-shell finance-overview-toolbar">
      <div className="finance-filter-primary-row finance-overview-primary-row">
        <Segmented
          aria-label={t('financeDetail.direction')}
          value={state.direction}
          options={directionOptions}
          onChange={(value) => {
            dispatch({
              type: 'update',
              values: {
                direction: value,
                counterpartyType: undefined,
                page: 1,
              },
            })
          }}
        />
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">
            {t('financeDetail.settlementCompany')}
          </Typography.Text>
          <Select
            aria-label={t('financeDetail.settlementCompany')}
            aria-required="true"
            value={settlementCompanyId}
            options={settlementCompanies}
            loading={optionsLoading}
            showSearch={{ optionFilterProp: 'label' }}
            placeholder={t('financeDetail.selectSettlementCompany')}
            onChange={(value) => {
              dispatch({
                type: 'update',
                values: {
                  settlementCompanyId: value ? String(value) : undefined,
                  page: 1,
                },
              })
            }}
          />
        </div>
        <div className="finance-overview-filter finance-overview-filter--keyword">
          <Typography.Text type="secondary">
            {t('financeDetail.counterparty')}
          </Typography.Text>
          <Input
            aria-label={t('financeDetail.counterparty')}
            value={state.keywordInput}
            allowClear
            placeholder={t('financeDetail.counterpartyPlaceholder')}
            onChange={(event) => {
              const value = event.target.value
              if (!value) {
                commitKeyword('')
                return
              }
              dispatch({ type: 'update', values: { keywordInput: value } })
            }}
            onBlur={(event) => commitKeyword(event.target.value)}
            onPressEnter={(event) => commitKeyword(event.currentTarget.value)}
          />
        </div>
        <div className="finance-overview-filter finance-overview-filter--date">
          <Typography.Text type="secondary">
            {t('financeDetail.dueDate')}
          </Typography.Text>
          <DatePicker
            aria-label={t('financeDetail.dueDate')}
            value={dayjs(state.asOfDate)}
            allowClear={false}
            format={DISPLAY_DATE_FORMAT}
            onChange={(value) => {
              if (value) {
                dispatch({
                  type: 'update',
                  values: {
                    asOfDate: value.format('YYYY-MM-DD'),
                    page: 1,
                  },
                })
              }
            }}
          />
        </div>
        <Segmented
          aria-label={t('financeDetail.balanceRange')}
          value={state.onlyOpen ? 'open' : 'all'}
          options={[
            { label: t('financeDetail.all'), value: 'all' },
            { label: t('financeDetail.hasBalance'), value: 'open' },
          ]}
          onChange={(value) => {
            dispatch({
              type: 'update',
              values: { onlyOpen: value === 'open', page: 1 },
            })
          }}
        />
        <div className="finance-filter-actions">
          <Button
            icon={<ClearOutlined />}
            onClick={() => dispatch({ type: 'reset-filters' })}
          >
            {t('common.reset')}
          </Button>
          <Button
            aria-controls="finance-overview-advanced-filters"
            aria-expanded={advancedFiltersOpen}
            icon={<FilterOutlined />}
            onClick={() => setAdvancedFiltersOpen((open) => !open)}
          >
            {t('finance.filters.advanced')}
            {advancedFiltersOpen ? <UpOutlined /> : <DownOutlined />}
          </Button>
        </div>
      </div>

      {advancedFiltersOpen ? (
        <div
          className="finance-filter-advanced-row"
          id="finance-overview-advanced-filters"
        >
          {state.direction === 'PAYABLE' ? (
            <div className="finance-overview-filter">
              <Typography.Text type="secondary">
                {t('financeDetail.counterpartyTypeShort')}
              </Typography.Text>
              <Select
                aria-label={t('financeDetail.counterpartyTypeShort')}
                value={state.counterpartyType || ''}
                options={payableCounterpartyOptions}
                onChange={(value) => {
                  dispatch({
                    type: 'update',
                    values: {
                      counterpartyType: value || undefined,
                      page: 1,
                    },
                  })
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
