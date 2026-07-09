import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const formMocks = vi.hoisted(() => ({
  watchedValues: {} as any,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd', () => {
  const DatePicker = ({
    id,
    placeholder,
    allowClear,
    disabled,
    format,
    showTime,
  }: any) => (
    <input
      data-testid="date-picker"
      data-allow-clear={String(Boolean(allowClear))}
      data-format={String(format || '')}
      data-show-time={showTime === false ? 'false' : String(Boolean(showTime))}
      id={id}
      placeholder={placeholder}
      disabled={disabled}
    />
  )

  const formInstance = {
    getFieldValue: vi.fn(),
    getFieldsValue: vi.fn(),
  }
  const Form = {
    useFormInstance: () => formInstance,
    useWatch: () => formMocks.watchedValues,
    Item: ({ children, name, ...props }: any) => (
      <div
        data-testid={`form-item-${name}`}
        data-rules={JSON.stringify(props.rules ?? [])}
        {...props}
      >
        {children}
      </div>
    ),
  }

  const Input = ({ id, placeholder, allowClear, disabled, maxLength }: any) => (
    <input
      data-testid="input"
      data-allow-clear={String(Boolean(allowClear))}
      id={id}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
    />
  )
  Input.TextArea = ({
    id,
    placeholder,
    allowClear,
    disabled,
    maxLength,
    showCount,
    rows,
  }: any) => (
    <textarea
      data-testid="textarea"
      data-allow-clear={String(Boolean(allowClear))}
      data-show-count={String(Boolean(showCount))}
      data-rows={String(rows || '')}
      id={id}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
    />
  )

  return {
    AutoComplete: ({
      id,
      placeholder,
      allowClear,
      disabled,
      options,
      showSearch,
    }: any) => (
      <input
        data-testid="autocomplete"
        data-allow-clear={String(Boolean(allowClear))}
        data-options={JSON.stringify(options)}
        data-show-search={String(Boolean(showSearch))}
        id={id}
        placeholder={placeholder}
        disabled={disabled}
      />
    ),
    DatePicker,
    Form,
    Input,
    InputNumber: ({
      id,
      placeholder,
      controls,
      disabled,
      min,
      precision,
      step,
    }: any) => (
      <input
        data-testid="input-number"
        data-controls={String(controls)}
        data-min={String(min || '')}
        data-precision={String(precision || '')}
        data-step={String(step || '')}
        id={id}
        placeholder={placeholder}
        disabled={disabled}
      />
    ),
    Select: ({
      id,
      placeholder,
      allowClear,
      disabled,
      mode,
      options,
      optionLabelProp,
      showSearch,
    }: any) => (
      <select
        data-testid="select"
        data-allow-clear={String(Boolean(allowClear))}
        data-mode={String(mode || '')}
        data-option-label-prop={String(optionLabelProp || '')}
        data-options={JSON.stringify(options)}
        data-show-search={String(Boolean(showSearch))}
        id={id}
        disabled={disabled}
        aria-label={placeholder}
      />
    ),
  }
})

vi.mock('@/utils/form-control-a11y', () => ({
  buildLabeledFormItemProps: ({ label, htmlFor }: any) => ({
    label,
    htmlFor,
  }),
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (prefix: string, key: string) => `${prefix}-${key}`,
}))

vi.mock('@/utils/label-utils', () => ({
  padLabel: (label: string) => label,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (value: any) => String(value),
}))

import { FormFieldRenderer } from '@/views/modules/components/FormFieldRenderer'

describe('FormFieldRenderer', () => {
  const defaultProps = {
    field: {
      key: 'test-field',
      label: 'Test Field',
      type: 'text',
      required: false,
      disabled: false,
      placeholder: 'Enter value',
      allowClear: true,
      options: [],
    },
    disabled: false,
  }

  beforeEach(() => {
    formMocks.watchedValues = {}
  })

  it('renders text input by default', () => {
    render(<FormFieldRenderer {...defaultProps} />)
    expect(screen.getByTestId('input')).toBeTruthy()
  })

  it('renders number input for number type', () => {
    const props = {
      ...defaultProps,
      field: { ...defaultProps.field, type: 'number' },
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('input-number')).toBeTruthy()
  })

  it('passes number field input options', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'number',
        min: 0.01,
        precision: 2,
        step: 0.01,
        controls: false,
      },
    }
    render(<FormFieldRenderer {...props} />)

    const input = screen.getByTestId('input-number')
    expect(input).toHaveAttribute('data-min', '0.01')
    expect(input).toHaveAttribute('data-precision', '2')
    expect(input).toHaveAttribute('data-step', '0.01')
    expect(input).toHaveAttribute('data-controls', 'false')
  })

  it('renders select for select type', () => {
    const props = {
      ...defaultProps,
      field: { ...defaultProps.field, type: 'select' },
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('normalizes select options and required select rule', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        placeholder: '',
        required: true,
        type: 'select',
        options: [
          { label: 123, value: 1 },
          { label: 'Enabled', value: true },
          { label: 'Code', value: 'A001' },
        ],
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('select')).toHaveAttribute(
      'data-options',
      JSON.stringify([
        { label: '123', value: 1 },
        { label: 'Enabled', value: true },
        { label: 'Code', value: 'A001' },
      ]),
    )
    expect(
      screen.getByLabelText('modules.formField.inputPlaceholder'),
    ).toBeTruthy()
    expect(screen.getByTestId('form-item-test-field')).toHaveAttribute(
      'data-rules',
      JSON.stringify([
        {
          required: true,
          message: 'modules.formField.selectRequired',
        },
      ]),
    )
  })

  it('renders multi-select with options resolved from form values', () => {
    const options = vi.fn(() => [
      { label: 'Alpha', value: false },
      { label: 'Beta', value: 'beta' },
    ])
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'multiSelect',
        options,
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(options).toHaveBeenCalledWith({})
    expect(screen.getByTestId('select')).toHaveAttribute(
      'data-mode',
      'multiple',
    )
    expect(screen.getByTestId('select')).toHaveAttribute(
      'data-options',
      JSON.stringify([
        { label: 'Alpha', value: false },
        { label: 'Beta', value: 'beta' },
      ]),
    )
  })

  it('falls back to empty select options when resolved options are not an array', () => {
    formMocks.watchedValues = undefined
    const options = vi.fn(() => null)
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'select',
        options,
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(options).toHaveBeenCalledWith({})
    expect(screen.getByTestId('select')).toHaveAttribute('data-options', '[]')
  })

  it('falls back to empty select options when no options are configured', () => {
    const { options: _options, ...fieldWithoutOptions } = defaultProps.field
    const props = {
      ...defaultProps,
      field: {
        ...fieldWithoutOptions,
        type: 'select',
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('select')).toHaveAttribute('data-options', '[]')
  })

  it('adds current settlement company snapshot when select options do not contain the value', () => {
    formMocks.watchedValues = {
      settlementCompanyId: '8',
      settlementCompanyName: '结算主体A',
    }
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        key: 'settlementCompanyId',
        type: 'select',
        options: [],
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('select')).toHaveAttribute(
      'data-options',
      JSON.stringify([{ label: '结算主体A', value: '8' }]),
    )
    expect(screen.getByTestId('select')).toHaveAttribute(
      'data-option-label-prop',
      'label',
    )
  })

  it('falls back to empty multi-select options when resolved options are not an array', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'multiSelect',
        options: () => null,
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('select')).toHaveAttribute('data-options', '[]')
  })

  it('renders date picker for date type', () => {
    const props = {
      ...defaultProps,
      field: { ...defaultProps.field, type: 'date' },
    }
    render(<FormFieldRenderer {...props} />)
    const datePicker = screen.getByTestId('date-picker')
    expect(datePicker).toBeTruthy()
    expect(datePicker).toHaveAttribute('data-format', 'YYYY-MM-DD')
    expect(datePicker).toHaveAttribute('data-show-time', 'false')
  })

  it('passes date field display options', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'date',
        allowClear: false,
        dateFormat: 'YYYY-MM-DD',
        showTime: false,
      },
    }
    render(<FormFieldRenderer {...props} />)

    const datePicker = screen.getByTestId('date-picker')
    expect(datePicker).toHaveAttribute('data-format', 'YYYY-MM-DD')
    expect(datePicker).toHaveAttribute('data-show-time', 'false')
    expect(datePicker).toHaveAttribute('data-allow-clear', 'false')
  })

  it('enables time selection only when explicitly configured', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'date',
        showTime: true,
      },
    }
    render(<FormFieldRenderer {...props} />)

    const datePicker = screen.getByTestId('date-picker')
    expect(datePicker).toHaveAttribute('data-format', 'YYYY-MM-DD HH:mm:ss')
    expect(datePicker).toHaveAttribute('data-show-time', 'true')
  })

  it('renders textarea for textarea type', () => {
    const props = {
      ...defaultProps,
      field: { ...defaultProps.field, type: 'textarea' },
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('textarea')).toBeTruthy()
  })

  it('passes text length options', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        maxLength: 64,
      },
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('input')).toHaveAttribute('maxlength', '64')
  })

  it('passes textarea count options', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'textarea',
        maxLength: 500,
        showCount: true,
      },
    }
    render(<FormFieldRenderer {...props} />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('maxlength', '500')
    expect(textarea).toHaveAttribute('data-show-count', 'true')
  })

  it('renders auto-complete and stringifies numeric or boolean values', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'autoComplete',
        options: [
          { label: 'Number', value: 12 },
          { label: 'Boolean', value: false },
          { label: 'String', value: 'text' },
        ],
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('autocomplete')).toHaveAttribute(
      'data-show-search',
      'true',
    )
    expect(screen.getByTestId('autocomplete')).toHaveAttribute(
      'data-options',
      JSON.stringify([
        { label: 'Number', value: '12' },
        { label: 'Boolean', value: 'false' },
        { label: 'String', value: 'text' },
      ]),
    )
  })

  it('falls back to empty auto-complete options when resolved options are not an array', () => {
    const props = {
      ...defaultProps,
      field: {
        ...defaultProps.field,
        type: 'autoComplete',
        options: () => null,
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('autocomplete')).toHaveAttribute(
      'data-options',
      '[]',
    )
  })

  it('uses field disabled state and required input rule when outer disabled is absent', () => {
    const props = {
      field: {
        ...defaultProps.field,
        disabled: true,
        required: true,
      },
    }
    render(<FormFieldRenderer {...props} />)

    expect(screen.getByTestId('input')).toBeDisabled()
    expect(screen.getByTestId('form-item-test-field')).toHaveAttribute(
      'data-rules',
      JSON.stringify([
        {
          required: true,
          message: 'modules.formField.inputRequired',
        },
      ]),
    )
  })

  it('renders with disabled state', () => {
    const props = {
      ...defaultProps,
      disabled: true,
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('input')).toBeTruthy()
  })
})
