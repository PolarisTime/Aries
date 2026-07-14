import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AppPageDefinition } from '@/config/page-registry'

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

vi.mock('antd', () => ({
  Empty: ({
    className,
    description,
  }: {
    className?: string
    description?: string
  }) => (
    <div className={className} data-testid="empty-state">
      {description}
    </div>
  ),
  Tabs: ({
    activeKey,
    items,
    onChange,
    size,
    tabBarStyle,
  }: {
    activeKey: string
    items: Array<{ key: string; label: string }>
    onChange: (key: string) => void
    size?: string
    tabBarStyle?: Record<string, unknown>
  }) => (
    <div
      data-active-key={activeKey}
      data-size={size}
      data-tab-bar-margin-bottom={String(tabBarStyle?.marginBottom)}
      data-testid="access-tabs"
    >
      {items.map((item) => (
        <button
          aria-selected={activeKey === item.key}
          key={item.key}
          onClick={() => onChange(item.key)}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  Typography: {
    Title: ({ children }: { children?: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    Paragraph: ({ children }: { children?: React.ReactNode }) => (
      <p>{children}</p>
    ),
  },
}))

vi.mock('@/views/modules/components/BusinessGridPageSkeleton', () => ({
  BusinessGridPageSkeleton: () => <div data-testid="skeleton">Skeleton</div>,
}))

vi.mock('@/views/modules/BusinessGridPage', () => ({
  BusinessGridPage: ({ pageDef }: { pageDef: AppPageDefinition }) => (
    <div
      data-module-key={pageDef.moduleKey}
      data-resource-key={pageDef.resourceKey}
      data-testid="permission-grid-page"
      data-title={pageDef.title}
    />
  ),
}))

vi.mock('@/views/system/RoleActionEditor', () => ({
  RoleActionEditor: ({ active }: { active?: boolean }) => (
    <div data-active={String(active)} data-testid="role-action-editor" />
  ),
}))

vi.mock('@/views/system/UserAccountManagementView', () => ({
  UserAccountManagementView: ({ active }: { active?: boolean }) => (
    <div data-active={String(active)} data-testid="user-account-view" />
  ),
}))

import { AccessControlView } from '@/views/system/AccessControlView'

function grantOnly(resources: string[]) {
  mockCan.mockImplementation((resource: string, action: string) => {
    return action === 'read' && resources.includes(resource)
  })
}

describe('AccessControlView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    grantOnly(['user-account', 'role', 'permission'])
    mockLocation.searchStr = ''
  })

  it('renders the standard access control heading', () => {
    render(<AccessControlView />)
    expect(
      screen.getByRole('heading', { name: 'system.accessControl.title' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.accessControl.description'),
    ).toBeInTheDocument()
  })

  it('renders all permitted tabs and defaults to users when query is absent', async () => {
    render(<AccessControlView />)

    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'users',
    )
    expect(
      screen.getByRole('tab', { name: 'system.accessControl.tabUsers' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'system.accessControl.tabRoles' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'system.accessControl.tabPermissions',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByTestId('user-account-view')).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('activates roles from the tab query', async () => {
    mockLocation.searchStr = '?tab=roles'

    render(<AccessControlView />)

    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'roles',
    )
    expect(await screen.findByTestId('role-action-editor')).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('activates permissions from the tab query and passes the page definition', async () => {
    mockLocation.searchStr = '?tab=permissions'

    render(<AccessControlView />)

    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'permissions',
    )
    expect(await screen.findByTestId('permission-grid-page')).toHaveAttribute(
      'data-module-key',
      'permission',
    )
    expect(screen.getByTestId('permission-grid-page')).toHaveAttribute(
      'data-resource-key',
      'permission',
    )
    expect(screen.getByTestId('permission-grid-page')).toHaveAttribute(
      'data-title',
      'system.accessControl.title',
    )
  })

  it('falls back to the first permitted tab when the requested tab is unavailable', async () => {
    grantOnly(['role', 'permission'])
    mockLocation.searchStr = '?tab=users'

    render(<AccessControlView />)

    expect(
      screen.queryByRole('tab', { name: 'system.accessControl.tabUsers' }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'roles',
    )
    expect(await screen.findByTestId('role-action-editor')).toBeInTheDocument()
  })

  it('normalizes unknown tab values to users before selecting content', async () => {
    mockLocation.searchStr = '?tab=unknown'

    render(<AccessControlView />)

    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'users',
    )
    expect(await screen.findByTestId('user-account-view')).toBeInTheDocument()
  })

  it('uses roles as the first tab when user management is not permitted', async () => {
    grantOnly(['role'])
    mockLocation.searchStr = '?tab=permissions'

    render(<AccessControlView />)

    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'roles',
    )
    expect(
      screen.queryByRole('tab', { name: 'system.accessControl.tabUsers' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('tab', {
        name: 'system.accessControl.tabPermissions',
      }),
    ).not.toBeInTheDocument()
    expect(await screen.findByTestId('role-action-editor')).toBeInTheDocument()
  })

  it('uses permissions as the first tab when it is the only permitted module', async () => {
    grantOnly(['permission'])
    mockLocation.searchStr = '?tab=roles'

    render(<AccessControlView />)

    expect(screen.getByTestId('access-tabs')).toHaveAttribute(
      'data-active-key',
      'permissions',
    )
    expect(
      await screen.findByTestId('permission-grid-page'),
    ).toBeInTheDocument()
  })

  it('renders an empty workspace when the resolved active key is unsupported', () => {
    grantOnly(['user-account'])
    const originalMap = Array.prototype.map
    const mapSpy = vi
      .spyOn(Array.prototype, 'map')
      .mockImplementation(function mapWithUnsupportedAccessKey(
        this: unknown[],
        callback,
        thisArg,
      ) {
        if (this.length === 1 && this[0]?.key === 'users') {
          return ['unsupported']
        }
        return originalMap.call(this, callback, thisArg)
      })

    try {
      render(<AccessControlView />)

      expect(screen.getByTestId('access-tabs')).toHaveAttribute(
        'data-active-key',
        'unsupported',
      )
      expect(screen.queryByTestId('user-account-view')).not.toBeInTheDocument()
    } finally {
      mapSpy.mockRestore()
    }
  })

  it('navigates when a tab is selected', () => {
    render(<AccessControlView />)

    fireEvent.click(
      screen.getByRole('tab', { name: 'system.accessControl.tabRoles' }),
    )

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/access-control?tab=roles',
    })
  })

  it('renders an empty state when no access control modules are permitted', () => {
    grantOnly([])

    render(<AccessControlView />)

    expect(screen.queryByTestId('access-tabs')).not.toBeInTheDocument()
    expect(screen.getByTestId('empty-state')).toHaveClass('mt-120')
    expect(
      screen.getByText('system.accessControl.noModules'),
    ).toBeInTheDocument()
  })
})
