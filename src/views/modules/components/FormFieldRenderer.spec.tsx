import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd/es/date-picker', () => ({
  default: ({ id, placeholder, ...props }: any) => (
    <input
      data-testid="date-picker"
      id={id}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

vi.mock('antd/es/form', () => {
  const formInstance = {
    getFieldValue: vi.fn(),
    getFieldsValue: vi.fn(),
  }
  return {
    default: {
      useFormInstance: () => formInstance,
      useWatch: () => ({}),
      Item: ({ children, name, ...props }: any) => (
        <div data-testid={`form-item-${name}`} {...props}>
          {children}
        </div>
      ),
    },
  }
})

vi.mock('antd/es/input', () => {
  const Input = ({ id, placeholder, ...props }: any) => (
    <input data-testid="input" id={id} placeholder={placeholder} {...props} />
  )
  Input.TextArea = ({ id, placeholder, ...props }: any) => (
    <textarea
      data-testid="textarea"
      id={id}
      placeholder={placeholder}
      {...props}
    />
  )
  return {
    default: Input,
    TextArea: Input.TextArea,
  }
})

vi.mock('antd/es/input-number', () => ({
  default: ({ id, placeholder, ...props }: any) => (
    <input
      data-testid="input-number"
      id={id}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

vi.mock('antd/es/select', () => ({
  default: ({ id, placeholder, ...props }: any) => (
    <select data-testid="select" id={id} placeholder={placeholder} {...props} />
  ),
}))

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

  it('renders textarea for textarea type', () => {
    const props = {
      ...defaultProps,
      field: { ...defaultProps.field, type: 'textarea' },
    }
    render(<FormFieldRenderer {...props} />)
    expect(screen.getByTestId('textarea')).toBeTruthy()
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
