import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Title: ({ children, ...props }: any) => <h5 {...props}>{children}</h5>,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

const mocks = vi.hoisted(() => ({
  EditorItemsSummary: vi.fn(() => <div data-testid="summary" />),
}))

vi.mock('./EditorItemsSummary', () => ({
  EditorItemsSummary: mocks.EditorItemsSummary,
}))

import { ModuleItemsPanel } from '@/views/modules/components/ModuleItemsPanel'

describe('ModuleItemsPanel', () => {
  const defaultProps = {
    children: <div>Table Content</div>,
  }

  it('renders children', () => {
    render(<ModuleItemsPanel {...defaultProps} />)
    expect(screen.getByText('Table Content')).toBeTruthy()
  })

  it('renders default title', () => {
    render(<ModuleItemsPanel {...defaultProps} />)
    expect(screen.getByText('modules.itemsPanel.defaultTitle')).toBeTruthy()
  })

  it('renders custom title', () => {
    render(<ModuleItemsPanel {...defaultProps} title="Custom Title" />)
    expect(screen.getByText('Custom Title')).toBeTruthy()
  })

  it('renders actions', () => {
    render(
      <ModuleItemsPanel {...defaultProps} actions={<button>Action</button>} />,
    )
    expect(screen.getByText('Action')).toBeTruthy()
  })

  it('renders summary when items provided', () => {
    render(<ModuleItemsPanel {...defaultProps} items={[{ id: '1' }]} />)
    expect(screen.getAllByTestId('summary').length).toBeGreaterThanOrEqual(1)
  })

  it('hides amount summary when amount item column is not visible', () => {
    render(
      <ModuleItemsPanel
        {...defaultProps}
        items={[{ id: '1', amount: 100 }]}
        itemColumns={[{ title: 'Weight', dataIndex: 'weightTon' }]}
      />,
    )

    expect(mocks.EditorItemsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ showAmount: false }),
      undefined,
    )
  })

  it('keeps amount summary when amount item column is visible', () => {
    render(
      <ModuleItemsPanel
        {...defaultProps}
        items={[{ id: '1', amount: 100 }]}
        itemColumns={[{ title: 'Amount', dataIndex: 'amount' }]}
      />,
    )

    expect(mocks.EditorItemsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ showAmount: true }),
      undefined,
    )
  })
})
