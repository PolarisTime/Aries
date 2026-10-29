import { Form } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'
import {
  formatDocumentReferenceText,
  isDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import type {
  ModuleFormFieldDefinition,
  ModuleFormFieldOption,
} from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { renderModuleFormFieldControl } from './FormFieldControls'
import {
  buildAutoCompleteOptions,
  buildFormFieldRules,
  buildFormItemClassName,
  buildSelectOptions,
  resolveFieldOptions,
  resolveFormFieldHint,
  resolveFormFieldItemExtras,
} from './form-field-renderer-utils'

interface Props {
  field: ModuleFormFieldDefinition
  disabled?: boolean
  projectOptions?: readonly ProjectOption[]
  settlementAccountOptions?: readonly ModuleFormFieldOption[]
}

const EMPTY_PROJECT_OPTIONS: readonly ProjectOption[] = []

/**
 * 动态表单字段渲染器。
 *
 * <p>职责在本次重构后收敛为三件事：把字段定义解析成选项/校验规则、套上无障碍表单项
 * 外壳、把控件渲染委派给 FormFieldControls。此前「选项解析 + 校验规则 + 类名拼装 +
 * 8 个控件分支」全在一个函数里，控制流复杂度 29，超出 react-doctor 阈值
 * (no-high-complexity-react-function)。</p>
 *
 * <p>DOM 结构、aria 契约、类名与文案保持逐字不变：AccessibleFormItem 仍是唯一外壳，
 * 取值桥接（upload 的 fileList）仍走同一个 itemProps。</p>
 */
export function FormFieldRenderer({
  field,
  disabled,
  projectOptions = EMPTY_PROJECT_OPTIONS,
  settlementAccountOptions = [],
}: Props) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const disabledValue = disabled ?? field.disabled
  /*
   * 标签直接用原文，不再做全角空格补齐（padLabel）。
   * 横向布局下标签列的对齐由 CSS 的 `min-width: var(--app-editor-label-width)` +
   * 右对齐 + 省略号统一提供；再用全角空格补齐只会占用标签的可见宽度预算，让长标签
   * 更早被截断，在纵向布局下还会变成可见左缩进。
   */
  const displayLabel = field.label
  const placeholder =
    field.placeholder ||
    t('modules.formField.inputPlaceholder', { label: field.label })
  const allowClear = field.allowClear !== false
  const fieldId = buildFormControlId('module-form', field.key)
  const resolvedOptions = resolveFieldOptions({
    field,
    formValues,
    projectOptions,
    settlementAccountOptions,
  })
  const rules = buildFormFieldRules(field, t, formValues)
  const extra = resolveFormFieldHint(field.extra, formValues)
  const tooltip = resolveFormFieldHint(field.tooltip, formValues)
  const { extraClassName, itemProps } = resolveFormFieldItemExtras(field.type)

  const renderFormItem = (children: ReactNode) => (
    <AccessibleFormItem
      key={field.key}
      name={field.key}
      preserve={field.preserve}
      {...buildLabeledFormItemProps({
        label: displayLabel,
        htmlFor: fieldId,
      })}
      rules={rules}
      extra={extra}
      tooltip={tooltip}
      {...itemProps}
      className={buildFormItemClassName(field.type, extraClassName)}
    >
      {children}
    </AccessibleFormItem>
  )

  /*
   * 只读字段的唯一渲染出口：
   * - 单据引用字段（单号）无论因何禁用，都显示纯文本（口径见 formatDocumentReferenceText）；
   * - 配置层 `disabled: true` 的**文本类**字段（input / textarea）同样显示纯文本 —— 灰色
   *   禁用输入框看起来仍像能输入，与被禁用的语义不符；
   * - select / date / number 等仍走禁用控件：它们的显示值需要选项或格式解析，改成纯文本
   *   会露出原始 id 或未格式化的值。
   * 表单值仍由 Form.Item 的 name 承载，纯文本不会改变提交载荷。
   */
  const readOnlyText = (() => {
    if (!disabledValue) return null
    if (isDocumentReferenceField(field.key)) {
      return formatDocumentReferenceText(formValues[field.key]) || '-'
    }
    if (field.disabled === true && isTextualFieldType(field.type)) {
      return formatReadOnlyFieldValue(formValues[field.key])
    }
    return null
  })()

  const control =
    readOnlyText !== null ? (
      <span id={fieldId} className="editor-form-readonly-text">
        {readOnlyText}
      </span>
    ) : (
      renderModuleFormFieldControl({
        field,
        fieldId,
        disabledValue,
        placeholder,
        allowClear,
        formValues,
        selectOptions: buildSelectOptions(resolvedOptions),
        autoCompleteOptions: buildAutoCompleteOptions(resolvedOptions),
      })
    )

  return renderFormItem(control)
}

/** 文本类字段：可以安全地用纯文本回显（值本身就是最终展示值）。 */
function isTextualFieldType(type: ModuleFormFieldDefinition['type']) {
  return type === 'input' || type === 'textarea'
}

/** 纯文本回显：空值统一显示为 '-'，与单据引用字段口径一致。 */
function formatReadOnlyFieldValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value)
}
