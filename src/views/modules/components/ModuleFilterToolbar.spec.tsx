import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('antd', () => {
  const Button = ({
    children,
    icon,
    iconPlacement: _iconPlacement,
    type: _type,
    ...props
  }: any) => (
    <button type="button" {...props}>
      {icon}
      {children}
    </button>
  )
  const Col = ({ children }: any) => <div>{children}</div>
  const Row = ({ children }: any) => <div>{children}</div>
  const Form = ({ children, colon: _colon, onFinish, ...props }: any) => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onFinish?.()
      }}
      {...props}
    >
      {children}
    </form>
  )
  Form.Item = ({ children, className, htmlFor, label }: any) => (
    <div className={className}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
    </div>
  )
  const Input = ({
    allowClear: _allowClear,
    onBlur,
    onChange,
    onPressEnter,
    suffix,
    value,
    ...props
  }: any) => (
    <span>
      <input
        data-testid="input"
        value={value ?? ''}
        onBlur={(event) => onBlur?.(event)}
        onChange={(event) => onChange?.(event)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onPressEnter?.(event)
        }}
        {...props}
      />
      {suffix}
    </span>
  )
  const Select = ({
    allowClear: _allowClear,
    onChange,
    options = [],
    value,
    ...props
  }: any) => {
    const renderOptions = (items: any[]): ReactNode[] =>
      items.flatMap((option) =>
        Array.isArray(option.options)
          ? renderOptions(option.options)
          : [
              <option key={String(option.value)} value={option.value}>
                {option.label}
              </option>,
            ],
      )

    return (
      <select
        data-testid="select"
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value || undefined)}
        {...props}
      >
        <option value="" />
        {renderOptions(options)}
      </select>
    )
  }
  const RangePicker = ({ id: _id, onChange, value, ...props }: any) => (
    <input
      data-testid="range-picker"
      data-has-value={Array.isArray(value) ? 'true' : 'false'}
      onChange={(event) => {
        const value = event.target.value
        onChange?.(null, value ? [value, value] : ['', ''])
      }}
      {...props}
    />
  )
  const DatePicker = Object.assign(
    ({ value: _value, ...props }: any) => (
      <input data-testid="date-picker" {...props} />
    ),
    { RangePicker },
  )
  const Segmented = ({ onChange, options, value, ...props }: any) => (
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
      <button type="button" onClick={() => onChange?.('__missing__')}>
        Missing
      </button>
    </div>
  )

  return {
    Button,
    Col,
    DatePicker,
    Form,
    Input,
    Row,
    Segmented,
    Select,
  }
})

vi.mock('dayjs', () => {
  const dayjs = (_value?: unknown) => ({
    isValid: () => true,
    format: () => '',
    valueOf: () => 0,
  })
  dayjs.isDayjs = () => false
  return { default: dayjs }
})

vi.mock('@/utils/form-control-a11y', () => ({
  buildLabeledFormItemProps: ({ htmlFor, label }: any) => ({ htmlFor, label }),
}))

vi.mock('@/utils/form-control-id', () => ({
  buildFormControlId: (prefix: string, key: string) => `${prefix}-${key}`,
}))

vi.mock('@/utils/label-utils', () => ({
  padLabel: (label: string) => label,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (value: unknown) => String(value ?? ''),
}))

vi.mock('@/module-system/module-action-icons', () => ({
  resolveModuleActionIcon: () => null,
}))

import type { ModulePageConfig } from '@/types/module-page'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'

function config(overrides: Partial<ModulePageConfig> = {}): ModulePageConfig {
  return {
    key: 'test',
    title: 'Test',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    ...overrides,
  }
}

function renderToolbar(
  props: Partial<ComponentProps<typeof ModuleFilterToolbar>> = {},
) {
  const defaultProps: ComponentProps<typeof ModuleFilterToolbar> = {
    config: config(),
    filters: {},
    defaultFilters: {},
    submittedFilters: {},
    onUpdateFilter: vi.fn(),
    onApplyFilters: vi.fn(),
    onReset: vi.fn(),
  }

  return render(<ModuleFilterToolbar {...defaultProps} {...props} />)
}

