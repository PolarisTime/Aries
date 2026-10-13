import { Form } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { isDocumentReferenceField } from '@/components/document-reference/document-reference-utils'
import type {
  ModuleFormFieldDefinition,
  ModuleFormFieldOption,
} from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { padLabel } from '@/utils/label-utils'
import { renderModuleFormFieldControl } from './FormFieldControls'
import {
  buildAutoCompleteOptions,
  buildFormFieldRules,
  buildFormItemClassName,
  buildSelectOptions,
  resolveFieldOptions,
  resolveFormFieldItemExtras,
} from './form-field-renderer-utils'

interface Props {
  field: ModuleFormFieldDefinition
  moduleKey?: string
  disabled?: boolean
  projectOptions?: readonly ProjectOption[]
  settlementAccountOptions?: readonly ModuleFormFieldOption[]
  financeLayout?: boolean
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
  moduleKey,
  disabled,
  projectOptions = EMPTY_PROJECT_OPTIONS,
  settlementAccountOptions = [],
  financeLayout = false,
}: Props) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const disabledValue = disabled ?? field.disabled
  const displayLabel = financeLayout ? field.label : padLabel(field.label)
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
  const rules = buildFormFieldRules(field, t)
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
      {...itemProps}
      className={buildFormItemClassName(field.type, extraClassName)}
    >
      {children}
    </AccessibleFormItem>
  )

  // 只读的单据引用字段用弹层展示关联单号，其余字段一律交给控件分发。
  const control =
    disabledValue && isDocumentReferenceField(field.key) ? (
      <DocumentReferencePopover
        value={formValues[field.key]}
        fieldKey={field.key}
        moduleKey={moduleKey}
        contextModuleKey={moduleKey}
        documentLabel={field.label}
      />
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
