import DatePicker from 'antd/es/date-picker'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Select from 'antd/es/select'
import type { ReactNode } from 'react'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { padLabel } from '@/utils/label-utils'

type Props = {
  field: ModuleFormFieldDefinition
  disabled?: boolean
}

export function FormFieldRenderer({ field, disabled }: Props) {
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const disabledValue = disabled ?? field.disabled
  const displayLabel = padLabel(field.label)
  const placeholder = field.placeholder || `请输入${field.label}`
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
              ? `请选择${field.label}`
              : `请输入${field.label}`,
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
          style={{ width: '100%' }}
        />,
      )

    case 'select':
      return renderFormItem(
        <Select
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          options={
            Array.isArray(resolvedOptions)
              ? resolvedOptions.map((opt) => ({
                  label: String(opt.label),
                  value: opt.value as string | number,
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
          filterOption={(input, option) =>
            String(option?.label || '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          options={
            Array.isArray(resolvedOptions)
              ? resolvedOptions.map((opt) => ({
                  label: String(opt.label),
                  value: opt.value as string | number,
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
          format="YYYY-MM-DD HH:mm:ss"
          showTime={{ format: 'HH:mm:ss' }}
          style={{ width: '100%' }}
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
          rows={4}
        />,
      )

    case 'autoComplete':
      return renderFormItem(
        <Select
          id={fieldId}
          placeholder={placeholder}
          allowClear={allowClear}
          disabled={disabledValue}
          showSearch
          filterOption={(input, option) =>
            String(option?.label || '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          options={
            Array.isArray(resolvedOptions)
              ? resolvedOptions.map((opt) => ({
                  label: String(opt.label),
                  value: opt.value as string | number,
                }))
              : []
          }
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
        />,
      )
  }
}
