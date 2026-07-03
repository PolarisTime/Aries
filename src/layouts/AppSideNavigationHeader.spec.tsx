import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSideNavigationHeader } from '@/layouts/AppSideNavigationHeader'

vi.mock('antd', () => ({
  Button: ({ children, className, icon, onClick }: any) => (
    <button type="button" className={className} onClick={onClick}>
      {icon}
      {children}
    </button>
  ),
  Dropdown: ({ children, menu }: any) => (
    <div>
      {children}
      <div data-testid="dropdown-menu">
        {menu.items?.map((item: any) => (
          <button
            type="button"
            key={item.key}
            onClick={() => menu.onClick?.({ key: item.key })}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  ),
  Tag: ({ children, color }: any) => <span data-color={color}>{children}</span>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'layouts.sideNav.breadcrumbPrefix': '首页 / ',
        'layouts.sideNav.apiOnline': '在线',
        'layouts.sideNav.apiOffline': '离线',
        'common.refresh': '刷新',
        'layouts.headerSearch.placeholder': '搜索单号/关键字',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/layouts/LazyAppHeaderSearch', () => ({
  LazyAppHeaderSearch: (props: any) => (
    <div data-testid="mock-search" className={props.className} />
  ),
}))

const defaultProps = {
  backendOnline: true,
  clockDisplay: {
    dateText: '2026年07月01日',
    timeText: '14时30分00秒',
  },
  collapsed: false,
  currentUserName: '张三',
  onToggleCollapsed: vi.fn(),
  search: {
    keyword: '',
    options: [],
    open: false,
    loading: false,
    onBlur: vi.fn(),
    onKeywordChange: vi.fn(),
    onOpen: vi.fn(),
    onOpenChange: vi.fn(),
    onSearch: vi.fn(),
    onSelect: vi.fn(),
    onSubmit: vi.fn(),
  },
  shellFontStyle: {},
  title: '工作台',
  userMenu: {
    items: [
      { key: 'settings', label: '个人设置' },
      { key: 'logout', label: '退出登录' },
    ],
    onClick: vi.fn(),
  },
}

describe('AppSideNavigationHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete (window as Window & { caches?: CacheStorage }).caches
    vi.unstubAllEnvs()
  })

  it('renders page title', () => {
    render(<AppSideNavigationHeader {...defaultProps} />)
    expect(screen.getByText('工作台')).toBeDefined()
  })

  it('renders user name', () => {
    render(<AppSideNavigationHeader {...defaultProps} />)
    expect(screen.getByText('张三')).toBeDefined()
  })

  it('shows online tag when backend is online', () => {
    render(<AppSideNavigationHeader {...defaultProps} backendOnline={true} />)
    expect(screen.getByText('在线')).toBeDefined()
  })

  it('shows offline tag when backend is offline', () => {
    render(<AppSideNavigationHeader {...defaultProps} backendOnline={false} />)
    expect(screen.getByText('离线')).toBeDefined()
  })

  it('displays clock text', () => {
    render(
      <AppSideNavigationHeader
        {...defaultProps}
        clockDisplay={{
          dateText: '2026年07月02日',
          timeText: '15时00分00秒',
        }}
      />,
    )
    expect(screen.getByText('15时00分00秒')).toBeDefined()
  })

  it('calls onToggleCollapsed when trigger button is clicked', () => {
    const onToggle = vi.fn()
    render(
      <AppSideNavigationHeader
        {...defaultProps}
        onToggleCollapsed={onToggle}
      />,
    )
    fireEvent.click(document.querySelector('.app-trigger')!)
    expect(onToggle).toHaveBeenCalled()
  })

  it('shows unfold icon when collapsed', () => {
    render(<AppSideNavigationHeader {...defaultProps} collapsed={true} />)
    expect(document.querySelector('.anticon-menu-unfold')).toBeDefined()
  })

  it('shows fold icon when not collapsed', () => {
    render(<AppSideNavigationHeader {...defaultProps} collapsed={false} />)
    expect(document.querySelector('.anticon-menu-fold')).toBeDefined()
  })

  it('renders breadcrumb prefix with title', () => {
    render(<AppSideNavigationHeader {...defaultProps} title="商品资料" />)
    expect(screen.getByText('首页 / 商品资料')).toBeDefined()
  })

  it('renders search component', () => {
    render(<AppSideNavigationHeader {...defaultProps} />)
    expect(screen.getByTestId('mock-search')).toBeDefined()
  })

  it('passes user menu items to the settings dropdown', () => {
    const onClick = vi.fn()
    render(
      <AppSideNavigationHeader
        {...defaultProps}
        userMenu={{
          items: [
            { key: 'settings', label: '个人设置' },
            { key: 'logout', label: '退出登录' },
          ],
          onClick,
        }}
      />,
    )

    fireEvent.click(screen.getByText('个人设置'))
    fireEvent.click(screen.getByText('退出登录'))

    expect(onClick).toHaveBeenNthCalledWith(1, { key: 'settings' })
    expect(onClick).toHaveBeenNthCalledWith(2, { key: 'logout' })
  })

  it('clears browser caches before dev refresh reloads the page', async () => {
    const keys = vi.fn().mockResolvedValue(['layout', 'assets'])
    const deleteCache = vi.fn().mockResolvedValue(true)
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys,
        delete: deleteCache,
      },
    })
    render(<AppSideNavigationHeader {...defaultProps} />)

    fireEvent.click(document.querySelector('.app-dev-refresh-btn')!)

    await waitFor(() => expect(keys).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(deleteCache).toHaveBeenCalledWith('layout')
      expect(deleteCache).toHaveBeenCalledWith('assets')
    })
  })

  it('still refreshes in dev mode when browser caches are unavailable', () => {
    render(<AppSideNavigationHeader {...defaultProps} />)

    fireEvent.click(document.querySelector('.app-dev-refresh-btn')!)

    expect(screen.getByText('刷新')).toBeDefined()
  })

  it('omits dev refresh action outside dev mode', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const { AppSideNavigationHeader: ProductionSideNavigationHeader } =
      await import('@/layouts/AppSideNavigationHeader')

    const { container } = render(
      <ProductionSideNavigationHeader {...defaultProps} />,
    )

    expect(container.querySelector('.app-dev-refresh-btn')).toBeNull()
  })
})
