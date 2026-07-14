import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { EditorItemsSummary } from '@/views/modules/components/EditorItemsSummary'

describe('EditorItemsSummary', () => {
  it('renders row count', () => {
    render(<EditorItemsSummary items={[{ id: '1' }, { id: '2' }]} />)
    expect(screen.getByText(/modules.itemsSummary.rowCount/)).toBeTruthy()
    expect(screen.getByText(/2/)).toBeTruthy()
  })

  it('renders total weight when positive', () => {
    render(
      <EditorItemsSummary
        items={[
          { id: '1', weightTon: 10.5 },
          { id: '2', weightTon: 5.3 },
        ]}
      />,
    )
    expect(screen.getByText(/15.800/)).toBeTruthy()
  })

  it('renders total amount when positive', () => {
    render(
      <EditorItemsSummary
        items={[
          { id: '1', amount: 100 },
          { id: '2', amount: 200 },
        ]}
      />,
    )
    expect(screen.getByText(/300.00/)).toBeTruthy()
  })

  it('hides total amount when showAmount is false', () => {
    render(
      <EditorItemsSummary
        showAmount={false}
        items={[
          { id: '1', amount: 100 },
          { id: '2', amount: 200 },
        ]}
      />,
    )
    expect(screen.queryByText(/300.00/)).toBeNull()
  })

  it('renders total quantity when positive', () => {
    render(
      <EditorItemsSummary
        items={[
          { id: '1', quantity: 5 },
          { id: '2', quantity: 3 },
        ]}
      />,
    )
    expect(screen.getByText(/8/)).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(
      <EditorItemsSummary items={[{ id: '1' }]} className="custom-class" />,
    )
    expect(container.querySelector('.custom-class')).toBeTruthy()
  })
})
