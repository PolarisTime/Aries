import AutoComplete from 'antd/es/auto-complete'
import DatePicker from 'antd/es/date-picker'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Select from 'antd/es/select'
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
          showSearch
          filterOption={createPinyinFilterOption()}
          options={
            Array.isArray(resolvedOptions)
              ? resolvedOptions.map((opt) => ({
                  label: String(opt.label),
                  value:
                    typeof opt.value === 'number' ||
                    typeof opt.value === 'boolean'
                      ? opt.value
                      : asString(opt.value),
                }))
              : []
          }
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
          showSearch
          filterOption={createPinyinFilterOption()}
          options={
            Array.isArray(resolvedOptions)
              ? resolvedOptions.map((opt) => ({
                  label: String(opt.label),
                  value:
                    typeof opt.value === 'number' ||
                    typeof opt.value === 'boolean'
                      ? opt.value
                      : asString(opt.value),
                }))
              : []
          }
        />,
      )

    case 'date':
      return renderFormItem(
        <DatePicker
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          format={field.dateFormat || 'YYYY-MM-DD HH:mm:ss'}
          showTime={field.showTime === false ? false : { format: 'HH:mm:ss' }}
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
          options={
            Array.isArray(resolvedOptions)
              ? resolvedOptions.map((opt) => ({
                  label: String(opt.label),
                  value:
                    typeof opt.value === 'number' ||
                    typeof opt.value === 'boolean'
                      ? String(opt.value)
                      : asString(opt.value),
                }))
              : []
          }
          filterOption={createPinyinFilterOption()}
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
