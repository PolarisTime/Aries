import {
  Button,
  Col,
  DatePicker,
  Flex,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import {
  MAX_PRICE_CLOSED_SETTLE_DAYS,
  MAX_PRICE_DATE_OFFSET_DAYS,
  normalizePriceClosedSettleDays,
  normalizePriceClosedSettleDirection,
  normalizePriceDateBasis,
  normalizePriceDateOffsetDays,
  normalizePricePeriodFixed,
  normalizePricePeriodPolicy,
} from '@/api/master/project-options'
import { DATE_PICKER_FORMATS } from '@/utils/formatters'
import {
  PRICE_BASIS_LABEL_KEYS,
  PRICE_BASIS_OPTIONS,
  PRICE_CLOSED_SETTLE_DIRECTION_LABEL_KEYS,
  PRICE_CLOSED_SETTLE_DIRECTION_OPTIONS,
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
 * 单据级临时覆盖：基准 / 顺延交易日数 / 休市取价方向与天数 / 时段策略 / 时段 / 手工日期。
 *
 * <p>覆盖只作用于本次交付核定，不改项目配置；展示值优先取解析结果回显的「本次生效值」，
 * 因此覆盖生效后用户看到的是后端真正采用的口径。</p>
 *
 * <p>休市口径（方向 + 天数）在送货日期与报单日期两个基准下都参与，只有「每次手工选择」不参与；
 * 顺延交易日数则只在报单日期基准下有意义 —— 两者的显示条件因此不同，不共用一个 show 判断。</p>
 *
 * <p>排版：标题与「恢复项目配置」同排一行，字段两列栅格 + 标签在上、控件占满列宽 ——
 * 条件字段增删只影响栅格，不会像行内标签那样把控件挤到下一行。</p>
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
  const showOrderFields = effective.basis === 'ORDER'
  // 休市口径只在「每次手工选择」下不参与；送货日期基准同样要用它。
  const showClosedSettleFields = effective.basis !== 'MANUAL'

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Flex align="center" justify="space-between" gap={8}>
        <Text strong>
          {t('modules.pages.salesOrder.netPriceOverrideTitle')}
        </Text>
        <Button size="small" onClick={onReset}>
          {t('modules.pages.salesOrder.netPriceOverrideReset')}
        </Button>
      </Flex>

      <Row gutter={[16, 12]}>
        <Col span={12}>
          <OverrideField
            label={t('modules.pages.salesOrder.netPriceBasisLabel')}
          >
            <Select
              aria-label={t('modules.pages.salesOrder.netPriceBasisLabel')}
              style={{ width: '100%' }}
              value={effective.basis}
              options={PRICE_BASIS_OPTIONS.map((value) => ({
                value,
                label: t(PRICE_BASIS_LABEL_KEYS[value]),
              }))}
              onChange={(value: string) =>
                onChange({ basis: normalizePriceDateBasis(value) })
              }
            />
          </OverrideField>
        </Col>

        <Col span={12}>
          <OverrideField label={t('modules.pages.project.pricePeriodPolicy')}>
            <Select
              aria-label={t('modules.pages.project.pricePeriodPolicy')}
              style={{ width: '100%' }}
              value={effective.periodPolicy}
              options={PRICE_PERIOD_POLICY_OPTIONS.map((value) => ({
                value,
                label: t(PRICE_PERIOD_POLICY_LABEL_KEYS[value]),
              }))}
              onChange={(value: string) =>
                onChange({ periodPolicy: normalizePricePeriodPolicy(value) })
              }
            />
          </OverrideField>
        </Col>

        {showOrderFields ? (
          <Col span={12}>
            <OverrideField
              label={t('modules.pages.project.priceDateOffsetDays')}
            >
              <InputNumber
                aria-label={t('modules.pages.project.priceDateOffsetDays')}
                style={{ width: '100%' }}
                min={0}
                max={MAX_PRICE_DATE_OFFSET_DAYS}
                value={effective.offsetDays}
                onChange={(value) =>
                  onChange({
                    offsetDays: normalizePriceDateOffsetDays(value),
                  })
                }
              />
            </OverrideField>
          </Col>
        ) : null}

        {showClosedSettleFields ? (
          <>
            <Col span={12}>
              <OverrideField
                label={t('modules.pages.project.priceClosedSettleDirection')}
              >
                <Select
                  aria-label={t(
                    'modules.pages.project.priceClosedSettleDirection',
                  )}
                  style={{ width: '100%' }}
                  value={effective.priceClosedSettleDirection}
                  options={PRICE_CLOSED_SETTLE_DIRECTION_OPTIONS.map(
                    (value) => ({
                      value,
                      label: t(PRICE_CLOSED_SETTLE_DIRECTION_LABEL_KEYS[value]),
                    }),
                  )}
                  onChange={(value: string) =>
                    onChange({
                      priceClosedSettleDirection:
                        normalizePriceClosedSettleDirection(value),
                    })
                  }
                />
              </OverrideField>
            </Col>

            <Col span={12}>
              <OverrideField
                label={t('modules.pages.project.priceClosedSettleDays')}
              >
                <InputNumber
                  aria-label={t('modules.pages.project.priceClosedSettleDays')}
                  style={{ width: '100%' }}
                  min={0}
                  max={MAX_PRICE_CLOSED_SETTLE_DAYS}
                  precision={0}
                  value={effective.priceClosedSettleDays}
                  onChange={(value) =>
                    onChange({
                      priceClosedSettleDays:
                        normalizePriceClosedSettleDays(value),
                    })
                  }
                />
              </OverrideField>
            </Col>
          </>
        ) : null}

        {effective.periodPolicy === 'AUTO' ? null : (
          <Col span={12}>
            <OverrideField label={t('modules.pages.salesOrder.netPricePeriod')}>
              <Select
                aria-label={t('modules.pages.salesOrder.netPricePeriod')}
                style={{ width: '100%' }}
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
            </OverrideField>
          </Col>
        )}

        {effective.basis === 'MANUAL' ? (
          <Col span={12}>
            <OverrideField
              label={t('modules.pages.salesOrder.netPriceManualDate')}
            >
              <DatePicker
                aria-label={t('modules.pages.salesOrder.netPriceManualDate')}
                style={{ width: '100%' }}
                format={DATE_PICKER_FORMATS}
                value={effective.quoteDate ? dayjs(effective.quoteDate) : null}
                onChange={(value) =>
                  onChange({
                    quoteDate: value ? value.format('YYYY-MM-DD') : '',
                  })
                }
              />
            </OverrideField>
          </Col>
        ) : null}
      </Row>
    </Space>
  )
}

/** 覆盖项字段：标签在上、控件在下，控件占满所在列宽，六项口径纵向节奏一致。 */
function OverrideField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
      <Text type="secondary">{label}</Text>
      {children}
    </Space>
  )
}
