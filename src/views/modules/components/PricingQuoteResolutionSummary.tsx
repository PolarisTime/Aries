import { Alert, Button, Descriptions, Space, Typography } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import type { ProjectPriceDateBasis } from '@/api/master/project-options'
import { formatDate } from '@/utils/formatters'
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
 *
 * <p>口径用双列描述列表呈现：四项等宽对齐、四行压成两行，弹窗不必再靠密集小字堆叠。</p>
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
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Descriptions
        colon={false}
        column={2}
        size="small"
        items={[
          {
            key: 'basis',
            label: t('modules.pages.salesOrder.netPriceBasisLabel'),
            children: translatePriceBasis(t, resolution.basis),
          },
          {
            key: 'targetDate',
            label: t('modules.pages.salesOrder.netPriceTargetDate'),
            children: formatDate(resolution.targetDate),
          },
          {
            key: 'quoteDate',
            label: t('modules.pages.salesOrder.netPriceActualDate'),
            children: formatDate(resolution.quoteDate),
          },
          {
            key: 'period',
            label: t('modules.pages.salesOrder.netPriceActualPeriod'),
            children: resolution.period
              ? translatePricePeriod(t, resolution.period)
              : t('modules.pages.salesOrder.netPricePeriodUnavailable'),
          },
        ]}
      />

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
                  date: formatDate(suggestedDate),
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
