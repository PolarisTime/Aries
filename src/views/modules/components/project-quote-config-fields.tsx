import { Segmented, Select, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { categoriesOf } from '@/views/price-compare/core'
import varietiesJson from '@/views/price-compare/data/varieties.json'
import { varietyKey } from '@/views/price-compare/project-config-draft'
import type { Variety } from '@/views/price-compare/types'

/**
 * 项目资料里的「比价配置」复合字段控件。
 *
 * <p>2026-11-16 用户定稿：**项目资料是品牌/品种/规格/加价/代取/指定品牌的唯一配置点**，
 * 报单比价的「配置」弹层只剩每品牌运费。这些字段的数据结构是复合的（品牌 × 品类矩阵、
 * 商品键数组），通用表单渲染器不认识，因此由模块在自己的字段定义里用 `render` 注入控件；
 * `Form.Item` 仍负责取值、必填与校验（value/onChange 由它注入）。</p>
 *
 * <p>商品与品类目录复用比价页随包发布的 `varieties.json`（同一份参考数据，不另建清单）。</p>
 */

/** 参考数据：与比价页 `usePriceCompareData` 的 metadata 同一份 JSON（不重复维护）。 */
const VARIETIES: Variety[] = (varietiesJson as Variety[]).map((item) => ({
  ...item,
  label: item.label.replace(/Φ\s*/g, '').replace(/\s+/g, ' ').trim(),
}))

/** 参与比价的商品键选项：`类别|材质|规格|长度`（与比价页保存口径一致）。 */
export const PROJECT_VARIETY_OPTIONS = VARIETIES.map((item) => ({
  label: `${item.category} ${item.material} ${item.spec} ${item.length}`,
  value: varietyKey(item),
}))

/** 品牌 × 品类矩阵：`Record<品牌, 品类[]>`；未出现的品牌 = 全部品类。 */
export function ProjectQuoteBrandCategoriesField({
  value,
  onChange,
  disabled,
  label,
  brands,
}: {
  value?: Record<string, string[]>
  onChange?: (value: Record<string, string[]>) => void
  disabled?: boolean
  label: string
  /** 品牌清单来自同表单的「允许的品牌」字段（空 = 项目不限品牌，此时不渲染矩阵）。 */
  brands: readonly string[]
}) {
  const { t } = useTranslation()
  const categories = useMemo(() => categoriesOf(VARIETIES), [])
  const current = value ?? {}

  if (brands.length === 0) {
    return (
      <Typography.Text type="secondary">
        {t('modules.pages.project.quoteBrandCategoriesEmpty')}
      </Typography.Text>
    )
  }

  return (
    <fieldset
      className="project-quote-brand-categories"
      style={{
        /*
         * 两列（窄屏自动回退一列）：5 个品牌逐行排会白占 5 行高度，把下面的字段顶出可视区。
         * 品牌名固定 96px 保证纵向对齐，下拉自适应剩余宽度。
         */
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '8px 24px',
        border: 0,
        margin: 0,
        padding: 0,
      }}
    >
      {/* 视觉上隐藏、读屏可读：字段名由外层 Form.Item 已经念过一遍，这里只为分组可访问名 */}
      <legend
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </legend>
      {brands.map((brand) => (
        <div
          className="project-quote-brand-categories__row"
          key={brand}
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <span
            className="project-quote-brand-categories__brand"
            style={{ minWidth: 96 }}
            title={brand}
          >
            {brand}
          </span>
          <Select
            aria-label={`${label} ${brand}`}
            allowClear
            disabled={disabled}
            mode="multiple"
            onChange={(picked: string[]) =>
              onChange?.({
                ...current,
                [brand]: picked,
              })
            }
            options={categories.map((category) => ({
              label: category,
              value: category,
            }))}
            placeholder={t(
              'modules.pages.project.quoteBrandCategoriesPlaceholder',
            )}
            style={{ flex: 1 }}
            value={current[brand] ?? []}
          />
        </div>
      ))}
      {/*
       * 说明只在标签旁的 ⓘ 里出现一次（字段级 tooltip + extra）。控件内部不再重复一行
       * 「为每个品牌勾选可以报的品种…」——同一句话在一屏里出现两次正是这页被判「乱」的原因之一。
       */}
    </fieldset>
  )
}

/**
 * 抗震牌号（HRB400E）代取开关：boolean 值。
 *
 * <p>不复用通用 `segmented` 字段：通用控件把选项值 `String()` 化，表单里会变成字符串，
 * 而接口契约要求 boolean（见项目资料新字段 `quoteHrb400eFallback`）。</p>
 */
export function ProjectQuoteHrb400eFallbackField({
  value,
  onChange,
  disabled,
}: {
  value?: boolean
  onChange?: (value: boolean) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Segmented<boolean>
      disabled={disabled}
      onChange={(next) => onChange?.(next)}
      options={[
        {
          label: t('modules.pages.project.quoteHrb400eFallbackOn'),
          value: true,
        },
        {
          label: t('modules.pages.project.quoteHrb400eFallbackOff'),
          value: false,
        },
      ]}
      value={value ?? false}
    />
  )
}
