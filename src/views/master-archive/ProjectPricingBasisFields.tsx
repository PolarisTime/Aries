import type { FormInstance } from 'antd'
import { Col, Form, InputNumber, Select, Switch } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_PRICE_DATE_BASIS,
  DEFAULT_PRICE_PERIOD_POLICY,
  MAX_PRICE_DATE_OFFSET_DAYS,
  normalizePriceDateBasis,
  normalizePricePeriodPolicy,
  PRICE_PERIOD_OPTIONS,
  type ProjectPricePeriod,
} from '@/api/master/project-options'
import { asString } from '@/utils/type-narrowing'
import type { ProjectEditorValues } from './ProjectEditorOverlay'

/**
 * 固定时段取值到文案 key 的映射。
 * <p>
 * 「上午/中午/下午」本身是落库枚举, 中英文都必须按 key 取展示文案, 不能把枚举值当译文用。
 */
const PRICE_PERIOD_LABEL_KEYS = {
  上午: 'modules.pages.project.pricePeriodMorning',
  中午: 'modules.pages.project.pricePeriodMidday',
  下午: 'modules.pages.project.pricePeriodAfternoon',
} as const satisfies Record<ProjectPricePeriod, string>

/**
 * 项目「取价基准日期 + 取价时段策略」五个字段。
 *
 * <p>分组依据是它们共同描述「交付核定时按哪一天、哪个时段取价」: 基准不是报单日期时顺延交易日数
 * 与休市口径无意义, 时段策略不是固定时段时具体时段无意义, 因此两者都是条件字段, 放在同一组件里
 * 才能就近表达这层联动。</p>
 *
 * <p>这里只负责取值联动(禁用), 真正的清空/复位放在表单的 onValuesChange 与保存载荷装配处:
 * 编辑回填的历史脏值不会触发 onValuesChange, 只在渲染层复位会漏掉这类记录。</p>
 */
export function ProjectPricingBasisFields({
  form,
}: {
  form: FormInstance<ProjectEditorValues>
}) {
  const { t } = useTranslation()
  const priceDateBasis = Form.useWatch('priceDateBasis', form)
  const pricePeriodPolicy = Form.useWatch('pricePeriodPolicy', form)
  // watch 值在首次渲染前是 undefined: 先归一化再判断, 避免默认档被当成「未选」而错判联动。
  const isOrderBasis = normalizePriceDateBasis(priceDateBasis) === 'ORDER'
  const isFixedPeriod =
    normalizePricePeriodPolicy(pricePeriodPolicy) === 'FIXED'
  const dateBasisOptions = useMemo(
    () => [
      {
        label: t('modules.pages.project.priceDateBasisDelivery'),
        value: 'DELIVERY',
      },
      { label: t('modules.pages.project.priceDateBasisOrder'), value: 'ORDER' },
      {
        label: t('modules.pages.project.priceDateBasisManual'),
        value: 'MANUAL',
      },
    ],
    [t],
  )
  const periodPolicyOptions = useMemo(
    () => [
      {
        label: t('modules.pages.project.pricePeriodPolicyAuto'),
        value: 'AUTO',
      },
      {
        label: t('modules.pages.project.pricePeriodPolicyFixed'),
        value: 'FIXED',
      },
      {
        label: t('modules.pages.project.pricePeriodPolicyManual'),
        value: 'MANUAL',
      },
    ],
    [t],
  )
  const periodOptions = useMemo(
    () =>
      PRICE_PERIOD_OPTIONS.map((period) => ({
        label: t(PRICE_PERIOD_LABEL_KEYS[period]),
        value: period,
      })),
    [t],
  )

  return (
    <>
      <Col span={6}>
        <Form.Item
          name="priceDateBasis"
          label={t('modules.pages.project.priceDateBasis')}
          extra={t('modules.pages.project.priceDateBasisHint')}
          initialValue={DEFAULT_PRICE_DATE_BASIS}
        >
          <Select options={dateBasisOptions} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="priceDateOffsetDays"
          label={t('modules.pages.project.priceDateOffsetDays')}
          extra={t('modules.pages.project.priceDateOffsetDaysHint')}
          initialValue={0}
        >
          <InputNumber
            className="w-full"
            disabled={!isOrderBasis}
            max={MAX_PRICE_DATE_OFFSET_DAYS}
            min={0}
            precision={0}
            step={1}
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="priceClosedDayPrevSettle"
          label={t('modules.pages.project.priceClosedDayPrevSettle')}
          extra={t('modules.pages.project.priceClosedDayPrevSettleHint')}
          initialValue={false}
          valuePropName="checked"
        >
          <Switch disabled={!isOrderBasis} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="pricePeriodPolicy"
          label={t('modules.pages.project.pricePeriodPolicy')}
          extra={t('modules.pages.project.pricePeriodPolicyHint')}
          initialValue={DEFAULT_PRICE_PERIOD_POLICY}
        >
          <Select options={periodPolicyOptions} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="pricePeriodFixed"
          label={t('modules.pages.project.pricePeriodFixed')}
          extra={t('modules.pages.project.pricePeriodFixedHint')}
          initialValue={null}
          // 策略变化要重跑校验: 从 FIXED 切走时未选具体时段不该再拦住保存。
          dependencies={['pricePeriodPolicy']}
          rules={[
            {
              validator: (_rule, value) => {
                // 校验时现取策略而不是用渲染期闭包: 策略与时段在同一批变更里更新时, 闭包可能是旧值。
                const policy = normalizePricePeriodPolicy(
                  form.getFieldValue('pricePeriodPolicy'),
                )
                if (policy === 'FIXED' && !asString(value).trim()) {
                  return Promise.reject(
                    new Error(
                      t('modules.pages.project.pricePeriodFixedRequired'),
                    ),
                  )
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <Select
            allowClear
            disabled={!isFixedPeriod}
            options={periodOptions}
          />
        </Form.Item>
      </Col>
    </>
  )
}
