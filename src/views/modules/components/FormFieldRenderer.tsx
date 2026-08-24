import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import {
  getCustomerProjectOptions,
  getSettlementAccountOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleFormFieldDefinition,
  ModuleFormFieldOption,
} from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import {
  DISPLAY_DATE_FORMAT,
  DISPLAY_DATE_TIME_FORMAT,
} from '@/utils/formatters'
import { padLabel } from '@/utils/label-utils'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import { asString } from '@/utils/type-narrowing'

interface Props {
  field: ModuleFormFieldDefinition
  disabled?: boolean
  projectOptions?: readonly ProjectOption[]
  settlementAccountOptions?: readonly ModuleFormFieldOption[]
  financeLayout?: boolean
}

const EMPTY_PROJECT_OPTIONS: readonly ProjectOption[] = []

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

export function FormFieldRenderer({
  field,
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
  const resolvedOptions =
    typeof field.options === 'function'
      ? field.options === getCustomerProjectOptions
        ? getCustomerProjectOptions(formValues, projectOptions)
        : field.options === getSettlementAccountOptions
          ? settlementAccountOptions
          : field.options(formValues)
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

  const renderFormItem = (
    children: ReactNode,
    extraClassName?: string,
    itemProps?: {
      valuePropName?: string
      getValueFromEvent?: (event: unknown) => unknown
    },
  ) => (
    <Form.Item
      key={field.key}
      name={field.key}
      preserve={field.preserve}
      {...buildLabeledFormItemProps({
        label: displayLabel,
        htmlFor: fieldId,
      })}
      rules={rules}
      {...itemProps}
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
          precision={field.precision ?? 2}
          step={field.step}
          controls={field.controls}
          prefix={field.key === 'amount' ? '¥' : undefined}
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
            (field.showTime === true
              ? DISPLAY_DATE_TIME_FORMAT
              : DISPLAY_DATE_FORMAT)
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

    case 'upload':
      return renderFormItem(
        <Upload
          accept="image/*,.pdf,application/pdf"
          beforeUpload={() => false}
          maxCount={5}
          multiple
          listType="text"
          disabled={disabledValue}
        >
          <Button type="dashed" block>
            选择回单或凭证
          </Button>
        </Upload>,
        'editor-form-item--upload',
        {
          valuePropName: 'fileList',
          getValueFromEvent: (event) => {
            const fileList = (event as { fileList?: UploadFile[] })?.fileList
            return Array.isArray(fileList) ? fileList : []
          },
        },
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
