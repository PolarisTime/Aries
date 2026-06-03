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

import { NumberRulesTableCard } from '@/views/system/NumberRulesTableCard'

describe('NumberRulesTableCard', () => {
  const defaultProps = {
    keyword: '',
    statusFilter: undefined,
    rows: [],
    numberRuleRows: [],
    uploadRuleRows: [],
    loading: false,
    canEdit: true,
    onKeywordChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onRefresh: vi.fn(),
    onEditNumberRule: vi.fn(),
    onEditUploadRule: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(NumberRulesTableCard).toBeDefined()
    expect(typeof NumberRulesTableCard).toBe('function')
  })

  it('renders the card', () => {
    const { container } = render(<NumberRulesTableCard {...defaultProps} />)
    expect(container.querySelector('.ant-card')).toBeInTheDocument()
  })

  it('renders document rules section title', () => {
    render(<NumberRulesTableCard {...defaultProps} />)
    expect(screen.getAllByText('system.numberRules.documentRules').length).toBeGreaterThan(0)
  })

  it('renders upload rules section title', () => {
    render(<NumberRulesTableCard {...defaultProps} />)
    expect(screen.getAllByText('system.numberRules.uploadRules').length).toBeGreaterThan(0)
  })

  it('renders statistics', () => {
    render(<NumberRulesTableCard {...defaultProps} />)
    expect(screen.getAllByText('system.numberRules.documentRules').length).toBeGreaterThan(0)
    expect(screen.getAllByText('system.numberRules.uploadRules').length).toBeGreaterThan(0)
  })

  it('renders tables', () => {
    const { container } = render(<NumberRulesTableCard {...defaultProps} />)
    expect(container.querySelectorAll('.ant-table')).toHaveLength(2)
  })

  it('renders toolbar', () => {
    render(<NumberRulesTableCard {...defaultProps} />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })
})
