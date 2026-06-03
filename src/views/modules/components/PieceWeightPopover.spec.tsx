import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: [],
    isError: false,
    isFetching: false,
  }),
}))

vi.mock('antd/es/popover', () => ({
  default: ({ children, content, ...props }: any) => (
    <div data-testid="popover" {...props}>
      {children}
      {content}
    </div>
  ),
}))

vi.mock('antd/es/table', () => ({
  default: ({ ...props }: any) => <table data-testid="table" {...props} />,
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: vi.fn(),
  http: {
    get: vi.fn(),
  },
}))

import { PieceWeightPopover } from '@/views/modules/components/PieceWeightPopover'

describe('PieceWeightPopover', () => {
  it('renders weight value for non-weigh category', () => {
    render(<PieceWeightPopover itemId="1" weightTon={1.234} category="钢材" />)
    expect(screen.getByText('1.234')).toBeTruthy()
  })

  it('renders clickable weight for weigh category', () => {
    render(<PieceWeightPopover itemId="1" weightTon={2.5} category="盘螺" />)
    expect(screen.getByText('2.500')).toBeTruthy()
  })

  it('renders popover for line material category', () => {
    render(<PieceWeightPopover itemId="1" weightTon={3.0} category="线材" />)
    expect(screen.getByTestId('popover')).toBeTruthy()
  })
})
