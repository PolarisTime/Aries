import type { Rule } from 'antd/es/form'
import type { TFunction } from 'i18next'
import {
  parseValueAliasDimension,
  VALUE_ALIAS_DIMENSIONS,
  VALUE_ALIAS_MAX_REMARK_LENGTH,
  VALUE_ALIAS_MAX_VALUE_LENGTH,
  type ValueAliasDimension,
  type ValueAliasInputDraft,
  type ValueAliasRecord,
} from '@/api/master/value-aliases'
import type { EntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

/**
 * 值映射维护弹窗的表单模型。
 *
 * <p>校验文案与 {@link valueAliasInputSchema}（后端 422 的同一套业务不变量）保持一致，
 * 但拆成字段级规则是为了「即时提示」：自映射、超长、同维度源写法重复都在输入时就能看到，
 * 不必等一次 round-trip 的 422。提交时仍会再用 Zod schema 归一化一次，写路径只有一套口径。</p>
 */

/** 维度选项的 i18n key：与后端 `ValueAliasDimension` 的中文名一一对应。 */
export const VALUE_ALIAS_DIMENSION_LABEL_KEYS: Record<
  ValueAliasDimension,
  string
> = {
  CATEGORY: 'valueAlias.dimensions.CATEGORY',
  MATERIAL: 'valueAlias.dimensions.MATERIAL',
  LENGTH: 'valueAlias.dimensions.LENGTH',
  BRAND: 'valueAlias.dimensions.BRAND',
}

/** antd 表单字段值；`dimension` 允许为空串（未选择）。 */
export interface ValueAliasFormValues {
  dimension: string
  sourceValue: string
  targetValue: string
  remark?: string | null | undefined
}

export const EMPTY_VALUE_ALIAS_FORM_VALUES: ValueAliasFormValues = {
  dimension: '',
  sourceValue: '',
  targetValue: '',
  remark: '',
}

export interface ValueAliasDimensionOption {
  label: string
  value: ValueAliasDimension
}

export function buildValueAliasDimensionOptions(
  t: TFunction,
): ValueAliasDimensionOption[] {
  return VALUE_ALIAS_DIMENSIONS.map((dimension) => ({
    value: dimension,
    label: t(VALUE_ALIAS_DIMENSION_LABEL_KEYS[dimension]),
  }))
}

/**
 * 维度展示文案：未知维度降级为「维度 + 原值」，不隐藏数据也不抛错。
 */
export function formatValueAliasDimension(
  t: TFunction,
  dimension: unknown,
): string {
  const known = parseValueAliasDimension(dimension)
  if (known) {
    return t(VALUE_ALIAS_DIMENSION_LABEL_KEYS[known])
  }
  const raw = asString(dimension).trim()
  return raw ? t('valueAlias.unknownDimension', { value: raw }) : '—'
}

export interface DuplicateSourceAliasQuery {
  dimension: string
  sourceValue: string
  /** 编辑时排除自身，否则会把自己当成重复项。 */
  excludeId?: EntityId | null | undefined
}

/**
 * 在**已加载的记录**里查找同维度同源写法。
 *
 * <p>只做尽力而为的即时提示：加载的是当前分页，落在别的分页上的冲突查不到，仍由后端
 * 422 兜底。反过来不会误报 —— 查到的都是真实存在的记录。</p>
 *
 * <p>比较口径与后端 `existsByDimensionAndSourceValueAndDeletedFlagFalse` 一致：
 * trim 后**区分大小写**精确匹配。</p>
 */
export function findDuplicateSourceAlias(
  records: readonly ValueAliasRecord[],
  query: DuplicateSourceAliasQuery,
): ValueAliasRecord | null {
  const dimension = parseValueAliasDimension(query.dimension)
  const sourceValue = asString(query.sourceValue).trim()
  if (!dimension || !sourceValue) {
    return null
  }
  const excludeId = query.excludeId ? String(query.excludeId) : ''
  return (
    records.find(
      (record) =>
        record.dimension === dimension &&
        record.sourceValue === sourceValue &&
        (!excludeId || record.id !== excludeId),
    ) ?? null
  )
}

export interface ValueAliasRuleContext {
  t: TFunction
  /** 当前已加载的记录，用于同维度源写法重复的即时提示。 */
  records: readonly ValueAliasRecord[]
  /** 编辑中的记录 ID；新增时为 null。 */
  editingId: EntityId | null
  /** 读取同表单其它字段的当前值（自映射、重复检测都需要跨字段比较）。 */
  getFieldValue: (field: keyof ValueAliasFormValues) => unknown
}

function reject(message: string): Promise<never> {
  return Promise.reject(new Error(message))
}

/** 维度：必选且在白名单内。 */
export function buildDimensionRules(context: ValueAliasRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) =>
        parseValueAliasDimension(value)
          ? Promise.resolve()
          : reject(
              asString(value).trim()
                ? t('valueAlias.dimensionInvalid')
                : t('valueAlias.dimensionRequired'),
            ),
    },
  ]
}

