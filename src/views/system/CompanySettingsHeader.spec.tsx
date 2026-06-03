import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { CompanySettingsHeader } from '@/views/system/CompanySettingsHeader'

describe('CompanySettingsHeader', () => {
  const defaultProps = {
    loading: false,
    canSave: true,
    saving: false,
    overviewItems: [
      { label: 'Status', value: '正常' },
      { label: 'Banks', value: '2 家' },
    ],
    onRefresh: vi.fn(),
    onSave: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(CompanySettingsHeader).toBeDefined()
    expect(typeof CompanySettingsHeader).toBe('function')
  })

  it('renders the title', () => {
    render(<CompanySettingsHeader {...defaultProps} />)
    expect(screen.getByText('system.companyHeader.title')).toBeInTheDocument()
  })

  it('renders overview items', () => {
    render(<CompanySettingsHeader {...defaultProps} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('正常')).toBeInTheDocument()
    expect(screen.getByText('Banks')).toBeInTheDocument()
    expect(screen.getByText('2 家')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<CompanySettingsHeader {...defaultProps} />)
    expect(screen.getByText('system.companyHeader.refresh')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn()
    render(<CompanySettingsHeader {...defaultProps} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByText('system.companyHeader.refresh'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('renders save button when canSave is true', () => {
    render(<CompanySettingsHeader {...defaultProps} canSave={true} />)
    expect(screen.getByText('system.companyHeader.save')).toBeInTheDocument()
  })

  it('does not render save button when canSave is false', () => {
    render(<CompanySettingsHeader {...defaultProps} canSave={false} />)
    expect(screen.queryByText('system.companyHeader.save')).not.toBeInTheDocument()
  })

  it('calls onSave when save button clicked', () => {
    const onSave = vi.fn()
    render(<CompanySettingsHeader {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('system.companyHeader.save'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
