import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppTopNavigationHeader } from '@/layouts/AppTopNavigationHeader'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'layouts.topNav.serverTime': '服务器时间',
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
  clockText: '14:30:00',
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
  userMenuItems: [
    { key: 'settings', label: '个人设置' },
    { key: 'logout', label: '退出登录' },
  ],
}

describe('AppTopNavigationHeader', () => {
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

  it('renders clock text', () => {
    render(<AppTopNavigationHeader {...defaultProps} clockText="15:00:00" />)
    expect(screen.getByText('15:00:00')).toBeDefined()
  })

  it('renders server time label', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('服务器时间')).toBeDefined()
  })

  it('calls onDashboardClick when brand button is clicked', () => {
    const onClick = vi.fn()
    render(<AppTopNavigationHeader {...defaultProps} onDashboardClick={onClick} />)
    fireEvent.click(document.querySelector('.app-top-brand')!)
    expect(onClick).toHaveBeenCalled()
  })

  it('renders top menu items', () => {
    render(<AppTopNavigationHeader {...defaultProps} />)
    expect(screen.getByText('工作台')).toBeDefined()
    expect(screen.getByText('商品管理')).toBeDefined()
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
    render(
      <AppTopNavigationHeader
        {...defaultProps}
        currentUserName="李四"
      />,
    )
    expect(screen.getByText('李')).toBeDefined()
  })

  it('handles user name with leading spaces', () => {
    render(
      <AppTopNavigationHeader
        {...defaultProps}
        currentUserName="  王五"
      />,
    )
    expect(screen.getByText('王')).toBeDefined()
  })
})