/** 源写法：必填、≤64、同维度不重复。 */
export function buildSourceValueRules(context: ValueAliasRuleContext): Rule[] {
  const { t, records, editingId, getFieldValue } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const text = asString(value).trim()
        if (!text) {
          return reject(t('valueAlias.sourceValueRequired'))
        }
        if (text.length > VALUE_ALIAS_MAX_VALUE_LENGTH) {
          return reject(t('valueAlias.sourceValueTooLong'))
        }
        const duplicate = findDuplicateSourceAlias(records, {
          dimension: asString(getFieldValue('dimension')),
          sourceValue: text,
          excludeId: editingId,
        })
        if (duplicate) {
          return reject(
            t('valueAlias.sourceValueDuplicate', {
              value: duplicate.sourceValue,
            }),
          )
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 目标写法：必填、≤64、不得与源写法相同（自映射无意义）。 */
export function buildTargetValueRules(context: ValueAliasRuleContext): Rule[] {
  const { t, getFieldValue } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const text = asString(value).trim()
        if (!text) {
          return reject(t('valueAlias.targetValueRequired'))
        }
        if (text.length > VALUE_ALIAS_MAX_VALUE_LENGTH) {
          return reject(t('valueAlias.targetValueTooLong'))
        }
        const sourceValue = asString(getFieldValue('sourceValue')).trim()
        if (sourceValue && sourceValue === text) {
          return reject(t('valueAlias.selfMapping'))
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 备注：可空、≤255。 */
export function buildRemarkRules(context: ValueAliasRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) =>
        asString(value).trim().length > VALUE_ALIAS_MAX_REMARK_LENGTH
          ? reject(t('valueAlias.remarkTooLong'))
          : Promise.resolve(),
    },
  ]
}

export interface ValueAliasFormRules {
  dimension: Rule[]
  sourceValue: Rule[]
  targetValue: Rule[]
  remark: Rule[]
}

export function buildValueAliasFormRules(
  context: ValueAliasRuleContext,
): ValueAliasFormRules {
  return {
    dimension: buildDimensionRules(context),
    sourceValue: buildSourceValueRules(context),
    targetValue: buildTargetValueRules(context),
    remark: buildRemarkRules(context),
  }
}

/** 记录 → 表单值（编辑态）。 */
export function toValueAliasFormValues(
  record: ValueAliasRecord,
): ValueAliasFormValues {
  return {
    dimension: record.dimension,
    sourceValue: record.sourceValue,
    targetValue: record.targetValue,
    remark: record.remark ?? '',
  }
}

/**
 * 表单值 → 写入请求体草稿：字符串一律 trim，空备注不下发。
 *
 * <p>维度的大小写归一是 Zod schema（`valueAliasInputSchema`）的职责，这里只做与展示无关的
 * 空白清理，保持「谁归一、在哪归一」只有一处。</p>
 */
export function toValueAliasInputDraft(
  values: ValueAliasFormValues,
): ValueAliasInputDraft {
  const remark = asString(values.remark).trim()
  return {
    dimension: asString(values.dimension).trim(),
    sourceValue: asString(values.sourceValue).trim(),
    targetValue: asString(values.targetValue).trim(),
    ...(remark ? { remark } : {}),
  }
}

/** Zod issue 的最小结构（避免这里依赖 zod 的内部类型名）。 */
export interface ValueAliasIssue {
  path: readonly PropertyKey[]
  message: string
}

export interface ValueAliasFieldError {
  name: keyof ValueAliasFormValues
  errors: string[]
}

const FORM_FIELD_NAMES: ReadonlySet<string> = new Set([
  'dimension',
  'sourceValue',
  'targetValue',
  'remark',
])

function isFormFieldName(
  value: PropertyKey,
): value is keyof ValueAliasFormValues {
  return typeof value === 'string' && FORM_FIELD_NAMES.has(value)
}

/**
 * Zod 校验失败 → antd `form.setFields` 需要的字段错误。
 *
 * <p>单个字段的多条 issue 归并到同一个 `errors` 数组；字段名不在表单里的 issue
 * （理论上只有根级问题）挂到 `targetValue`，保证错误不会被静默丢弃。</p>
 */
export function toValueAliasFieldErrors(
  issues: readonly ValueAliasIssue[],
): ValueAliasFieldError[] {
  const grouped = new Map<keyof ValueAliasFormValues, string[]>()
  for (const issue of issues) {
    const field = issue.path.find(isFormFieldName) ?? 'targetValue'
    const messages = grouped.get(field) ?? []
    if (!messages.includes(issue.message)) {
      messages.push(issue.message)
    }
    grouped.set(field, messages)
  }
  return [...grouped].map(([name, errors]) => ({ name, errors }))
}