describe('ModuleFilterToolbar', () => {
  it('renders default keyword input and reset without query button', () => {
    renderToolbar()

    expect(screen.getByLabelText('common.keyword')).toBeTruthy()
    expect(screen.getByText('common.reset')).toBeTruthy()
    expect(screen.queryByText('common.query')).toBeNull()
  })

  it('marks text filters with the Enter shortcut', () => {
    renderToolbar()

    expect(screen.getByLabelText('common.keyword')).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter',
    )
    expect(screen.getByText('Enter', { selector: 'kbd' })).toBeTruthy()
  })

  it('does not render fallback keyword when config provides keyword filter', () => {
    renderToolbar({
      config: config({
        filters: [{ key: 'keyword', label: 'Keyword', type: 'input' }],
      }),
    })

    expect(screen.getByLabelText('Keyword')).toBeTruthy()
    expect(screen.queryByLabelText('common.keyword')).toBeNull()
  })

  it('applies select filter immediately on change', () => {
    const onApplyFilters = vi.fn()
    const onUpdateFilter = vi.fn()
    renderToolbar({
      config: config({
        filters: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [{ label: 'Active', value: 'active' }],
          },
        ],
      }),
      onApplyFilters,
      onUpdateFilter,
    })

    fireEvent.change(screen.getByTestId('select'), {
      target: { value: 'active' },
    })

    expect(onUpdateFilter).toHaveBeenCalledWith('status', 'active')
    expect(onApplyFilters).toHaveBeenCalledWith({ status: 'active' })
  })

  it('removes select filter immediately when cleared', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        filters: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [{ label: 'Active', value: 'active' }],
          },
        ],
      }),
      filters: { status: 'active' },
      submittedFilters: { status: 'active' },
      onApplyFilters,
    })

    fireEvent.change(screen.getByTestId('select'), { target: { value: '' } })

    expect(onApplyFilters).toHaveBeenCalledWith({})
  })

  it('applies date range immediately on change', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        filters: [{ key: 'orderDate', label: 'Order Date', type: 'dateRange' }],
      }),
      onApplyFilters,
    })

    fireEvent.change(screen.getByTestId('range-picker'), {
      target: { value: '2026-06-28' },
    })

    expect(onApplyFilters).toHaveBeenCalledWith({
      orderDate: ['2026-06-28', '2026-06-28'],
    })
  })

  it('renders submitted date range values and removes the filter when cleared', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        filters: [{ key: 'orderDate', label: 'Order Date', type: 'dateRange' }],
      }),
      filters: { orderDate: ['2026-06-01', '2026-06-28'] },
      submittedFilters: { orderDate: ['2026-06-01', '2026-06-28'] },
      onApplyFilters,
    })

    const rangePicker = screen.getByTestId('range-picker')
    expect(rangePicker).toHaveAttribute('data-has-value', 'true')

    fireEvent.change(rangePicker, { target: { value: '2026-07-01' } })
    fireEvent.change(rangePicker, { target: { value: '' } })

    expect(onApplyFilters).toHaveBeenCalledWith({})
  })

  it('does not apply input filter while typing', () => {
    const onApplyFilters = vi.fn()
    const onUpdateFilter = vi.fn()
    renderToolbar({
      onApplyFilters,
      onUpdateFilter,
    })

    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'PO-001' },
    })

    expect(onUpdateFilter).toHaveBeenCalledWith('keyword', 'PO-001')
    expect(onApplyFilters).not.toHaveBeenCalled()
  })

  it('applies input filter on enter', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      filters: { keyword: 'PO-001' },
      onApplyFilters,
    })

    fireEvent.keyDown(screen.getByTestId('input'), {
      key: 'Enter',
      target: { value: 'PO-001' },
    })

    expect(onApplyFilters).toHaveBeenCalledWith({ keyword: 'PO-001' })
  })

  it('applies input filter on blur when value changed', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      filters: { keyword: 'PO-001' },
      submittedFilters: {},
      onApplyFilters,
    })

    fireEvent.blur(screen.getByTestId('input'), {
      target: { value: 'PO-001' },
    })

    expect(onApplyFilters).toHaveBeenCalledWith({ keyword: 'PO-001' })
  })

  it('does not apply input filter on blur when committed value is unchanged', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      filters: { keyword: 'PO-001' },
      submittedFilters: { keyword: 'PO-001' },
      onApplyFilters,
    })

    fireEvent.blur(screen.getByTestId('input'), {
      target: { value: 'PO-001' },
    })

    expect(onApplyFilters).not.toHaveBeenCalled()
  })

  it('deduplicates enter followed by blur within 100ms', () => {
    let now = 1000
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const onApplyFilters = vi.fn()
    renderToolbar({
      filters: { keyword: 'PO-001' },
      submittedFilters: {},
      onApplyFilters,
    })
    const input = screen.getByTestId('input')

    fireEvent.keyDown(input, {
      key: 'Enter',
      target: { value: 'PO-001' },
    })
    now = 1050
    fireEvent.blur(input, {
      target: { value: 'PO-001' },
    })

    expect(onApplyFilters).toHaveBeenCalledTimes(1)
    dateNowSpy.mockRestore()
  })

  it('applies empty input on blur to reset submitted keyword', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      filters: { keyword: '' },
      submittedFilters: { keyword: 'PO-001' },
      onApplyFilters,
    })

    fireEvent.blur(screen.getByTestId('input'), { target: { value: '' } })

    expect(onApplyFilters).toHaveBeenCalledWith({})
  })

  it('keeps non-input draft filters when committing a text filter', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        filters: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [{ label: 'Active', value: 'active' }],
          },
          { key: 'batchNo', label: 'Batch No', type: 'input' },
        ],
      }),
      filters: { status: 'active', batchNo: 'B-001' },
      submittedFilters: {},
      onApplyFilters,
    })

    fireEvent.keyDown(screen.getByLabelText('Batch No'), {
      key: 'Enter',
      target: { value: 'B-001' },
    })

    expect(onApplyFilters).toHaveBeenCalledWith({
      status: 'active',
      batchNo: 'B-001',
    })
  })

  it('updates configured input filters while typing and commits changed values on blur', () => {
    const onApplyFilters = vi.fn()
    const onUpdateFilter = vi.fn()
    renderToolbar({
      config: config({
        filters: [{ key: 'batchNo', label: 'Batch No', type: 'input' }],
      }),
      filters: { batchNo: '' },
      submittedFilters: { batchNo: 'B-001' },
      onApplyFilters,
      onUpdateFilter,
    })

    const batchNoInput = screen.getByLabelText('Batch No')
    fireEvent.change(batchNoInput, { target: { value: ' B-002 ' } })
    fireEvent.blur(batchNoInput, { target: { value: ' B-002 ' } })

    expect(onUpdateFilter).toHaveBeenCalledWith('batchNo', ' B-002 ')
    expect(onUpdateFilter).toHaveBeenCalledWith('batchNo', 'B-002')
    expect(onApplyFilters).toHaveBeenCalledWith({ batchNo: 'B-002' })
  })

  it('skips configured input blur commits when trimmed values match', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        filters: [{ key: 'batchNo', label: 'Batch No', type: 'input' }],
      }),
      filters: { batchNo: ' B-001 ' },
      submittedFilters: { batchNo: 'B-001' },
      onApplyFilters,
    })

    fireEvent.blur(screen.getByLabelText('Batch No'), {
      target: { value: ' B-001 ' },
    })

    expect(onApplyFilters).not.toHaveBeenCalled()
  })

  it('keeps secondary filters collapsed by default and expands them on demand', () => {
    renderToolbar({
      config: config({
        filters: [
          { key: 'primary', label: 'Primary', type: 'input', row: 1 },
          { key: 'secondary', label: 'Secondary', type: 'input', row: 2 },
        ],
      }),
    })

    expect(screen.getByLabelText('Primary')).toBeTruthy()
    expect(screen.queryByLabelText('Secondary')).toBeNull()

    fireEvent.click(screen.getByText('common.expand'))

    expect(screen.getByLabelText('Secondary')).toBeTruthy()
  })

  it('moves filters after the fourth primary field into the second row', () => {
    renderToolbar({
      config: config({
        filters: [
          { key: 'keyword', label: 'Keyword', type: 'input' },
          { key: 'two', label: 'Two', type: 'input' },
          { key: 'three', label: 'Three', type: 'input' },
          { key: 'four', label: 'Four', type: 'input' },
          { key: 'five', label: 'Five', type: 'input' },
        ],
      }),
    })

    expect(screen.queryByLabelText('Five')).toBeNull()

    fireEvent.click(screen.getByText('common.expand'))

    expect(screen.getByLabelText('Four')).toBeTruthy()
    expect(screen.getByLabelText('Five')).toBeTruthy()
  })

  it('does not render the filter heading or active filter count', () => {
    renderToolbar({
      config: config({
        filters: [
          { key: 'primary', label: 'Primary', type: 'input', row: 1 },
          { key: 'secondary', label: 'Secondary', type: 'input', row: 2 },
        ],
      }),
      filters: { secondary: 'S-001' },
      submittedFilters: { secondary: 'S-001' },
    })

    expect(screen.queryByLabelText('Secondary')).toBeNull()
    expect(
      screen.queryByText('modules.filter.conditions'),
    ).toBeNull()
    expect(
      screen.queryByText('modules.filter.activeCount:{"count":1}'),
    ).toBeNull()
  })

  it('applies quick filters with default filters preserved', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        quickFilters: [
          { key: 'all', label: 'All', values: {} },
          { key: 'open', label: 'Open', values: { status: 'open' } },
        ],
      }),
      defaultFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
      submittedFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
      onApplyFilters,
    })

    expect(screen.getByTestId('segmented')).toHaveAttribute('data-value', 'all')
    fireEvent.click(screen.getByText('Open'))

    expect(onApplyFilters).toHaveBeenCalledWith({
      orderDate: ['2026-05-29', '2026-06-28'],
      status: 'open',
    })
  })

  it('ignores unknown quick filter selections', () => {
    const onApplyFilters = vi.fn()
    renderToolbar({
      config: config({
        quickFilters: [
          { key: 'open', label: 'Open', values: { status: 'open' } },
        ],
      }),
      onApplyFilters,
    })

    fireEvent.click(screen.getByText('Missing'))

    expect(onApplyFilters).not.toHaveBeenCalled()
  })

  it('resolves function select options and grouped select options', () => {
    const resolveOptions = vi.fn(() => [
      {
        label: 'Status Group',
        options: [{ label: 'Active', value: 'active' }],
      },
    ])
    renderToolbar({
      config: config({
        filters: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: resolveOptions,
          },
        ],
      }),
      filters: { ownerId: 'owner-1' },
    })

    expect(resolveOptions).toHaveBeenCalledWith({ ownerId: 'owner-1' })
    expect(screen.getByRole('option', { name: 'Active' })).toBeTruthy()
  })

  it('renders select filters without configured options', () => {
    renderToolbar({
      config: config({
        filters: [{ key: 'status', label: 'Status', type: 'select' }],
      }),
    })

    expect(screen.getByLabelText('Status')).toBeTruthy()
  })
})
