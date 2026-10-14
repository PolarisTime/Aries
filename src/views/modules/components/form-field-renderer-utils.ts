import type { FormItemProps } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import type { TFunction } from 'i18next'
import type { ProjectOption } from '@/api/master/project-options'
import {
  getCustomerProjectOptions,
  getSettlementAccountOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleFormFieldDefinition,
  ModuleFormFieldHint,
  ModuleFormFieldOption,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/**
 * FormFieldRenderer 的纯计算部分：选项归一化、校验规则、表单项类名。
 *
 * <p>抽出原因：动态字段渲染组件此前把「选项解析 → 下拉映射 → 校验规则 → 类名拼装」
 * 与 8 个控件分支塞在同一个函数里，控制流复杂度达到 29
 * (react-doctor/no-high-complexity-react-function)。这些计算都不依赖 hooks，
 * 只是把 field 定义映射成 antd 需要的 props，搬成纯函数后组件只剩「选项 +
 * 分发控件」，同时这些映射规则也可以脱离 React 单测。</p>
 */

export type SelectOptionValue = string | number | boolean

export interface SelectOption {
  /** antd 选项类型要求可扩展索引签名(自定义 label/额外字段)。 */
  [key: string]: unknown
  label: string
  value: SelectOptionValue
}

export interface AutoCompleteOption {
  /** antd 选项类型要求可扩展索引签名(自定义 label/额外字段)。 */
  [key: string]: unknown
  label: string
  value: string
}

function normalizeOptionValue(value: unknown): SelectOptionValue {
  return typeof value === 'number' || typeof value === 'boolean'
    ? value
    : asString(value)
}

function normalizeAutoCompleteOptionValue(value: unknown) {
  return typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : asString(value)
}

function getLabelValue(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>
    if ('value' in candidate) {
      return asString(candidate.value)
    }
  }
  return normalizeOptionValue(value)
}

function getSnapshotLabelKey(fieldKey: string) {
  return fieldKey.endsWith('Id') ? fieldKey.replace(/Id$/, 'Name') : ''
}

/** 当前行已落库但不在选项里的值要补一条, 否则编辑旧单时下拉会显示成空。 */
export function withCurrentSnapshotOption(
  fieldKey: string,
  options: SelectOption[],
  formValues: Record<string, unknown>,
) {
  const value = getLabelValue(formValues[fieldKey])
  if (value === '') {
    return options
  }
  if (options.some((option) => String(option.value) === String(value))) {
    return options
  }

  const labelKey = getSnapshotLabelKey(fieldKey)
  const label = labelKey ? asString(formValues[labelKey]).trim() : ''
  if (!label) {
    return options
  }

  return [{ label, value }, ...options]
}

export interface ResolveFieldOptionsInput {
  field: ModuleFormFieldDefinition
  formValues: Record<string, unknown>
  projectOptions: readonly ProjectOption[]
  settlementAccountOptions: readonly ModuleFormFieldOption[]
}

/**
 * 字段选项的三类来源：客户项目(需要表单值 + 已加载的项目下拉)、
 * 结算账户(由外层传入)、以及字段自带的函数/静态数组。
 */
export function resolveFieldOptions({
  field,
  formValues,
  projectOptions,
  settlementAccountOptions,
}: ResolveFieldOptionsInput): readonly ModuleFormFieldOption[] {
  if (typeof field.options !== 'function') {
    return field.options || []
  }
  if (field.options === getCustomerProjectOptions) {
    return getCustomerProjectOptions(formValues, projectOptions)
  }
  if (field.options === getSettlementAccountOptions) {
    return settlementAccountOptions
  }
  return field.options(formValues)
}

export function buildSelectOptions(
  resolvedOptions: readonly ModuleFormFieldOption[],
): SelectOption[] {
  return Array.isArray(resolvedOptions)
    ? resolvedOptions.map((opt) => ({
        label: String(opt.label),
        value: normalizeOptionValue(opt.value),
      }))
    : []
}

export function buildAutoCompleteOptions(
  resolvedOptions: readonly ModuleFormFieldOption[],
): AutoCompleteOption[] {
  return Array.isArray(resolvedOptions)
    ? resolvedOptions.map((opt) => ({
        label: String(opt.label),
        value: normalizeAutoCompleteOptionValue(opt.value),
      }))
    : []
}

/** 必填文案按控件类型区分: 选择类字段说「请选择」, 输入类字段说「请输入」。 */
export function buildFormFieldRules(
  field: ModuleFormFieldDefinition,
  t: TFunction,
  formValues: Record<string, unknown> = {},
): FormItemProps['rules'] {
  const rules: NonNullable<FormItemProps['rules']> = []
  if (field.required) {
    const selectLike =
      field.type === 'select' ||
      field.type === 'multiSelect' ||
      field.type === 'segmented' ||
      field.type === 'date'
    rules.push({
      required: true,
      message: selectLike
        ? t('modules.formField.selectRequired', { label: field.label })
        : t('modules.formField.inputRequired', { label: field.label }),
    })
  }

  // 字段级业务校验（如「固定运费金额需大于 0」）：返回文案即不通过。
  const validate = field.validate
  if (validate) {
    rules.push({
      validator: async (_rule, value) => {
        const message = validate(value, formValues)
        if (message) {
          // antd 用 reject 表达校验不通过，文案直接作为表单错误展示。
          throw new Error(message)
        }
      },
    })
  }

  return rules.length ? rules : undefined
}

/**
 * 字段说明文案：静态串直接返回；函数形式按当前表单值求值，用于随其它字段切换的提示
 * （例如「固定运费模式下单价不作为结算依据」）。空串/null/undefined 一律不展示。
 */
export function resolveFormFieldHint(
  hint: ModuleFormFieldHint | undefined,
  formValues: Record<string, unknown> = {},
): string | undefined {
  if (typeof hint !== 'function') {
    return hint || undefined
  }
  return hint(formValues) || undefined
}

/** 表单项外壳类名: textarea 需要额外的纵向留白, 控件可再追加自己的类名。 */
export function buildFormItemClassName(
  fieldType: ModuleFormFieldDefinition['type'],
  extraClassName?: string,
) {
  return [
    'editor-form-item',
    fieldType === 'textarea' ? 'editor-form-item--textarea' : '',
    extraClassName || '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * 上传控件需要额外的表单项桥接：antd 的 Upload 取值字段是 fileList，
 * 且必须把事件对象规约成数组。它属于「字段定义 → 表单项 props」的映射，
 * 因此与其它纯映射放在一起；控件组件文件则只导出组件，避免
 * react-doctor/only-export-components。
 */
export const UPLOAD_FORM_ITEM_PROPS = {
  valuePropName: 'fileList',
  getValueFromEvent: (event: unknown) => {
    const fileList = (event as { fileList?: UploadFile[] })?.fileList
    return Array.isArray(fileList) ? fileList : []
  },
}

export interface FormFieldItemExtras {
  extraClassName?: string
  itemProps?: {
    valuePropName?: string
    getValueFromEvent?: (event: unknown) => unknown
  }
}

/** 除控件本身外，个别类型还要调整表单项外壳(类名/取值桥接)。 */
export function resolveFormFieldItemExtras(
  fieldType: ModuleFormFieldDefinition['type'],
): FormFieldItemExtras {
  if (fieldType !== 'upload') {
    return {}
  }
  return {
    extraClassName: 'editor-form-item--upload',
    itemProps: UPLOAD_FORM_ITEM_PROPS,
  }
}
