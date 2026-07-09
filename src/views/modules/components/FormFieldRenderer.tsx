import {
  AutoComplete,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
} from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { padLabel } from '@/utils/label-utils'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import { asString } from '@/utils/type-narrowing'

interface Props {
  field: ModuleFormFieldDefinition
  disabled?: boolean
}

type SelectOptionValue = string | number | boolean

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

function withCurrentSnapshotOption(
  fieldKey: string,
  options: Array<{ label: string; value: SelectOptionValue }>,
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

export function FormFieldRenderer({ field, disabled }: Props) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const disabledValue = disabled ?? field.disabled
  const displayLabel = padLabel(field.label)
  const placeholder =
    field.placeholder ||
    t('modules.formField.inputPlaceholder', { label: field.label })
  const allowClear = field.allowClear !== false
  const fieldId = buildFormControlId('module-form', field.key)
  const resolvedOptions =
    typeof field.options === 'function'
      ? field.options(formValues)
      : field.options || []
  const selectOptions = Array.isArray(resolvedOptions)
    ? resolvedOptions.map((opt) => ({
        label: String(opt.label),
        value: normalizeOptionValue(opt.value),
      }))
    : []
  const autoCompleteOptions = Array.isArray(resolvedOptions)
    ? resolvedOptions.map((opt) => ({
        label: String(opt.label),
        value: normalizeAutoCompleteOptionValue(opt.value),
      }))
    : []

  const rules = field.required
    ? [
        {
          required: true,
          message:
            field.type === 'select' ||
            field.type === 'multiSelect' ||
            field.type === 'date'
              ? t('modules.formField.selectRequired', { label: field.label })
              : t('modules.formField.inputRequired', { label: field.label }),
        },
      ]
    : undefined

  const renderFormItem = (children: ReactNode, extraClassName?: string) => (
    <Form.Item
      key={field.key}
      name={field.key}
      {...buildLabeledFormItemProps({
        label: displayLabel,
        htmlFor: fieldId,
      })}
      rules={rules}
      className={[
        'editor-form-item',
        field.type === 'textarea' ? 'editor-form-item--textarea' : '',
        extraClassName || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Form.Item>
  )

  switch (field.type) {
    case 'number':
      return renderFormItem(
        <InputNumber
          id={fieldId}
          name={field.key}
          placeholder={placeholder}
          disabled={disabledValue}
          min={field.min}
          precision={field.precision || 2}
          step={field.step}
          controls={field.controls}
          className="w-full"
        />,
      )

    case 'select':
      return renderFormItem(
        <Select
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          showSearch={{ filterOption: createPinyinFilterOption() }}
          optionLabelProp="label"
          options={withCurrentSnapshotOption(
            field.key,
            selectOptions,
            formValues,
          )}
        />,
      )

    case 'multiSelect':
      return renderFormItem(
        <Select
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          mode="multiple"
          showSearch={{ filterOption: createPinyinFilterOption() }}
          optionLabelProp="label"
          options={selectOptions}
        />,
      )

    case 'date':
      return renderFormItem(
        <DatePicker
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          format={
            field.dateFormat ||
            (field.showTime === true ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD')
          }
          showTime={field.showTime === true ? { format: 'HH:mm:ss' } : false}
          className="w-full"
        />,
      )

    case 'textarea':
      return renderFormItem(
        <Input.TextArea
          id={fieldId}
          name={field.key}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          maxLength={field.maxLength}
          showCount={field.showCount}
          rows={4}
        />,
      )

    case 'autoComplete':
      return renderFormItem(
        <AutoComplete
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          showSearch={{ filterOption: createPinyinFilterOption() }}
          options={autoCompleteOptions}
        />,
      )

    default:
      return renderFormItem(
        <Input
          id={fieldId}
          name={field.key}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          maxLength={field.maxLength}
        />,
      )
  }
}
