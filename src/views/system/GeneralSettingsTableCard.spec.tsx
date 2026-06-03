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
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders toolbar', () => {
    render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('renders tables', () => {
    const { container } = render(<GeneralSettingsTableCard {...defaultProps} />)
    expect(container.querySelectorAll('.ant-table')).toHaveLength(2)
  })
})
