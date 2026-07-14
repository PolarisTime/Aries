import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppTopNavigationHeader } from '@/layouts/AppTopNavigationHeader'

vi.mock('antd', () => ({
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
  Menu: ({ className, items, onClick, selectedKeys }: any) => (
    <nav className={className} data-selected-keys={selectedKeys.join(',')}>
      {items.map((item: any) => (
        <button
          type="button"
          key={item.key}
          onClick={() => onClick?.({ key: item.key })}
        >
          {item.label}
        </button>
      ))}
    </nav>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
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
  clockDisplay: {
    dateText: '2026年07月01日',
    timeText: '14时30分00秒',
  },
  currentUserLoginName: 'zhangsan',
  currentUserName: '张三',
  onDashboardClick: vi.fn(),
  onMenuClick: vi.fn(),
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
  selectedKeys: ['dashboard'],
  shellFontStyle: {},
  topBrandMark: 'L',
  topMenuItems: [
    { key: 'dashboard', label: '工作台' },
    { key: 'material', label: '商品管理' },
  ],
  userMenu: {
    items: [
      { key: 'settings', label: '个人设置' },
      { key: 'logout', label: '退出登录' },
    ],
    onClick: vi.fn(),
  },
}

describe('AppTopNavigationHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete (window as Window & { caches?: CacheStorage }).caches
    vi.unstubAllEnvs()
  })

  it('renders brand mark', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('L')).toBeDefined()
  })

  it('renders user name', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('张三')).toBeDefined()
  })

  it('renders login name', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('zhangsan')).toBeDefined()
  })

  it('renders date on the first clock line', () => {
    render(
      <AppTopNavigationHeader
        {...defaultProps}
        clockDisplay={{
          dateText: '2026年07月02日',
          timeText: '15时00分00秒',
        }}
      />,
    )
    expect(screen.getByText('2026年07月02日')).toBeDefined()
  })

  it('renders time on the second clock line', () => {
    render(
      <AppTopNavigationHeader
        {...defaultProps}
        clockDisplay={{
          dateText: '2026年07月02日',
          timeText: '15时00分00秒',
        }}
      />,
    )
    expect(screen.getByText('15时00分00秒')).toBeDefined()
  })

  it('calls onDashboardClick when brand button is clicked', () => {
    const onClick = vi.fn()
    render(
      <AppTopNavigationHeader {...defaultProps} onDashboardClick={onClick} />,
    )
    fireEvent.click(document.querySelector('.app-top-brand')!)
    expect(onClick).toHaveBeenCalled()
  })

  it('renders top menu items', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('工作台')).toBeDefined()
    expect(screen.getByText('商品管理')).toBeDefined()
  })

  it('forwards top menu item clicks with selected key state', () => {
    const onMenuClick = vi.fn()
    const { container } = render(
      <AppTopNavigationHeader
        {...defaultProps}
        selectedKeys={['material']}
        onMenuClick={onMenuClick}
      />,
    )

    expect(container.querySelector('.leo-top-menu')).toHaveAttribute(
      'data-selected-keys',
      'material',
    )
    fireEvent.click(screen.getByText('商品管理'))

    expect(onMenuClick).toHaveBeenCalledWith({ key: 'material' })
  })

  it('renders user avatar with first character of name', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('张')).toBeDefined()
  })

  it('renders search component', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByTestId('mock-search')).toBeDefined()
  })

  it('renders search with top class name', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    const search = screen.getByTestId('mock-search')
    expect(search.className).toContain('header-global-search-top')
  })

  it('renders user wrapper with correct structure', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.user-wrapper-top')).toBeDefined()
  })

  it('renders app-top-header-meta section', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-top-header-meta')).toBeDefined()
  })

  it('renders dropdown trigger button', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-top-user-trigger')).toBeDefined()
  })

  it('renders DownOutlined caret icon', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-top-user-caret')).toBeDefined()
  })

  it('renders app-header-bar-top class', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-header-bar-top')).toBeDefined()
  })

  it('uses a semantic banner for the global top navigation', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)

    expect(container.querySelector('header.app-header-bar-top')).toBeTruthy()
    expect(container.querySelector('.app-top-brand')).toHaveAttribute(
      'aria-label',
      '工作台',
    )
  })

  it('renders app-top-nav-left section', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-top-nav-left')).toBeDefined()
  })

  it('renders app-top-nav-right section', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-top-nav-right')).toBeDefined()
  })

  it('renders app-top-menu-shell section', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.app-top-menu-shell')).toBeDefined()
  })

  it('renders leo-top-menu class', () => {
    const { container } = render(<AppTopNavigationHeader {...defaultProps} />)
    expect(container.querySelector('.leo-top-menu')).toBeDefined()
  })

  it('handles empty user name gracefully', () => {
    render(
      <AppTopNavigationHeader
        {...defaultProps}
        currentUserName=""
        currentUserLoginName=""
      />,
    )
    expect(screen.getByText('U')).toBeDefined()
  })

  it('uses first character of user name for avatar', () => {
    render(<AppTopNavigationHeader {...defaultProps} currentUserName="李四" />)
    expect(screen.getByText('李')).toBeDefined()
  })

  it('handles user name with leading spaces', () => {
    render(
      <AppTopNavigationHeader {...defaultProps} currentUserName="  王五" />,
    )
    expect(screen.getByText('王')).toBeDefined()
  })

  it('passes user menu actions through the account dropdown', () => {
    const onClick = vi.fn()
    render(
      <AppTopNavigationHeader
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
    const keys = vi.fn().mockResolvedValue(['top-layout', 'top-assets'])
    const deleteCache = vi.fn().mockResolvedValue(true)
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys,
        delete: deleteCache,
      },
    })
    render(<AppTopNavigationHeader {...defaultProps} />)

    fireEvent.click(document.querySelector('.app-dev-refresh-btn')!)

    await waitFor(() => expect(keys).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(deleteCache).toHaveBeenCalledWith('top-layout')
      expect(deleteCache).toHaveBeenCalledWith('top-assets')
    })
  })

  it('still refreshes in dev mode when browser caches are unavailable', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)

    fireEvent.click(document.querySelector('.app-dev-refresh-btn')!)

    expect(screen.getByText('刷新')).toBeDefined()
  })

  it('omits dev refresh action outside dev mode', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const { AppTopNavigationHeader: ProductionTopNavigationHeader } =
      await import('@/layouts/AppTopNavigationHeader')

    const { container } = render(
      <ProductionTopNavigationHeader {...defaultProps} />,
    )

    expect(container.querySelector('.app-dev-refresh-btn')).toBeNull()
  })
})
