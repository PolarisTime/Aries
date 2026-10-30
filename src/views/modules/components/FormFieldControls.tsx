import { InfoCircleOutlined } from '@ant-design/icons'
import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Segmented,
  Select,
  Upload,
} from 'antd'
import type { ReactElement } from 'react'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import {
  DATE_PICKER_FORMATS,
  DATE_TIME_PICKER_FORMATS,
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
      max={field.max}
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
  const options = withCurrentSnapshotOption(
    field.key,
    selectOptions,
    formValues,
  )
  /*
   * 空态文案: antd 默认只说"暂无数据", 用户看不出是"确实没数据"还是"要先选上游字段"。
   * 字段可声明 emptyHint, 没声明时保持 antd 默认行为(不改变其它字段的既有表现)。
   *
   * 用 InfoCircle 图标 + 短句而不是裸文本: 下拉面板默认宽度跟着输入框走(约 200px), 一句话
   * 会被折成四五行、每行三四个字, 反而更难读。图标给出"这是说明"的语义, 配合 CSS 的
   * 最小宽度让整句在有限行内读完。
   */
  const emptyHint = field.emptyHint
  return (
    <Select
      id={fieldId}
      popupMatchSelectWidth={emptyHint ? 320 : undefined}
      notFoundContent={
        options.length === 0 && emptyHint ? (
          <div className="module-select-empty-hint">
            <InfoCircleOutlined aria-hidden="true" />
            <span>{emptyHint}</span>
          </div>
        ) : undefined
      }
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabledValue}
      showSearch={{ filterOption: createPinyinFilterOption() }}
      optionLabelProp="label"
      options={options}
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

/**
 * 少量互斥选项用分段控制器：antd Segmented 的 `onChange` 直接给值（不是事件对象），
 * Form.Item 的默认取值桥接在「没有 target 时原样返回值」，因此无需额外 itemProps。
 *
 * <p>**不用 `block`**：`block` 会把选项拉伸到父容器整宽，2-3 个短选项（如「按吨位结算 /
 * 固定运费」）落在一个 12 栅格的宽单元格里时，两个选项会被撑到各占半屏，文字散在两端，
 * 视觉上不成组。这里保持 antd 默认的内容宽度，让两个选项紧贴成一个分段控件的整体。</p>
 */
function segmentedFieldElement({
  fieldId,
  disabledValue,
  selectOptions,
}: OptionsControlProps): ReactElement {
  return (
    <Segmented
      id={fieldId}
      disabled={disabledValue}
      options={selectOptions.map((option) => ({
        label: option.label,
        value: String(option.value),
      }))}
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
          ? DATE_TIME_PICKER_FORMATS
          : DATE_PICKER_FORMATS)
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
    case 'segmented':
      return segmentedFieldElement(props)
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
