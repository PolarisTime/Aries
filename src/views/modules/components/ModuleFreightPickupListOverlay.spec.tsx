import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
  }),
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/table', () => ({
  default: ({ ...props }: any) => <table {...props} />,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: vi.fn(),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    freightPickup: vi.fn().mockReturnValue(['freight-pickup']),
  },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asId: (v: any) => String(v),
}))

vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({ children, title, open, ...props }: any) =>
    open ? (
      <div data-testid="overlay">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

import { ModuleFreightPickupListOverlay } from '@/views/modules/components/ModuleFreightPickupListOverlay'

describe('ModuleFreightPickupListOverlay', () => {
  const defaultProps = {
    open: true,
    moduleKey: 'freight-bill',
    records: [
      {
        id: '1',
        billNo: 'FB-001',
        customerName: 'Customer A',
        projectName: 'Project X',
        carrierName: 'Carrier A',
        vehiclePlate: 'ABC123',
        totalWeight: 1000,
        totalFreight: 5000,
        items: [],
      },
    ],
    onClose: vi.fn(),
  }

  it('renders overlay when open', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} />)
    expect(screen.getByTestId('overlay')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} open={false} />)
    expect(screen.queryByTestId('overlay')).toBeNull()
  })

  it('renders record details', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} />)
    expect(screen.getByText(/FB-001/)).toBeTruthy()
    expect(screen.getByText(/Customer A/)).toBeTruthy()
  })
})
