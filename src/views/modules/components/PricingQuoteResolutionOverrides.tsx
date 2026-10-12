import {
  Button,
  DatePicker,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import {
  MAX_PRICE_DATE_OFFSET_DAYS,
  normalizePriceDateBasis,
  normalizePriceDateOffsetDays,
  normalizePricePeriodFixed,
  normalizePricePeriodPolicy,
} from '@/api/master/project-options'
import {
  PRICE_BASIS_LABEL_KEYS,
  PRICE_BASIS_OPTIONS,
  PRICE_PERIOD_FALLBACK_OPTIONS,
  PRICE_PERIOD_POLICY_LABEL_KEYS,
  PRICE_PERIOD_POLICY_OPTIONS,
  translatePricePeriod,
} from './pricing-quote-labels'
import type { PricingQuoteControls } from './use-pricing-quote-resolution'
import { resolveEffectiveControls } from './use-pricing-quote-resolution'

const { Text } = Typography

interface Props {
  resolution: PricingQuoteResolution | null
  controls: PricingQuoteControls
  /** 改任一项即按覆盖值重新解析（解析结果即取价入参）。 */
  onChange: (patch: PricingQuoteControls) => void
  /** 清空覆盖，回到项目配置口径。 */
  onReset: () => void
}

/**
 * 单据级临时覆盖：基准 / 顺延交易日数 / 休市口径 / 时段策略 / 时段 / 手工日期。
 *
 * <p>覆盖只作用于本次交付核定，不改项目配置；展示值优先取解析结果回显的「本次生效值」，
 * 因此覆盖生效后用户看到的是后端真正采用的口径。</p>
 */
export function PricingQuoteResolutionOverrides({
  resolution,
  controls,
  onChange,
  onReset,
}: Props) {
  const { t } = useTranslation()
  const effective = resolveEffectiveControls(resolution, controls)
  const availablePeriods = resolution?.availablePeriods ?? []
  // 手工时段策略下只列当日真正可用的时段；固定策略允许选到未发布的时段，由后端提示回退。
  const periodOptions =
    effective.periodPolicy === 'MANUAL' && availablePeriods.length > 0
      ? availablePeriods
      : PRICE_PERIOD_FALLBACK_OPTIONS

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Space wrap>
        <Text type="secondary">
          {t('modules.pages.salesOrder.netPriceOverrideTitle')}
        </Text>
        <Button size="small" onClick={onReset}>
          {t('modules.pages.salesOrder.netPriceOverrideReset')}
        </Button>
      </Space>

      <Space wrap>
        <Text>{t('modules.pages.salesOrder.netPriceBasisLabel')}</Text>
        <Select
          aria-label={t('modules.pages.salesOrder.netPriceBasisLabel')}
          style={{ width: 200 }}
          value={effective.basis}
          options={PRICE_BASIS_OPTIONS.map((value) => ({
            value,
            label: t(PRICE_BASIS_LABEL_KEYS[value]),
          }))}
          onChange={(value: string) =>
            onChange({ basis: normalizePriceDateBasis(value) })
          }
        />

        <Text>{t('modules.pages.project.pricePeriodPolicy')}</Text>
        <Select
          aria-label={t('modules.pages.project.pricePeriodPolicy')}
          style={{ width: 200 }}
          value={effective.periodPolicy}
          options={PRICE_PERIOD_POLICY_OPTIONS.map((value) => ({
            value,
            label: t(PRICE_PERIOD_POLICY_LABEL_KEYS[value]),
          }))}
          onChange={(value: string) =>
            onChange({ periodPolicy: normalizePricePeriodPolicy(value) })
          }
        />
      </Space>

      <Space wrap>
        {effective.basis === 'ORDER' ? (
          <OrderBasisControls
            offsetDays={effective.offsetDays}
            settlePrevOnClosed={effective.settlePrevOnClosed}
            onChange={onChange}
          />
        ) : null}

        {effective.basis === 'MANUAL' ? (
          <Space wrap>
            <Text>{t('modules.pages.salesOrder.netPriceManualDate')}</Text>
            <DatePicker
              aria-label={t('modules.pages.salesOrder.netPriceManualDate')}
              value={effective.quoteDate ? dayjs(effective.quoteDate) : null}
              onChange={(value) =>
                onChange({ quoteDate: value ? value.format('YYYY-MM-DD') : '' })
              }
            />
          </Space>
        ) : null}

        {effective.periodPolicy === 'AUTO' ? null : (
          <Space wrap>
            <Text>{t('modules.pages.salesOrder.netPricePeriod')}</Text>
            <Select
              aria-label={t('modules.pages.salesOrder.netPricePeriod')}
              style={{ width: 160 }}
              value={effective.period ?? undefined}
              options={periodOptions.map((value) => ({
                value,
                label: translatePricePeriod(t, value),
              }))}
              onChange={(value: string) =>
                onChange({
                  period: normalizePricePeriodFixed(value) ?? undefined,
                })
              }
            />
          </Space>
        )}
      </Space>
    </Space>
  )
}

interface OrderBasisControlsProps {
  offsetDays: number
  settlePrevOnClosed: boolean
  onChange: (patch: PricingQuoteControls) => void
}

/** 仅「报单日期」基准有意义的两个覆盖项：顺延交易日数与休市取前一交易日。 */
function OrderBasisControls({
  offsetDays,
  settlePrevOnClosed,
  onChange,
}: OrderBasisControlsProps) {
  const { t } = useTranslation()
  return (
    <Space wrap>
      <Text>{t('modules.pages.project.priceDateOffsetDays')}</Text>
      <InputNumber
        aria-label={t('modules.pages.project.priceDateOffsetDays')}
        min={0}
        max={MAX_PRICE_DATE_OFFSET_DAYS}
        value={offsetDays}
        onChange={(value) =>
          onChange({ offsetDays: normalizePriceDateOffsetDays(value) })
        }
      />
      <Text>{t('modules.pages.project.priceClosedDayPrevSettle')}</Text>
      <Switch
        aria-label={t('modules.pages.project.priceClosedDayPrevSettle')}
        checked={settlePrevOnClosed}
        onChange={(checked) => onChange({ settlePrevOnClosed: checked })}
      />
    </Space>
  )
}
