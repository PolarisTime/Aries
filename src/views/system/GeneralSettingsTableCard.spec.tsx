import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/SystemTableToolbar', () => ({
  SystemTableToolbar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toolbar">{children}</div>
  ),
}))

vi.mock('antd', () => ({
  Button: ({
    'aria-label': ariaLabel,
    children,
    disabled,
    onClick,
  }: {
    'aria-label'?: string
    children?: React.ReactNode
    disabled?: boolean
    onClick?: () => void
  }) => (
    <button aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({
    children,
    className,
    extra,
    title,
  }: {
    children?: React.ReactNode
    className?: string
    extra?: React.ReactNode
    title?: React.ReactNode
  }) => (
    <section className={`ant-card ${className ?? ''}`}>
      <h2>{title}</h2>
      {extra}
      {children}
    </section>
  ),
  Col: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Empty: ({ description }: { description?: React.ReactNode }) => (
    <div>{description}</div>
  ),
  Row: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Select: ({
    options = [],
    placeholder,
    value,
    onChange,
  }: {
    options?: Array<{ label: string; value: string }>
    placeholder?: string
    value?: string
    onChange?: (value?: string) => void
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value || undefined)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Statistic: ({
    title,
    value,
  }: {
    title?: React.ReactNode
    value?: number
  }) => (
    <div>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  ),
  Switch: ({
    'aria-label': ariaLabel,
    checked,
    disabled,
    loading,
    onChange,
  }: {
    'aria-label'?: string
    checked?: boolean
    disabled?: boolean
    loading?: boolean
    onChange?: () => void
  }) => (
    <button
      aria-label={ariaLabel}
      aria-pressed={checked}
      data-loading={loading ? 'true' : 'false'}
      disabled={disabled}
      onClick={onChange}
    />
  ),
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Typography: {
    Paragraph: ({ children }: { children?: React.ReactNode }) => (
      <p>{children}</p>
    ),
    Text: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

import { GeneralSettingsTableCard } from '@/views/system/GeneralSettingsTableCard'

describe('GeneralSettingsTableCard', () => {
  const defaultProps = {
    keyword: '',
    statusFilter: undefined,
    filteredRows: [],
    basicSettingRows: [],
    switchRows: [],
    loading: false,
    toggling: false,
    canEdit: true,
    onKeywordChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onRefresh: vi.fn(),
    onEdit: vi.fn(),
    onToggle: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(GeneralSettingsTableCard).toBeDefined()
    expect(typeof GeneralSettingsTableCard).toBe('function')
  })

  it('renders the card', () => {
    const { container } = render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(container.querySelector('.ant-card')).toBeInTheDocument()
  })

  it('renders basic params section title', () => {
    render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(
      screen.getByText('system.generalSettingsTable.basicParamsTitle'),
    ).toBeInTheDocument()
  })

  it('renders system switches section title', () => {
    render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(
      screen.getByText('system.generalSettingsTable.systemSwitchesTitle'),
    ).toBeInTheDocument()
  })

  it('uses a compact toolbar without duplicate statistics', () => {
    const { container } = render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(container.querySelector('.general-settings-summary-card')).toBeNull()
    expect(
      container.querySelector('.general-settings-page-toolbar'),
    ).toBeInTheDocument()
  })

  it('renders toolbar', () => {
    render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('does not render parameter table chrome', () => {
    const { container } = render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(container.querySelectorAll('.ant-table')).toHaveLength(0)
  })

  it('groups basic parameters by configuration domain', () => {
    render(
      <GeneralSettingsTableCard
        {...defaultProps}
        basicSettingRows={[
          {
            id: '1',
            settingCode: 'SYS_DEFAULT_TAX_RATE',
            settingName: '默认税率',
            sampleNo: '0.13',
          } as never,
          {
            id: '2',
            settingCode: 'SYS_WATERMARK_FONT_SIZE',
            settingName: '水印字体大小',
            sampleNo: '20',
          } as never,
        ]}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsTable.groupTax'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsTable.groupWatermark'),
    ).toBeInTheDocument()
    expect(screen.getByText('默认税率')).toBeInTheDocument()
    expect(screen.getByText('水印字体大小')).toBeInTheDocument()
  })

  it('groups pagination, session, and other basic parameters', () => {
    render(
      <GeneralSettingsTableCard
        {...defaultProps}
        basicSettingRows={[
          {
            id: 'pagination',
            settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE',
            settingName: '默认分页大小',
            remark: '分页备注',
            sampleNo: '20',
          } as never,
          {
            id: 'session',
            settingCode: 'SYS_MAX_CONCURRENT_SESSIONS',
            settingName: '最大会话数',
            sampleNo: '3',
          } as never,
          {
            id: 'other',
            settingCode: 'SYS_OTHER_NUMERIC',
            settingName: '其它参数',
            sampleNo: '1',
          } as never,
        ]}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsTable.groupPagination'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsTable.groupSession'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsTable.groupOther'),
    ).toBeInTheDocument()
    expect(screen.getByText('分页备注')).toBeInTheDocument()
  })

  it('groups pagination parameters by setting name', () => {
    render(
      <GeneralSettingsTableCard
        {...defaultProps}
        basicSettingRows={[
          {
            id: 'pagination-name',
            settingCode: 'SYS_UNCLASSIFIED',
            settingName: '每页分页数量',
            sampleNo: '30',
          } as never,
        ]}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsTable.groupPagination'),
    ).toBeInTheDocument()
  })

  it('renders loading text for both configuration sections', () => {
    render(<GeneralSettingsTableCard {...defaultProps} loading />)

    expect(screen.getAllByText('common.loading')).toHaveLength(2)
  })

  it('calls edit handler from basic parameter row', () => {
    const onEdit = vi.fn()
    const record = {
      id: '1',
      settingCode: 'SYS_DEFAULT_TAX_RATE',
      settingName: '默认税率',
      sampleNo: '0.13',
    } as never

    render(
      <GeneralSettingsTableCard
        {...defaultProps}
        basicSettingRows={[record]}
        onEdit={onEdit}
      />,
    )
    expect(
      screen.getByLabelText('system.generalSettingsTable.edit 默认税率'),
    ).toHaveTextContent('13%')
    fireEvent.click(
      screen.getByLabelText('system.generalSettingsTable.edit 默认税率'),
    )

    expect(onEdit).toHaveBeenCalledWith(record)
  })

  it('renders switch settings as action list items', () => {
    const { container } = render(
      <GeneralSettingsTableCard
        {...defaultProps}
        filteredRows={[
          { id: '1', status: '正常' } as never,
          { id: '2', status: '禁用' } as never,
        ]}
        switchRows={[
          {
            id: '1',
            settingName: '登录验证码',
            status: '正常',
            remark: '登录安全',
          } as never,
          {
            id: '2',
            settingName: '显示雪花 ID',
            status: '禁用',
            remark: '排查数据',
          } as never,
        ]}
      />,
    )

    expect(
      container.querySelectorAll('.general-settings-switch-item'),
    ).toHaveLength(2)
    expect(screen.getByText('登录验证码')).toBeInTheDocument()
    expect(screen.queryByText('system.generalSettingsTable.enabled')).toBeNull()
    expect(
      screen.getByLabelText('登录验证码 system.generalSettingsTable.enabled'),
    ).toBeInTheDocument()
  })

  it('calls toggle and edit handlers from switch rows', () => {
    const onToggle = vi.fn()
    const onEdit = vi.fn()
    const record = {
      id: '1',
      settingName: '登录验证码',
      status: '禁用',
      remark: '',
    } as never

    render(
      <GeneralSettingsTableCard
        {...defaultProps}
        switchRows={[record]}
        onEdit={onEdit}
        onToggle={onToggle}
        toggling
      />,
    )

    fireEvent.click(
      screen.getByLabelText('登录验证码 system.generalSettingsTable.disabled'),
    )
    fireEvent.click(
      screen.getByLabelText('system.generalSettingsTable.edit 登录验证码'),
    )

    expect(onToggle).toHaveBeenCalledWith(record)
    expect(onEdit).toHaveBeenCalledWith(record)
  })

  it('renders empty state when there are no switches', () => {
    render(<GeneralSettingsTableCard {...defaultProps} switchRows={[]} />)
    expect(screen.getAllByText('common.noData').length).toBeGreaterThanOrEqual(
      1,
    )
  })
})
