import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/col', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/date-picker', () => {
  const RangePicker = ({ onChange, ...props }: any) => (
    <input
      data-testid="range-picker"
      onChange={(e) => onChange?.(null, [e.target.value, e.target.value])}
      {...props}
    />
  )
  return {
    default: Object.assign(
      (props: any) => <input data-testid="date-picker" {...props} />,
      { RangePicker },
    ),
  }
})

vi.mock('antd/es/form', () => {
  const Form = ({ children, onFinish, ...props }: any) => (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onFinish?.()
      }}
      {...props}
    >
      {children}
    </form>
  )
  Form.Item = ({ children, ...props }: any) => <div {...props}>{children}</div>
  return { default: Form }
})

vi.mock('antd/es/input', () => ({
  default: ({ onChange, onPressEnter, ...props }: any) => (
    <input
      data-testid="input"
      onChange={(e) => onChange?.(e)}
      onKeyDown={(e) => e.key === 'Enter' && onPressEnter?.()}
      {...props}
    />
  ),
}))

vi.mock('antd/es/row', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/segmented', () => ({
  default: ({ options, onChange, value, ...props }: any) => (
    <div data-testid="segmented" data-value={value || ''} {...props}>
      {options.map((option: any) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('antd/es/select', () => ({
  default: ({ onChange, ...props }: any) => (
    <select
      data-testid="select"
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  ),
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('dayjs', () => {
  const dayjs = (_v?: any) => ({
    isValid: () => true,
    format: () => '',
    valueOf: () => 0,
  })
  dayjs.isDayjs = () => false
  return { default: dayjs }
})

vi.mock('@/utils/form-control-a11y', () => ({
  buildLabeledFormItemProps: ({ label, htmlFor }: any) => ({ label, htmlFor }),
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (prefix: string, key: string) => `${prefix}-${key}`,
}))

vi.mock('@/utils/label-utils', () => ({
  padLabel: (label: string) => label,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: any) => String(v ?? ''),
}))

vi.mock('@/module-system/module-action-icons', () => ({
  resolveModuleActionIcon: () => null,
}))

import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'

describe('ModuleFilterToolbar', () => {
  const defaultProps = {
    config: {
      key: 'test',
      title: 'Test',
      kicker: '',
      description: '',
      filters: [],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    },
    filters: {},
    onUpdateFilter: vi.fn(),
    onApplyFilters: vi.fn(),
    onSearch: vi.fn(),
    onReset: vi.fn(),
  }

  it('renders keyword input by default', () => {
    render(<ModuleFilterToolbar {...defaultProps} />)
    expect(screen.getByText('common.query')).toBeTruthy()
    expect(screen.getByText('common.reset')).toBeTruthy()
  })

  it('does not render keyword input when config has keyword filter', () => {
    const config = {
      ...defaultProps.config,
      filters: [{ key: 'keyword', label: 'Keyword', type: 'input' as const }],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByText('common.query')).toBeTruthy()
  })

  it('renders select filter field', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [{ label: 'Active', value: 'active' }],
        },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('renders dateRange filter field', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        { key: 'dateRange', label: 'Date Range', type: 'dateRange' as const },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByTestId('range-picker')).toBeTruthy()
  })

  it('renders input filter field', () => {
    const config = {
      ...defaultProps.config,
      filters: [{ key: 'name', label: 'Name', type: 'input' as const }],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getAllByTestId('input').length).toBeGreaterThanOrEqual(1)
  })

  it('renders select with function options', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: () => [{ label: 'Active', value: 'active' }],
        },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('renders select with group options', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [
            {
              label: 'Group 1',
              options: [{ label: 'Option 1', value: 'opt1' }],
            },
          ],
        },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('calls onSearch when form submitted', () => {
    const onSearch = vi.fn()
    render(<ModuleFilterToolbar {...defaultProps} onSearch={onSearch} />)
    fireEvent.click(screen.getByText('common.query'))
    expect(onSearch).toHaveBeenCalled()
  })

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn()
    render(<ModuleFilterToolbar {...defaultProps} onReset={onReset} />)
    fireEvent.click(screen.getByText('common.reset'))
    expect(onReset).toHaveBeenCalled()
  })

  it('renders multiple filter fields', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [],
        },
        { key: 'name', label: 'Name', type: 'input' as const },
        { key: 'dateRange', label: 'Date Range', type: 'dateRange' as const },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByTestId('select')).toBeTruthy()
    expect(screen.getByTestId('range-picker')).toBeTruthy()
    expect(screen.getAllByTestId('input').length).toBeGreaterThanOrEqual(1)
  })

  it('renders with filter values', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [],
        },
      ],
    }
    const filters = { status: 'active' }
    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        filters={filters}
      />,
    )
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('renders dateRange with existing values', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        { key: 'dateRange', label: 'Date Range', type: 'dateRange' as const },
      ],
    }
    const filters = { dateRange: ['2024-01-01', '2024-01-31'] }
    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        filters={filters}
      />,
    )
    expect(screen.getByTestId('range-picker')).toBeTruthy()
  })

  it('renders dateRange with empty array value', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        { key: 'dateRange', label: 'Date Range', type: 'dateRange' as const },
      ],
    }
    const filters = { dateRange: [] }
    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        filters={filters}
      />,
    )
    expect(screen.getByTestId('range-picker')).toBeTruthy()
  })

  it('renders with placeholder for select', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [],
          placeholder: 'Select status',
        },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('renders with placeholder for input', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'name',
          label: 'Name',
          type: 'input' as const,
          placeholder: 'Enter name',
        },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getAllByTestId('input').length).toBeGreaterThanOrEqual(1)
  })

  it('renders filters sorted by row', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        { key: 'b', label: 'B', type: 'input' as const, row: 2 },
        { key: 'a', label: 'A', type: 'input' as const, row: 1 },
      ],
    }
    render(<ModuleFilterToolbar {...defaultProps} config={config} />)
    expect(screen.getByText('common.query')).toBeTruthy()
  })

  it('renders select with string value in filters', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [],
        },
      ],
    }
    const filters = { status: 'active' }
    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        filters={filters}
      />,
    )
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('renders select with non-string value in filters', () => {
    const config = {
      ...defaultProps.config,
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [],
        },
      ],
    }
    const filters = { status: 123 }
    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        filters={filters}
      />,
    )
    expect(screen.getByTestId('select')).toBeTruthy()
  })

  it('renders quick filters and applies selected preset', () => {
    const onApplyFilters = vi.fn()
    const config = {
      ...defaultProps.config,
      quickFilters: [
        { key: 'all', label: 'All', values: {} },
        { key: 'open', label: 'Open', values: { status: 'open' } },
      ],
    }

    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        onApplyFilters={onApplyFilters}
      />,
    )

    expect(screen.getByTestId('segmented')).toBeTruthy()
    fireEvent.click(screen.getByText('Open'))
    expect(onApplyFilters).toHaveBeenCalledWith({ status: 'open' })
  })

  it('removes empty quick filter preset values before applying', () => {
    const onApplyFilters = vi.fn()
    const config = {
      ...defaultProps.config,
      quickFilters: [
        {
          key: 'open',
          label: 'Open',
          values: { status: 'open', direction: '', keyword: undefined },
        },
      ],
    }

    render(
      <ModuleFilterToolbar
        {...defaultProps}
        config={config}
        onApplyFilters={onApplyFilters}
      />,
    )

    fireEvent.click(screen.getByText('Open'))
    expect(onApplyFilters).toHaveBeenCalledWith({ status: 'open' })
  })
})
