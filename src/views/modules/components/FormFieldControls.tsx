import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Upload,
} from 'antd'
import type { ReactElement } from 'react'
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
 * 控制流复杂度 29 (react-doctor/no-high-complexity-react-function)。</p>
 *
 * <p><b>必须返回元素而不是渲染组件</b>：Form.Item 通过 cloneElement 把 `value`/`onChange`
 * 注入到它的**直接子元素**上。若这些分支返回 `<XxxFieldControl/>` 这类自定义组件元素，
 * 注入会落在中间组件上并被 props 解构丢掉，控件变成非受控 —— 用户选了下拉只看到标签，
 * 表单里始终没有值，依赖该值的下游查询（按客户拉项目）永不触发且没有任何报错。</p>
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

function numberFieldElement({
  field,
  fieldId,
  disabledValue,
  placeholder,
}: BaseControlProps): ReactElement {
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

function selectFieldElement({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
  selectOptions,
  formValues,
}: OptionsControlProps): ReactElement {
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

function multiSelectFieldElement({
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
  selectOptions,
}: OptionsControlProps): ReactElement {
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

function dateFieldElement({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
}: BaseControlProps): ReactElement {
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

function textareaFieldElement({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
}: BaseControlProps): ReactElement {
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

function uploadFieldElement({ disabledValue }: BaseControlProps): ReactElement {
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

function autoCompleteFieldElement({
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
  autoCompleteOptions,
}: OptionsControlProps): ReactElement {
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

function textFieldElement({
  field,
  fieldId,
  disabledValue,
  placeholder,
  allowClear,
}: BaseControlProps): ReactElement {
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

/**
 * 按字段类型分发控件；未知类型回落到普通文本输入。
 *
 * <p>必须以**函数调用**方式使用（见 FormFieldRenderer：`renderModuleFormFieldControl(props)`）。
 * Form.Item 通过 cloneElement 向它的**直接子元素**注入 `value`/`onChange`；若这里返回自定义组件
 * 元素，注入会落在中间组件上并被 props 解构丢掉，控件随即变成非受控——下拉只显示标签、
 * 表单里永远没有值，依赖该值的下游查询（按客户拉项目）永不触发。</p>
 */
export function renderModuleFormFieldControl(
  props: OptionsControlProps,
): ReactElement {
  switch (props.field.type) {
    case 'number':
      return numberFieldElement(props)
    case 'select':
      return selectFieldElement(props)
    case 'multiSelect':
      return multiSelectFieldElement(props)
    case 'date':
      return dateFieldElement(props)
    case 'textarea':
      return textareaFieldElement(props)
    case 'upload':
      return uploadFieldElement(props)
    case 'autoComplete':
      return autoCompleteFieldElement(props)
    default:
      return textFieldElement(props)
  }
}
