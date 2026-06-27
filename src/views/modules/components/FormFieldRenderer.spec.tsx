import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
    useWatch: () => ({}),
    Item: ({ children, name, ...props }: any) => (
      <div data-testid={`form-item-${name}`} {...props}>
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
    AutoComplete: ({ id, placeholder, allowClear, disabled }: any) => (
      <input
        data-testid="autocomplete"
        data-allow-clear={String(Boolean(allowClear))}
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
      showSearch,
    }: any) => (
      <select
        data-testid="select"
        data-allow-clear={String(Boolean(allowClear))}
        data-mode={String(mode || '')}
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

  it('renders date picker for date type', () => {
    const props = {
      ...defaultProps,
      field: { ...defaultProps.field, type: 'date' },
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('date-picker')).toBeTruthy()
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

  it('renders with disabled state', () => {
    const props = {
      ...defaultProps,
      disabled: true,
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('input')).toBeTruthy()
  })
})
