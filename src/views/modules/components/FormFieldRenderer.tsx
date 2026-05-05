import { Form, Input, InputNumber, Select, DatePicker } from 'antd'
import type { ModuleFormFieldDefinition } from '@/types/module-page'

interface Props {
  field: ModuleFormFieldDefinition
}

export function FormFieldRenderer({ field }: Props) {
  const commonProps = {
    placeholder: field.placeholder || `请输入${field.label}`,
    allowClear: field.allowClear !== false,
    disabled: field.disabled,
  }

  switch (field.type) {
    case 'number':
      return (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
        >
          <InputNumber
            {...commonProps}
            min={field.min}
            precision={field.precision || 2}
            style={{ width: '100%' }}
          />
        </Form.Item>
      )

    case 'select':
      return (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={field.required ? [{ required: true, message: `请选择${field.label}` }] : undefined}
        >
          <Select
            {...commonProps}
            options={Array.isArray(field.options) ? field.options.map((opt) => ({
              label: String(opt.label),
              value: opt.value as string | number,
            })) : []}
          />
        </Form.Item>
      )

    case 'date':
      return (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={field.required ? [{ required: true, message: `请选择${field.label}` }] : undefined}
        >
          <DatePicker {...commonProps} style={{ width: '100%' }} />
        </Form.Item>
      )

    case 'textarea':
      return (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
        >
          <Input.TextArea {...commonProps} rows={4} />
        </Form.Item>
      )

    case 'autoComplete':
      return (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
        >
          <Select
            {...commonProps}
            showSearch
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            options={Array.isArray(field.options) ? field.options.map((opt) => ({
              label: String(opt.label),
              value: opt.value as string | number,
            })) : []}
          />
        </Form.Item>
      )

    default:
      return (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
        >
          <Input {...commonProps} />
        </Form.Item>
      )
  }
}
