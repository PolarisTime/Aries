import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrintTemplateSelector } from './PrintTemplateSelector'

vi.mock('antd', () => {
  const Radio = ({ children, value }: any) => (
    <label>
      <input type="radio" value={value} />
      {children}
    </label>
  )
  Radio.Group = ({ children, defaultValue, onChange }: any) => (
    <div data-default-value={defaultValue} role="radiogroup">
      <button
        type="button"
        onClick={() => onChange({ target: { value: '2' } })}
      >
        select-template
      </button>
      {children}
    </div>
  )

  const Space = ({ children, className, orientation }: any) => (
    <div className={className} data-orientation={orientation}>
      {children}
    </div>
  )
  return { Radio, Space }
})

describe('PrintTemplateSelector', () => {
  const mockTemplates = [
    { id: '1', templateName: '模板A' },
    { id: '2', templateName: '模板B' },
    { id: '3', templateName: '模板C' },
  ]

  const defaultProps = {
    templates: mockTemplates,
    defaultId: '1',
    onSelect: vi.fn(),
  }

  it('renders all template options', () => {
    render(<PrintTemplateSelector {...defaultProps} />)
    expect(screen.getByText('模板A')).toBeTruthy()
    expect(screen.getByText('模板B')).toBeTruthy()
    expect(screen.getByText('模板C')).toBeTruthy()
  })

  it('renders with default selected value', () => {
    render(<PrintTemplateSelector {...defaultProps} />)
    const radioGroup = screen.getByRole('radiogroup')
    expect(radioGroup).toBeTruthy()
  })

  it('calls onSelect when template is selected', () => {
    const onSelect = vi.fn()
    render(<PrintTemplateSelector {...defaultProps} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('select-template'))

    expect(onSelect).toHaveBeenCalledWith('2')
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveAttribute('value', '1')
    expect(radios[1]).toHaveAttribute('value', '2')
    expect(radios[2]).toHaveAttribute('value', '3')
  })

  it('renders empty list when no templates provided', () => {
    render(<PrintTemplateSelector {...defaultProps} templates={[]} />)
    expect(screen.queryByText('模板A')).toBeNull()
    expect(screen.queryByText('模板B')).toBeNull()
    expect(screen.queryByText('模板C')).toBeNull()
  })

  it('renders single template', () => {
    const singleTemplate = [{ id: '1', templateName: '唯一模板' }]
    render(
      <PrintTemplateSelector {...defaultProps} templates={singleTemplate} />,
    )
    expect(screen.getByText('唯一模板')).toBeTruthy()
  })

  it('handles template with special characters in name', () => {
    const specialTemplates = [
      { id: '1', templateName: '模板 (带括号)' },
      { id: '2', templateName: '模板 [带方括号]' },
    ]
    render(
      <PrintTemplateSelector {...defaultProps} templates={specialTemplates} />,
    )
    expect(screen.getByText('模板 (带括号)')).toBeTruthy()
    expect(screen.getByText('模板 [带方括号]')).toBeTruthy()
  })

  it('renders with different defaultId', () => {
    render(<PrintTemplateSelector {...defaultProps} defaultId="2" />)
    const radioGroup = screen.getByRole('radiogroup')
    expect(radioGroup).toBeTruthy()
  })

  it('calls onSelect with correct id for each template', () => {
    const onSelect = vi.fn()
    render(<PrintTemplateSelector {...defaultProps} onSelect={onSelect} />)

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveAttribute('value', '1')
    expect(radios[1]).toHaveAttribute('value', '2')
    expect(radios[2]).toHaveAttribute('value', '3')
  })
})
