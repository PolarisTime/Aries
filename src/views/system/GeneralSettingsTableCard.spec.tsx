import { render, screen } from '@testing-library/react'
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

  it('renders statistics', () => {
    render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(
      screen.getByText('system.generalSettingsTable.basicParams'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsTable.systemSwitches'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsTable.currentEnabled'),
    ).toBeInTheDocument()
  })

  it('displays counts from props', () => {
    render(
      <GeneralSettingsTableCard
        {...defaultProps}
        basicSettingRows={[{ id: '1' } as never, { id: '2' } as never]}
        switchRows={[{ id: '3' } as never]}
      />,
    )
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
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

  it('renders empty state when there are no switches', () => {
    render(<GeneralSettingsTableCard {...defaultProps} switchRows={[]} />)
    expect(screen.getAllByText('common.noData').length).toBeGreaterThanOrEqual(
      1,
    )
  })
})
