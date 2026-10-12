import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Upload,
} from 'antd'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import {
  DISPLAY_DATE_FORMAT,
  DISPLAY_DATE_TIME_FORMAT,
} from '@/utils/formatters'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import {
  type AutoCompleteOption,
  type SelectOption,
  withCurrentSnapshotOption,
} from './form-field-renderer-utils'

/**
 * FormFieldRenderer 的控件层：按字段类型渲染对应的 antd 控件。
 *
 * <p>抽出原因：原来 8 个 case 的 JSX 与选项解析、校验规则挤在一个函数里，
 * 控制流复杂度 29 (react-doctor/no-high-complexity-react-function)。
 * 每个控件只有 0~2 个分支，拆开后父组件只做「选项 + 分发」，也更容易单独核对
 * 每个控件的 props 是否与改造前一致（DOM/aria/类名必须逐字不变）。</p>
 */

interface BaseControlProps {
  field: ModuleFormFieldDefinition
  fieldId: string
  /** 与改造前一致: disabled 与 field.disabled 都未设置时透传 undefined 给控件。 */
  disabledValue: boolean | undefined
  placeholder: string
  allowClear: boolean
}

interface OptionsControlProps extends BaseControlProps {
  formValues: Record<string, unknown>
  selectOptions: SelectOption[]
  autoCompleteOptions: AutoCompleteOption[]
}

function NumberFieldControl({
  field,
  fieldId,
  disabledValue,
  placeholder,
}: BaseControlProps) {
  return (
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
    />
  )
}

function SelectFieldControl({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
  selectOptions,
  formValues,
}: OptionsControlProps) {
  return (
    <Select
      id={fieldId}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabledValue}
      showSearch={{ filterOption: createPinyinFilterOption() }}
      optionLabelProp="label"
      options={withCurrentSnapshotOption(field.key, selectOptions, formValues)}
    />
  )
}

function MultiSelectFieldControl({
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
  selectOptions,
}: OptionsControlProps) {
  return (
    <Select
      id={fieldId}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabledValue}
      mode="multiple"
      showSearch={{ filterOption: createPinyinFilterOption() }}
      optionLabelProp="label"
      options={selectOptions}
    />
  )
}

function DateFieldControl({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
}: BaseControlProps) {
  return (
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
    />
  )
}

function TextareaFieldControl({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
}: BaseControlProps) {
  return (
    <Input.TextArea
      id={fieldId}
      name={field.key}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabledValue}
      maxLength={field.maxLength}
      showCount={field.showCount}
      rows={4}
    />
  )
}

function UploadFieldControl({ disabledValue }: BaseControlProps) {
  return (
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
    </Upload>
  )
}

function AutoCompleteFieldControl({
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
  autoCompleteOptions,
}: OptionsControlProps) {
  return (
    <AutoComplete
      id={fieldId}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabledValue}
      showSearch={{ filterOption: createPinyinFilterOption() }}
      options={autoCompleteOptions}
    />
  )
}

function TextFieldControl({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
}: BaseControlProps) {
  return (
    <Input
      id={fieldId}
      name={field.key}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabledValue}
      maxLength={field.maxLength}
    />
  )
}

/** 按字段类型分发控件；未知类型回落到普通文本输入。 */
export function ModuleFormFieldControl(props: OptionsControlProps) {
  switch (props.field.type) {
    case 'number':
      return <NumberFieldControl {...props} />
    case 'select':
      return <SelectFieldControl {...props} />
    case 'multiSelect':
      return <MultiSelectFieldControl {...props} />
    case 'date':
      return <DateFieldControl {...props} />
    case 'textarea':
      return <TextareaFieldControl {...props} />
    case 'upload':
      return <UploadFieldControl {...props} />
    case 'autoComplete':
      return <AutoCompleteFieldControl {...props} />
    default:
      return <TextFieldControl {...props} />
  }
}
