import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppSideNavigationHeader } from '@/layouts/AppSideNavigationHeader'

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
  clockText: '14:30:00',
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
  userMenuItems: [],
}

describe('AppSideNavigationHeader', () => {
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
    render(<AppSideNavigationHeader {...defaultProps} clockText="15:00:00" />)
    expect(screen.getByText('15:00:00')).toBeDefined()
  })

  it('calls onToggleCollapsed when trigger button is clicked', () => {
    const onToggle = vi.fn()
    render(<AppSideNavigationHeader {...defaultProps} onToggleCollapsed={onToggle} />)
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
})
