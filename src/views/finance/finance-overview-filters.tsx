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
import type { FinanceDirection } from '@/api/finance/finance-overview'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import {
  DIRECTION_OPTIONS,
  type FinanceOverviewDispatch,
  type FinanceOverviewState,
  PAYABLE_COUNTERPARTY_OPTIONS,
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
          aria-label="财务方向"
          value={state.direction}
          options={DIRECTION_OPTIONS}
          onChange={(value) => {
            dispatch({
              type: 'update',
              values: {
                direction: value as FinanceDirection,
                counterpartyType: undefined,
                page: 1,
              },
            })
          }}
        />
        <div className="finance-overview-filter">
          <Typography.Text type="secondary">结算主体</Typography.Text>
          <Select
            aria-label="结算主体"
            aria-required="true"
            value={settlementCompanyId}
            options={settlementCompanies}
            loading={optionsLoading}
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="请选择结算主体"
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
          <Typography.Text type="secondary">往来方</Typography.Text>
          <Input
            aria-label="往来方"
            value={state.keywordInput}
            allowClear
            placeholder="名称、拼音或编码"
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
          <Typography.Text type="secondary">截止日期</Typography.Text>
          <DatePicker
            aria-label="截止日期"
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
          aria-label="余额范围"
          value={state.onlyOpen ? 'open' : 'all'}
          options={[
            { label: '全部', value: 'all' },
            { label: '有余额', value: 'open' },
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
              <Typography.Text type="secondary">往来类型</Typography.Text>
              <Select
                aria-label="往来类型"
                value={state.counterpartyType || ''}
                options={PAYABLE_COUNTERPARTY_OPTIONS}
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
