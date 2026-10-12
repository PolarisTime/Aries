import { Alert, Button, Space, Typography } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import type { ProjectPriceDateBasis } from '@/api/master/project-options'
import {
  PRICE_BASIS_LABEL_KEYS,
  translatePricePeriod,
} from './pricing-quote-labels'

const { Text } = Typography

interface Props {
  resolution: PricingQuoteResolution | null
  resolving: boolean
  error: string | null
  /** 一键采纳建议日期（切到手工基准并按建议日期重新解析）。 */
  onAdoptSuggestedDate: () => void
}

/**
 * 解析结果摘要：基准口径 / 基准日 / 实际取价日 / 实际取价时段 / 中文说明，
 * 以及日期回退、时段回退、当日无行情三类「醒目但非阻断」提示。
 */
export function PricingQuoteResolutionSummary({
  resolution,
  resolving,
  error,
  onAdoptSuggestedDate,
}: Props) {
  const { t } = useTranslation()

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        title={t('modules.pages.salesOrder.netPriceResolveFailed')}
        description={error}
      />
    )
  }
  if (!resolution) {
    return resolving ? (
      <Text type="secondary">
        {t('modules.pages.salesOrder.netPriceResolving')}
      </Text>
    ) : null
  }

  const suggestedDate = resolution.suggestedDate ?? ''
  const availablePeriods = resolution.availablePeriods ?? []

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Space wrap>
        <Text>
          {t('modules.pages.salesOrder.netPriceBasisLabel')}：
          {translatePriceBasis(t, resolution.basis)}
        </Text>
        <Text>
          {t('modules.pages.salesOrder.netPriceTargetDate')}：
          {resolution.targetDate ?? '—'}
        </Text>
        <Text>
          {t('modules.pages.salesOrder.netPriceActualDate')}：
          {resolution.quoteDate ?? '—'}
        </Text>
        <Text>
          {t('modules.pages.salesOrder.netPriceActualPeriod')}：
          {resolution.period
            ? translatePricePeriod(t, resolution.period)
            : t('modules.pages.salesOrder.netPricePeriodUnavailable')}
        </Text>
      </Space>

      {resolution.explanation ? (
        <Text type="secondary">{resolution.explanation}</Text>
      ) : null}

      {resolution.dateFallback?.applied ? (
        <Alert
          type="warning"
          showIcon
          title={t('modules.pages.salesOrder.netPriceDateFallback')}
          description={resolution.dateFallback.reason}
        />
      ) : null}

      {resolution.periodFallback?.applied ? (
        <Alert
          type="warning"
          showIcon
          title={t('modules.pages.salesOrder.netPricePeriodFallback')}
          description={resolution.periodFallback.reason}
        />
      ) : null}

      {resolution.quoteAvailable ? null : (
        <Alert
          type="warning"
          showIcon
          title={t('modules.pages.salesOrder.netPriceNoQuote')}
          description={describeAvailablePeriods(t, availablePeriods)}
          action={
            suggestedDate ? (
              <Button size="small" onClick={onAdoptSuggestedDate}>
                {t('modules.pages.salesOrder.netPriceAdoptSuggestedDate', {
                  date: suggestedDate,
                })}
              </Button>
            ) : undefined
          }
        />
      )}
    </Space>
  )
}

/** 基准口径文案：只认后端回显的 DELIVERY/ORDER/MANUAL，其余按「送货日期」兜底。 */
function translatePriceBasis(t: TFunction, basis: string): string {
  return basis in PRICE_BASIS_LABEL_KEYS
    ? t(PRICE_BASIS_LABEL_KEYS[basis as ProjectPriceDateBasis])
    : t(PRICE_BASIS_LABEL_KEYS.DELIVERY)
}

/** 无行情时的可用时段说明：没有可用时段时不下发描述，避免出现空的提示文案。 */
function describeAvailablePeriods(
  t: TFunction,
  periods: string[],
): string | undefined {
  if (periods.length === 0) return undefined
  return t('modules.pages.salesOrder.netPriceAvailablePeriods', {
    periods: periods.map((item) => translatePricePeriod(t, item)).join('、'),
  })
}
