import type { FormInstance } from 'antd'
import { Col, Form, InputNumber, Select } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_PRICE_CLOSED_SETTLE_DAYS,
  DEFAULT_PRICE_CLOSED_SETTLE_DIRECTION,
  DEFAULT_PRICE_DATE_BASIS,
  DEFAULT_PRICE_PERIOD_POLICY,
  isPriceClosedSettleDaysValid,
  MAX_PRICE_CLOSED_SETTLE_DAYS,
  MAX_PRICE_DATE_OFFSET_DAYS,
  normalizePriceClosedSettleDays,
  normalizePriceClosedSettleDirection,
  normalizePriceDateBasis,
  normalizePricePeriodPolicy,
  PRICE_PERIOD_OPTIONS,
  type ProjectPriceClosedSettleDirection,
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
 * 休市取价方向取值到文案 key 的映射。
 * <p>
 * PREV/NEXT 是落库枚举, 展示层必须按 key 取文案(「往前（较早交易日）/延后（较晚交易日）」),
 * 不能把枚举值当译文用。
 */
const CLOSED_SETTLE_DIRECTION_LABEL_KEYS = {
  PREV: 'modules.pages.project.priceClosedSettleDirectionPrev',
  NEXT: 'modules.pages.project.priceClosedSettleDirectionNext',
} as const satisfies Record<ProjectPriceClosedSettleDirection, string>

/**
 * 项目「取价基准日期 + 顺延交易日数 + 休市取价方向/天数 + 取价时段策略」六个字段。
 *
 * <p>分组依据是它们共同描述「交付核定时按哪一天、哪个时段取价」: 基准不是报单日期时顺延交易日数
 * 无意义, 时段策略不是固定时段时具体时段无意义, 因此这两类都是条件字段, 放在同一组件里
 * 才能就近表达这层联动。</p>
 *
 * <p>休市口径（方向 + 天数）在**送货日期与报单日期两个基准下都生效**, 只有「每次手工选择」不参与:
 * 送货日期基准下直接取第 N 个交易日作为休市基准日, 报单日期基准下再叠加顺延交易日数。
 * 因此这两个控件只在 MANUAL 置灰, 不像顺延交易日数那样只在 ORDER 可用。</p>
 *
 * <p>这里只负责取值联动(禁用)与天数组合校验, 真正的清空/复位放在表单的 onValuesChange 与
 * 保存载荷装配处: 编辑回填的历史脏值不会触发 onValuesChange, 只在渲染层复位会漏掉这类记录。</p>
 *
 * <p>列宽只用 24 栅格的整数倍(1/2/3/4/6/8/12 都是 24 的因数), 第二行
 * 基准日期 8 + 顺延 4 + 方向 6 + 天数 6 精确拼满 24, 不出现半行空洞;
 * 「基准日期占 1/3、顺延只占 1/6」是按内容给的宽度 —— 基准日期标签短于休市口径, 顺延数字最窄。</p>
 *
 * <p>排列顺序按「同一件事挨在一起」: 取价数据源/取价地区/取价时段策略/固定取价时段 占满第一行,
 * 基准日期 8 + 顺延 4 + 休市方向 6 + 休市天数 6 占满第二行。</p>
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
  const normalizedBasis = normalizePriceDateBasis(priceDateBasis)
  const isOrderBasis = normalizedBasis === 'ORDER'
  // MANUAL 每次手工选择日期, 休市口径不参与 —— 只有这一档置灰方向与天数。
  const closedSettleDisabled = normalizedBasis === 'MANUAL'
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
  const closedSettleDirectionOptions = useMemo(
    () =>
      (['PREV', 'NEXT'] as const).map((direction) => ({
        label: t(CLOSED_SETTLE_DIRECTION_LABEL_KEYS[direction]),
        value: direction,
      })),
    [t],
  )

  return (
    <>
      <Col span={6}>
        <Form.Item
          name="pricePeriodPolicy"
          label={t('modules.pages.project.pricePeriodPolicy')}
          tooltip={t('modules.pages.project.pricePeriodPolicyHint')}
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
          tooltip={t('modules.pages.project.pricePeriodFixedHint')}
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
      <Col span={8}>
        <Form.Item
          name="priceDateBasis"
          label={t('modules.pages.project.priceDateBasis')}
          tooltip={t('modules.pages.project.priceDateBasisHint')}
          extra={t('modules.pages.project.priceDateBasisHint')}
          initialValue={DEFAULT_PRICE_DATE_BASIS}
        >
          <Select options={dateBasisOptions} />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item
          name="priceDateOffsetDays"
          label={t('modules.pages.project.priceDateOffsetDays')}
          tooltip={t('modules.pages.project.priceDateOffsetDaysHint')}
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
          name="priceClosedSettleDirection"
          label={t('modules.pages.project.priceClosedSettleDirection')}
          tooltip={t('modules.pages.project.priceClosedSettleDirectionHint')}
          extra={t('modules.pages.project.priceClosedSettleDirectionHint')}
          initialValue={DEFAULT_PRICE_CLOSED_SETTLE_DIRECTION}
        >
          <Select
            disabled={closedSettleDisabled}
            options={closedSettleDirectionOptions}
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="priceClosedSettleDays"
          label={t('modules.pages.project.priceClosedSettleDays')}
          tooltip={t('modules.pages.project.priceClosedSettleDaysHint')}
          extra={t('modules.pages.project.priceClosedSettleDaysHint')}
          initialValue={DEFAULT_PRICE_CLOSED_SETTLE_DAYS}
          // 基准或方向变化要重跑校验: 0 天在「往前」与「送货日期」下非法, 只在「报单日期 + 延后」下合法。
          dependencies={['priceDateBasis', 'priceClosedSettleDirection']}
          rules={[
            {
              validator: (_rule, value) => {
                // 现值一律现取而不是用渲染期闭包: 基准/方向与天数在同一批变更里更新时, 闭包可能是旧值。
                const days = normalizePriceClosedSettleDays(value)
                const basis = normalizePriceDateBasis(
                  form.getFieldValue('priceDateBasis'),
                )
                const direction = normalizePriceClosedSettleDirection(
                  form.getFieldValue('priceClosedSettleDirection'),
                )
                if (isPriceClosedSettleDaysValid(days, direction, basis)) {
                  return Promise.resolve()
                }
                return Promise.reject(
                  new Error(
                    t('modules.pages.project.priceClosedSettleDaysRequired'),
                  ),
                )
              },
            },
          ]}
        >
          <InputNumber
            className="w-full"
            disabled={closedSettleDisabled}
            max={MAX_PRICE_CLOSED_SETTLE_DAYS}
            min={0}
            precision={0}
            step={1}
          />
        </Form.Item>
      </Col>
    </>
  )
}
