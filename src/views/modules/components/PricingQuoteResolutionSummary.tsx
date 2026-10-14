import { Alert, Button, Descriptions, Space, Typography } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import type { ProjectPriceDateBasis } from '@/api/master/project-options'
import '@/styles/pricing-quote-modal.css'
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
 *
 * <p><b>高度稳定</b>：每次改覆盖值(基准 / 时段策略 / 时段 / 顺延天数 / 休市开关)都会重新解析，
 * 而弹层高度完全由内容决定 —— 若"一行正在解析…"与"四行结果"各自撑高度，弹层就会上下缩放
 * 一次(用户实测反馈: "下拉选择时窗口会上下缩放一下")。因此未拿到解析结果时渲染**同构骨架**:
 * 同样的四行描述(值占位「—」) + 同一行说明位(占位文案), 状态切换只换文字不换行数;
 * 说明位即使为空也保留一行(`.pricing-quote-summary-explanation` 的 min-height)。
 * 真正需要更多空间的回退/无行情提示仍会把面板撑高一次(信息不隐藏)。</p>
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
      <div className="pricing-quote-summary">
        <Alert
          type="error"
          showIcon
          title={t('modules.pages.salesOrder.netPriceResolveFailed')}
          description={error}
        />
      </div>
    )
  }

  const suggestedDate = resolution?.suggestedDate ?? ''
  const availablePeriods = resolution?.availablePeriods ?? []
  /**
   * 骨架与结果共用同一组标签: 未拿到结果时值给占位「—」(与页面其它缺省值同口径),
   * 行数/行高与结果态一致 ⇒ 解析落地时面板高度不变。
   */
  const placeholder = '—'
  const items = [
    {
      key: 'basis',
      label: t('modules.pages.salesOrder.netPriceBasisLabel'),
      children: resolution
        ? translatePriceBasis(t, resolution.basis)
        : placeholder,
    },
    {
      key: 'targetDate',
      label: t('modules.pages.salesOrder.netPriceTargetDate'),
      children: resolution ? formatDate(resolution.targetDate) : placeholder,
    },
    {
      key: 'quoteDate',
      label: t('modules.pages.salesOrder.netPriceActualDate'),
      children: resolution ? formatDate(resolution.quoteDate) : placeholder,
    },
    {
      key: 'period',
      label: t('modules.pages.salesOrder.netPriceActualPeriod'),
      children: resolution
        ? resolution.period
          ? translatePricePeriod(t, resolution.period)
          : t('modules.pages.salesOrder.netPricePeriodUnavailable')
        : placeholder,
    },
  ]
  /** 说明位: 结果态给后端说明, 解析中给进度文案, 其余留空(高度由 CSS 保留)。 */
  const explanation = resolution
    ? (resolution.explanation ?? '')
    : resolving
      ? t('modules.pages.salesOrder.netPriceResolving')
      : ''

  return (
    <div className="pricing-quote-summary">
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Descriptions colon={false} column={2} size="small" items={items} />

        <Text className="pricing-quote-summary-explanation" type="secondary">
          {explanation}
        </Text>

        {resolution?.dateFallback?.applied ? (
          <Alert
            type="warning"
            showIcon
            title={t('modules.pages.salesOrder.netPriceDateFallback')}
            description={resolution.dateFallback.reason}
          />
        ) : null}

        {resolution?.periodFallback?.applied ? (
          <Alert
            type="warning"
            showIcon
            title={t('modules.pages.salesOrder.netPricePeriodFallback')}
            description={resolution.periodFallback.reason}
          />
        ) : null}

        {resolution && !resolution.quoteAvailable ? (
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
        ) : null}
      </Space>
    </div>
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
