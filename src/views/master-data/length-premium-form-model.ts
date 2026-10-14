import type { Rule } from 'antd/es/form'
import type { TFunction } from 'i18next'
import {
  LENGTH_PREMIUM_MAX,
  LENGTH_PREMIUM_MAX_NAME_LENGTH,
  LENGTH_PREMIUM_MAX_REMARK_LENGTH,
  LENGTH_PREMIUM_MIN,
  LENGTH_PREMIUM_STATUSES,
  type LengthPremiumInputDraft,
  type LengthPremiumRecord,
  type LengthPremiumStatus,
  parseLengthPremiumStatus,
} from '@/api/master/length-premiums'
import { STATUS } from '@/constants/status-constants'
import type { EntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

/**
 * 定尺加价维护弹窗的表单模型。
 *
 * <p>校验文案与 {@link lengthPremiumInputSchema}（后端 422 的同一套业务不变量）保持一致，
 * 但拆成字段级规则是为了「即时提示」：超长、加价超区间、定尺名称重复都在输入时就能看到，
 * 不必等一次 round-trip 的 422。提交时仍会再用 Zod schema 归一化一次，写路径只有一套口径。</p>
 *
 * <p>加价**允许为负**（表示优惠），因此这里只有区间校验，没有非负校验 —— 负值合法是业务口径，
 * 不是异常输入。</p>
 */

/** 状态下拉的 i18n key：值与后端 `StatusConstants`（正常/禁用）一一对应。 */
export const LENGTH_PREMIUM_STATUS_LABEL_KEYS: Record<
  LengthPremiumStatus,
  string
> = {
  [STATUS.NORMAL]: 'lengthPremium.statusNormal',
  [STATUS.DISABLED]: 'lengthPremium.statusDisabled',
}

/** antd 表单字段值；数字字段允许为空（`InputNumber` 清空后是 null）。 */
export interface LengthPremiumFormValues {
  lengthName: string
  premium: number | null
  sortOrder: number | null
  status: string
  remark?: string | null | undefined
}

/** 新增时的默认值：状态默认「正常」，加价与排序号留空由用户显式给出。 */
export const EMPTY_LENGTH_PREMIUM_FORM_VALUES: LengthPremiumFormValues = {
  lengthName: '',
  premium: null,
  sortOrder: null,
  status: STATUS.NORMAL,
  remark: '',
}

export interface LengthPremiumStatusOption {
  label: string
  value: LengthPremiumStatus
}

export function buildLengthPremiumStatusOptions(
  t: TFunction,
): LengthPremiumStatusOption[] {
  return LENGTH_PREMIUM_STATUSES.map((status) => ({
    value: status,
    label: t(LENGTH_PREMIUM_STATUS_LABEL_KEYS[status]),
  }))
}

export interface LengthPremiumStatusMeta {
  color: string
  label: string
}

/**
 * 状态标签元数据：与 `StatusTag` 的 `statusMap` 结构兼容（其余字段可选）。
 *
 * <p>未知状态不在这里兜底 —— `StatusTag` 会把原值原样显示出来，避免把后端新状态悄悄显示成「正常」。</p>
 */
export function buildLengthPremiumStatusMap(
  t: TFunction,
): Record<string, LengthPremiumStatusMeta> {
  return {
    [STATUS.NORMAL]: {
      color: 'green',
      label: t(LENGTH_PREMIUM_STATUS_LABEL_KEYS[STATUS.NORMAL]),
    },
    [STATUS.DISABLED]: {
      color: 'default',
      label: t(LENGTH_PREMIUM_STATUS_LABEL_KEYS[STATUS.DISABLED]),
    },
  }
}

/** 数字字段的宽松解析：空值/非数字 → null（由规则区分「必填」与「必须为整数」）。 */
function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const text = asString(value).trim()
  if (!text) {
    return null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 加价展示：正数带 `+`、负数带 `-`，让「加价 / 优惠」一眼可分。
 *
 * <p>同一口径只在这里计算：表格列与测试都取该函数的结果，不在渲染处另写一遍算式。</p>
 */
export function formatPremium(value: unknown): string {
  const numberValue = toOptionalNumber(value)
  if (numberValue === null) {
    return '—'
  }
  return numberValue > 0 ? `+${numberValue}` : String(numberValue)
}

/**
 * 在**已加载的记录**里查找同名定尺（trim 后区分大小写精确匹配，与后端
 * `existsByLengthNameAndDeletedFlagFalse` 一致）。
 *
 * <p>只做尽力而为的即时提示：加载的是当前分页，落在别的分页上的冲突查不到，仍由后端
 * 422 兜底。反过来不会误报 —— 查到的都是真实存在的记录。</p>
 */
export function findDuplicateLengthName(
  records: readonly LengthPremiumRecord[],
  lengthName: unknown,
  excludeId?: EntityId | null,
): LengthPremiumRecord | null {
  const target = asString(lengthName).trim()
  if (!target) {
    return null
  }
  const excluded = excludeId ? String(excludeId) : ''
  return (
    records.find(
      (record) =>
        record.lengthName === target && (!excluded || record.id !== excluded),
    ) ?? null
  )
}

export interface LengthPremiumRuleContext {
  t: TFunction
  /** 当前已加载的记录，用于定尺名称重复的即时提示。 */
  records: readonly LengthPremiumRecord[]
  /** 编辑中的记录 ID；新增时为 null。 */
  editingId: EntityId | null
}

function reject(message: string): Promise<never> {
  return Promise.reject(new Error(message))
}

/** 定尺名称：必填、≤32、同名不重复。 */
export function buildLengthNameRules(
  context: LengthPremiumRuleContext,
): Rule[] {
  const { t, records, editingId } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const text = asString(value).trim()
        if (!text) {
          return reject(t('lengthPremium.lengthNameRequired'))
        }
        if (text.length > LENGTH_PREMIUM_MAX_NAME_LENGTH) {
          return reject(t('lengthPremium.lengthNameTooLong'))
        }
        const duplicate = findDuplicateLengthName(records, text, editingId)
        if (duplicate) {
          return reject(
            t('lengthPremium.lengthNameDuplicate', {
              value: duplicate.lengthName,
            }),
          )
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 加价：必填、整数、区间 -100000..100000（负值合法，表示优惠）。 */
export function buildPremiumRules(context: LengthPremiumRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const numberValue = toOptionalNumber(value)
        if (numberValue === null) {
          return reject(t('lengthPremium.premiumRequired'))
        }
        if (!Number.isInteger(numberValue)) {
          return reject(t('lengthPremium.premiumInteger'))
        }
        if (numberValue < LENGTH_PREMIUM_MIN) {
          return reject(t('lengthPremium.premiumMin'))
        }
        if (numberValue > LENGTH_PREMIUM_MAX) {
          return reject(t('lengthPremium.premiumMax'))
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 排序号：必填、非负整数（后端 `@NotNull` + `@Min(0)`）。 */
export function buildSortOrderRules(context: LengthPremiumRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const numberValue = toOptionalNumber(value)
        if (numberValue === null) {
          return reject(t('lengthPremium.sortOrderRequired'))
        }
        if (!Number.isInteger(numberValue)) {
          return reject(t('lengthPremium.sortOrderInteger'))
        }
        if (numberValue < 0) {
          return reject(t('lengthPremium.sortOrderNegative'))
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 状态：必选且在白名单内（合法值只有「正常」与「禁用」）。 */
export function buildStatusRules(context: LengthPremiumRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) =>
        parseLengthPremiumStatus(value)
          ? Promise.resolve()
          : reject(
              asString(value).trim()
                ? t('lengthPremium.statusInvalid')
                : t('lengthPremium.statusRequired'),
            ),
    },
  ]
}

/** 备注：可空、≤255。 */
export function buildRemarkRules(context: LengthPremiumRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) =>
        asString(value).trim().length > LENGTH_PREMIUM_MAX_REMARK_LENGTH
          ? reject(t('lengthPremium.remarkTooLong'))
          : Promise.resolve(),
    },
  ]
}

export interface LengthPremiumFormRules {
  lengthName: Rule[]
  premium: Rule[]
  sortOrder: Rule[]
  status: Rule[]
  remark: Rule[]
}

export function buildLengthPremiumFormRules(
  context: LengthPremiumRuleContext,
): LengthPremiumFormRules {
  return {
    lengthName: buildLengthNameRules(context),
    premium: buildPremiumRules(context),
    sortOrder: buildSortOrderRules(context),
    status: buildStatusRules(context),
    remark: buildRemarkRules(context),
  }
}

/** 记录 → 表单值（编辑态）。 */
export function toLengthPremiumFormValues(
  record: LengthPremiumRecord,
): LengthPremiumFormValues {
  return {
    lengthName: record.lengthName,
    premium: record.premium,
    sortOrder: record.sortOrder,
    // 未知状态原样回填：下拉会显示原值，保存时由白名单规则拦住，而不是悄悄改成「正常」。
    status: asString(record.status).trim(),
    remark: record.remark ?? '',
  }
}

/**
 * 表单值 → 写入请求体草稿：字符串一律 trim，空备注不下发。
 *
 * <p>数值归一（补零、区间）交给 Zod schema（`lengthPremiumInputSchema`），
 * 这里只把 antd 的空值（null）原样传出，由 schema 报「不能为空」。</p>
 */
export function toLengthPremiumInputDraft(
  values: LengthPremiumFormValues,
): LengthPremiumInputDraft {
  const remark = asString(values.remark).trim()
  return {
    lengthName: asString(values.lengthName).trim(),
    premium: toOptionalNumber(values.premium),
    sortOrder: toOptionalNumber(values.sortOrder),
    status: asString(values.status).trim(),
    ...(remark ? { remark } : {}),
  }
}

/** Zod issue 的最小结构（避免这里依赖 zod 的内部类型名）。 */
export interface LengthPremiumIssue {
  path: readonly PropertyKey[]
  message: string
}

export interface LengthPremiumFieldError {
  name: keyof LengthPremiumFormValues
  errors: string[]
}

const FORM_FIELD_NAMES: ReadonlySet<string> = new Set([
  'lengthName',
  'premium',
  'sortOrder',
  'status',
  'remark',
])

function isFormFieldName(
  value: PropertyKey,
): value is keyof LengthPremiumFormValues {
  return typeof value === 'string' && FORM_FIELD_NAMES.has(value)
}

/**
 * Zod 校验失败 → antd `form.setFields` 需要的字段错误。
 *
 * <p>单个字段的多条 issue 归并到同一个 `errors` 数组；字段名不在表单里的 issue
 * （理论上只有根级问题）挂到 `lengthName`，保证错误不会被静默丢弃。</p>
 */
export function toLengthPremiumFieldErrors(
  issues: readonly LengthPremiumIssue[],
): LengthPremiumFieldError[] {
  const grouped = new Map<keyof LengthPremiumFormValues, string[]>()
  for (const issue of issues) {
    const field = issue.path.find(isFormFieldName) ?? 'lengthName'
    const messages = grouped.get(field) ?? []
    if (!messages.includes(issue.message)) {
      messages.push(issue.message)
    }
    grouped.set(field, messages)
  }
  return [...grouped].map(([name, errors]) => ({ name, errors }))
}
