import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockCan = vi.fn()
const mockNavigate = vi.fn()
const mockLocation = { searchStr: '' }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/views/modules/components/BusinessGridPageSkeleton', () => ({
  BusinessGridPageSkeleton: () => <div data-testid="skeleton">Skeleton</div>,
}))

import { AccessControlView } from '@/views/system/AccessControlView'

describe('AccessControlView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockLocation.searchStr = ''
  })

  it('renders without crashing', () => {
    expect(AccessControlView).toBeDefined()
    expect(typeof AccessControlView).toBe('function')
  })

  it('renders tabs when user has permissions', () => {
    render(<AccessControlView />)
    expect(
      screen.getByText('system.accessControl.tabUsers'),
    ).toBeInTheDocument()
  })

  it('renders roles tab when user has role permission', () => {
    render(<AccessControlView />)
    expect(
      screen.getByText('system.accessControl.tabRoles'),
    ).toBeInTheDocument()
  })

  it('renders permissions tab when user has permission', () => {
    render(<AccessControlView />)
    expect(
      screen.getByText('system.accessControl.tabPermissions'),
    ).toBeInTheDocument()
  })

  it('renders empty when user has no permissions', () => {
    mockCan.mockReturnValue(false)
    render(<AccessControlView />)
    expect(
      screen.getByText('system.accessControl.noModules'),
    ).toBeInTheDocument()
  })

  it('hides tabs user lacks permission for', () => {
    mockCan.mockImplementation((resource: string, action: string) => {
      return resource === 'user-account' && action === 'read'
    })
    render(<AccessControlView />)
    expect(
      screen.getByText('system.accessControl.tabUsers'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('system.accessControl.tabRoles'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.accessControl.tabPermissions'),
    ).not.toBeInTheDocument()
  })
})
